
const db = require("../config/database");

// Validate positive integer IDs
function isValidId(id) {
    return /^\d+$/.test(String(id)) &&
        Number.isSafeInteger(Number(id)) &&
        Number(id) > 0;
}

// Validate optional HTTP/HTTPS URLs
function isValidOptionalUrl(value) {
    if (value === undefined || value === null || value === "") {
        return true;
    }

    if (typeof value !== "string" || value.length > 2048) {
        return false;
    }

    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
    } catch {
        return false;
    }
}

// Shared query for event details
const EVENT_SELECT = `
    SELECT
        events.id,
        events.title,
        events.description,
        events.event_date,
        events.event_time,
        events.location,
        events.image,
        events.created_at,
        users.name AS creator_name
    FROM events
    JOIN users ON events.created_by = users.id
`;

// =========================
// GET ALL EVENTS
// =========================
const getEvents = async (req, res) => {
    try {
        const [events] = await db.execute(`
            ${EVENT_SELECT}
            ORDER BY events.event_date ASC,
                     events.event_time ASC
        `);

        return res.status(200).json({
            message: "Events loaded successfully!",
            events
        });
    } catch (error) {
        console.error("Get events error:", error.message);

        return res.status(500).json({
            message: "Unable to load events."
        });
    }
};

const getMyEvents = async (req, res) => {
    try {
        const [events] = await db.execute(`
            ${EVENT_SELECT}
            WHERE events.created_by = ?
            ORDER BY events.event_date DESC,
                     events.event_time DESC
        `, [req.user.id]);

        return res.status(200).json({
            message: "Your hosted events loaded successfully.",
            events
        });
    } catch (error) {
        console.error("Get my events error:", error.message);
        return res.status(500).json({
            message: "Unable to load your hosted events."
        });
    }
};

// =========================
// GET ONE EVENT
// =========================
const getEventById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid event ID."
            });
        }

        const [events] = await db.execute(
            `${EVENT_SELECT} WHERE events.id = ? LIMIT 1`,
            [Number(id)]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        return res.status(200).json({
            message: "Event loaded successfully!",
            event: events[0]
        });
    } catch (error) {
        console.error("Get event error:", error.message);

        return res.status(500).json({
            message: "Unable to load this event."
        });
    }
};

// =========================
// CREATE EVENT
// =========================
const createEvent = async (req, res) => {
    try {
        const requestedId = req.body?.id;
        const {
            title,
            description,
            event_date,
            event_time,
            location,
            image
        } = req.body || {};

        const cleanId = requestedId === undefined || requestedId === ""
            ? null
            : Number(requestedId);
        if (
            cleanId !== null &&
            (!isValidId(requestedId) || !Number.isSafeInteger(cleanId))
        ) {
            return res.status(400).json({ message: "Event ID must be a positive whole number." });
        }

        if (
            typeof title !== "string" ||
            typeof description !== "string" ||
            typeof event_date !== "string" ||
            typeof event_time !== "string" ||
            typeof location !== "string" ||
            !title.trim() ||
            !description.trim() ||
            !event_date.trim() ||
            !event_time.trim() ||
            !location.trim()
        ) {
            return res.status(400).json({
                message:
                    "Title, description, date, time, and location are required."
            });
        }

        const cleanTitle = title.trim();
        const cleanDescription = description.trim();
        const cleanDate = event_date.trim();
        const cleanTime = event_time.trim();
        const cleanLocation = location.trim();

        if (cleanTitle.length > 200) {
            return res.status(400).json({
                message: "Event title must not exceed 200 characters."
            });
        }

        if (cleanDescription.length > 10000) {
            return res.status(400).json({
                message: "Event description must not exceed 10000 characters."
            });
        }

        if (cleanLocation.length > 255) {
            return res.status(400).json({
                message: "Location must not exceed 255 characters."
            });
        }

        // Validate YYYY-MM-DD and the actual calendar date
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
            return res.status(400).json({
                message: "Date must use YYYY-MM-DD format."
            });
        }

        const parsedDate = new Date(`${cleanDate}T00:00:00Z`);

        if (
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== cleanDate
        ) {
            return res.status(400).json({
                message: "Please enter a valid event date."
            });
        }

        // Validate 24-hour HH:MM or HH:MM:SS format
        if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(cleanTime)) {
            return res.status(400).json({
                message: "Time must use HH:MM or HH:MM:SS format."
            });
        }

        if (
            image !== undefined &&
            image !== null &&
            typeof image !== "string"
        ) {
            return res.status(400).json({
                message: "Image must be a string."
            });
        }

        const cleanImage =
            typeof image === "string" ? image.trim() : "";

        if (cleanImage.length > 2048) {
            return res.status(400).json({
                message: "Image path or URL is too long."
            });
        }

        const [result] = cleanId === null
            ? await db.execute(
                `INSERT INTO events
                    (title, description, event_date, event_time,
                     location, image, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    cleanTitle,
                    cleanDescription,
                    cleanDate,
                    cleanTime,
                    cleanLocation,
                    cleanImage || null,
                    req.user.id
                ]
            )
            : await db.execute(
                `INSERT INTO events
                    (id, title, description, event_date, event_time,
                     location, image, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    cleanId,
                    cleanTitle,
                    cleanDescription,
                    cleanDate,
                    cleanTime,
                    cleanLocation,
                    cleanImage || null,
                    req.user.id
                ]
            );

        return res.status(201).json({
            message: "Event created successfully!",
            event: {
                id: cleanId === null ? result.insertId : cleanId,
                title: cleanTitle,
                description: cleanDescription,
                event_date: cleanDate,
                event_time: cleanTime,
                location: cleanLocation,
                image: cleanImage || null,
                created_by: req.user.id
            }
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "That event ID is already in use." });
        }
        console.error("Create event error:", error.message);
        return res.status(500).json({ message: "Unable to create event." });
    }
};

// =========================
// UPDATE EVENT
// =========================
const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            id: requestedId,
            title,
            description,
            event_date,
            event_time,
            location,
            image
        } = req.body || {};

        if (!isValidId(id)) {
            return res.status(400).json({ message: "Invalid event ID." });
        }
        const cleanId = requestedId === undefined || requestedId === ""
            ? Number(id)
            : Number(requestedId);
        if (!isValidId(cleanId) || !Number.isSafeInteger(cleanId)) {
            return res.status(400).json({ message: "Event ID must be a positive whole number." });
        }

        if (
            typeof title !== "string" ||
            typeof description !== "string" ||
            typeof event_date !== "string" ||
            typeof event_time !== "string" ||
            typeof location !== "string" ||
            !title.trim() ||
            !description.trim() ||
            !event_date.trim() ||
            !event_time.trim() ||
            !location.trim()
        ) {
            return res.status(400).json({
                message: "Title, description, date, time, and location are required."
            });
        }

        const cleanTitle = title.trim();
        const cleanDescription = description.trim();
        const cleanDate = event_date.trim();
        const cleanTime = event_time.trim();
        const cleanLocation = location.trim();
        const cleanImage = typeof image === "string" ? image.trim() : "";

        if (cleanTitle.length > 200 || cleanDescription.length > 10000 ||
            cleanLocation.length > 255 || cleanImage.length > 2048) {
            return res.status(400).json({
                message: "One or more event fields exceed the allowed length."
            });
        }

        const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(cleanDate)
            ? new Date(`${cleanDate}T00:00:00Z`)
            : null;
        if (
            !parsedDate ||
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== cleanDate
        ) {
            return res.status(400).json({
                message: "Please enter a valid event date in YYYY-MM-DD format."
            });
        }

        if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(cleanTime)) {
            return res.status(400).json({
                message: "Time must use HH:MM or HH:MM:SS format."
            });
        }

        if (image !== undefined && image !== null && typeof image !== "string") {
            return res.status(400).json({ message: "Image must be a string." });
        }

        const [existing] = await db.execute(
            "SELECT id FROM events WHERE id = ? LIMIT 1",
            [Number(id)]
        );
        if (existing.length === 0) {
            return res.status(404).json({ message: "Event not found." });
        }

        if (cleanId !== Number(id)) {
            const [idConflict] = await db.execute(
                "SELECT id FROM events WHERE id = ? LIMIT 1",
                [cleanId]
            );
            if (idConflict.length > 0) {
                return res.status(409).json({ message: "That event ID is already in use." });
            }
        }

        await db.execute(
            `UPDATE events
             SET id = ?, title = ?, description = ?, event_date = ?, event_time = ?,
                 location = ?, image = ?
             WHERE id = ?`,
            [
                cleanId,
                cleanTitle,
                cleanDescription,
                cleanDate,
                cleanTime,
                cleanLocation,
                cleanImage || null,
                Number(id)
            ]
        );

        return res.status(200).json({
            message: "Event updated successfully!",
            id: cleanId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "That event ID is already in use." });
        }
        console.error("Update event error:", error.message);
        return res.status(500).json({ message: "Unable to update event." });
    }
};

// =========================
// DELETE EVENT
// =========================
const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid event ID."
            });
        }

        const [events] = await db.execute(
            "SELECT id, created_by FROM events WHERE id = ? LIMIT 1",
            [Number(id)]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        const event = events[0];

        // Only the event owner or an admin may delete it
        if (
            Number(event.created_by) !== Number(req.user.id) &&
            req.user.role !== "admin"
        ) {
            return res.status(403).json({
                message: "You do not have permission to delete this event."
            });
        }

        await db.execute(
            "DELETE FROM events WHERE id = ?",
            [Number(id)]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        return res.status(200).json({
            message: "Event deleted successfully!"
        });
    } catch (error) {
        console.error("Delete event error:", error.message);

        return res.status(500).json({
            message: "Unable to delete event."
        });
    }
};

module.exports = {
    getEvents,
    getMyEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent
};
