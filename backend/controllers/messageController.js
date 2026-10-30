
const db = require("../config/database");

// =========================
// CREATE CONTACT MESSAGE
// Public endpoint
// =========================
const createMessage = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body || {};

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof subject !== "string" ||
            typeof message !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !subject.trim() ||
            !message.trim()
        ) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanSubject = subject.trim();
        const cleanMessage = message.trim();

        if (
            cleanName.length > 100 ||
            cleanEmail.length > 254 ||
            cleanSubject.length > 200 ||
            cleanMessage.length > 5000
        ) {
            return res.status(400).json({
                message: "One or more fields exceed the allowed length."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO messages (name, email, subject, message)
             VALUES (?, ?, ?, ?)`,
            [cleanName, cleanEmail, cleanSubject, cleanMessage]
        );

        return res.status(201).json({
            message: "Your message was submitted successfully.",
            messageId: result.insertId
        });
    } catch (error) {
        console.error("Create message error:", error.message);

        return res.status(500).json({
            message: "Unable to submit your message right now."
        });
    }
};

// =========================
// GET ALL MESSAGES
// Admin access required in routes
// =========================
const getMessages = async (req, res) => {
    try {
        const [messages] = await db.execute(
            `SELECT id, name, email, subject, message, status, created_at
             FROM messages
             ORDER BY created_at DESC`
        );

        return res.status(200).json({
            message: "Messages retrieved successfully.",
            messages
        });
    } catch (error) {
        console.error("Get messages error:", error.message);

        return res.status(500).json({
            message: "Unable to retrieve messages."
        });
    }
};

// =========================
// UPDATE MESSAGE CONTENT
// Admin access required in routes
// =========================
const updateMessage = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, email, subject, message } = req.body || {};

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid message ID." });
        }

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof subject !== "string" ||
            typeof message !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !subject.trim() ||
            !message.trim()
        ) {
            return res.status(400).json({
                message: "Name, email, subject, and message are required."
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanSubject = subject.trim();
        const cleanMessage = message.trim();

        if (
            cleanName.length > 100 ||
            cleanEmail.length > 254 ||
            cleanSubject.length > 200 ||
            cleanMessage.length > 5000
        ) {
            return res.status(400).json({
                message: "One or more fields exceed the allowed length."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        const [existing] = await db.execute(
            "SELECT id FROM messages WHERE id = ? LIMIT 1",
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ message: "Message not found." });
        }

        const [result] = await db.execute(
            `UPDATE messages
             SET name = ?, email = ?, subject = ?, message = ?
             WHERE id = ?`,
            [cleanName, cleanEmail, cleanSubject, cleanMessage, id]
        );

        return res.status(200).json({
            message: "Message updated successfully."
        });
    } catch (error) {
        console.error("Update message error:", error.message);
        return res.status(500).json({
            message: "Unable to update message."
        });
    }
};

// =========================
// UPDATE MESSAGE STATUS
// Admin access required in routes
// =========================
const updateMessageStatus = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body || {};

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid message ID."
            });
        }

        if (!["read", "unread"].includes(status)) {
            return res.status(400).json({
                message: "Status must be 'read' or 'unread'."
            });
        }

        const [result] = await db.execute(
            "UPDATE messages SET status = ? WHERE id = ?",
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Message not found."
            });
        }

        return res.status(200).json({
            message: "Message status updated successfully."
        });
    } catch (error) {
        console.error("Update message status error:", error.message);

        return res.status(500).json({
            message: "Unable to update message status."
        });
    }
};

// =========================
// DELETE MESSAGE
// Admin access required in routes
// =========================
const deleteMessage = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid message ID."
            });
        }

        const [result] = await db.execute(
            "DELETE FROM messages WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Message not found."
            });
        }

        return res.status(200).json({
            message: "Message deleted successfully."
        });
    } catch (error) {
        console.error("Delete message error:", error.message);

        return res.status(500).json({
            message: "Unable to delete message."
        });
    }
};

module.exports = {
    createMessage,
    getMessages,
    updateMessage,
    updateMessageStatus,
    deleteMessage
};
