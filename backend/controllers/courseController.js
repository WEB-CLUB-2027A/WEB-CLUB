
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

// Shared query for course details
const COURSE_SELECT = `
    SELECT
        id,
        title,
        description,
        level,
        instructor,
        image,
        video_url,
        created_at
    FROM courses
`;

// =========================
// GET ALL COURSES
// =========================
const getCourses = async (req, res) => {
    try {
        const [courses] = await db.execute(`
            ${COURSE_SELECT}
            ORDER BY created_at DESC
        `);

        return res.status(200).json({
            message: "Courses loaded successfully!",
            courses
        });
    } catch (error) {
        console.error("Get courses error:", error.message);

        return res.status(500).json({
            message: "Unable to load courses."
        });
    }
};

// =========================
// GET ONE COURSE
// =========================
const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid course ID."
            });
        }

        const [courses] = await db.execute(
            `${COURSE_SELECT} WHERE id = ? LIMIT 1`,
            [Number(id)]
        );

        if (courses.length === 0) {
            return res.status(404).json({
                message: "Course not found."
            });
        }

        return res.status(200).json({
            message: "Course loaded successfully!",
            course: courses[0]
        });
    } catch (error) {
        console.error("Get course error:", error.message);

        return res.status(500).json({
            message: "Unable to load this course."
        });
    }
};

// =========================
// CREATE COURSE
// =========================
const createCourse = async (req, res) => {
    try {
        const {
            title,
            description,
            level,
            instructor,
            image,
            video_url
        } = req.body || {};

        if (
            typeof title !== "string" ||
            typeof description !== "string" ||
            !title.trim() ||
            !description.trim()
        ) {
            return res.status(400).json({
                message: "Title and description are required."
            });
        }

        const cleanTitle = title.trim();
        const cleanDescription = description.trim();

        if (cleanTitle.length > 200) {
            return res.status(400).json({
                message: "Course title must not exceed 200 characters."
            });
        }

        if (cleanDescription.length > 10000) {
            return res.status(400).json({
                message: "Course description must not exceed 10000 characters."
            });
        }

        const cleanLevel =
            typeof level === "string" && level.trim()
                ? level.trim()
                : "Beginner";

        const cleanInstructor =
            typeof instructor === "string" && instructor.trim()
                ? instructor.trim()
                : null;

        const cleanImage =
            typeof image === "string" && image.trim()
                ? image.trim()
                : null;

        if (
            level !== undefined &&
            level !== null &&
            typeof level !== "string"
        ) {
            return res.status(400).json({
                message: "Course level must be text."
            });
        }

        if (
            instructor !== undefined &&
            instructor !== null &&
            typeof instructor !== "string"
        ) {
            return res.status(400).json({
                message: "Instructor must be text."
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

        if (cleanLevel.length > 50) {
            return res.status(400).json({
                message: "Course level must not exceed 50 characters."
            });
        }

        if (cleanInstructor && cleanInstructor.length > 150) {
            return res.status(400).json({
                message: "Instructor name is too long."
            });
        }

        if (cleanImage && cleanImage.length > 2048) {
            return res.status(400).json({
                message: "Image path or URL is too long."
            });
        }

        if (!isValidOptionalUrl(video_url)) {
            return res.status(400).json({
                message: "Video URL must be a valid HTTP or HTTPS URL."
            });
        }

        const cleanVideoUrl =
            typeof video_url === "string" && video_url.trim()
                ? video_url.trim()
                : null;

        const [result] = await db.execute(
            `INSERT INTO courses
                (title, description, level, instructor, image, video_url)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                cleanTitle,
                cleanDescription,
                cleanLevel,
                cleanInstructor,
                cleanImage,
                cleanVideoUrl
            ]
        );

        return res.status(201).json({
            message: "Course created successfully!",
            course: {
                id: result.insertId,
                title: cleanTitle,
                description: cleanDescription,
                level: cleanLevel,
                instructor: cleanInstructor,
                image: cleanImage,
                video_url: cleanVideoUrl
            }
        });
    } catch (error) {
        console.error("Create course error:", error.message);

        return res.status(500).json({
            message: "Unable to create course."
        });
    }
};

// =========================
// DELETE COURSE
// =========================
const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid course ID."
            });
        }

        const [courses] = await db.execute(
            "SELECT id FROM courses WHERE id = ? LIMIT 1",
            [Number(id)]
        );

        if (courses.length === 0) {
            return res.status(404).json({
                message: "Course not found."
            });
        }

        const [result] = await db.execute(
            "DELETE FROM courses WHERE id = ?",
            [Number(id)]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Course not found."
            });
        }

        return res.status(200).json({
            message: "Course deleted successfully!"
        });
    } catch (error) {
        console.error("Delete course error:", error.message);

        return res.status(500).json({
            message: "Unable to delete course."
        });
    }
};

module.exports = {
    getCourses,
    getCourseById,
    createCourse,
    deleteCourse
};
