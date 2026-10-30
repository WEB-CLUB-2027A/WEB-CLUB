
const db = require("../config/database");

// Validate positive integer IDs
function isValidId(id) {
    return /^\d+$/.test(String(id)) &&
        Number.isSafeInteger(Number(id)) &&
        Number(id) > 0;
}

// Validate optional HTTP/HTTPS URLs
function isValidOptionalUrl(value) {
    if (value === null || value === "") return true;

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

// Shared query for project details
const PROJECT_SELECT = `
    SELECT
        projects.id,
        projects.title,
        projects.description,
        projects.image,
        projects.github_url,
        projects.demo_url,
        projects.created_at,
        users.name AS creator_name
    FROM projects
    JOIN users ON projects.created_by = users.id
`;

// =========================
// GET ALL PROJECTS
// =========================
const getProjects = async (req, res) => {
    try {
        const [projects] = await db.execute(`
            ${PROJECT_SELECT}
            ORDER BY projects.created_at DESC
        `);

        return res.status(200).json({
            message: "Projects loaded successfully!",
            projects
        });
    } catch (error) {
        console.error("Get projects error:", error.message);

        return res.status(500).json({
            message: "Unable to load projects."
        });
    }
};

const getMyProjects = async (req, res) => {
    try {
        const [projects] = await db.execute(`
            ${PROJECT_SELECT}
            WHERE projects.created_by = ?
            ORDER BY projects.created_at DESC
        `, [req.user.id]);

        return res.status(200).json({
            message: "Your projects loaded successfully.",
            projects
        });
    } catch (error) {
        console.error("Get my projects error:", error.message);
        return res.status(500).json({
            message: "Unable to load your projects."
        });
    }
};

// =========================
// GET ONE PROJECT
// =========================
const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid project ID."
            });
        }

        const [projects] = await db.execute(
            `${PROJECT_SELECT} WHERE projects.id = ? LIMIT 1`,
            [Number(id)]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                message: "Project not found."
            });
        }

        return res.status(200).json({
            message: "Project loaded successfully!",
            project: projects[0]
        });
    } catch (error) {
        console.error("Get project error:", error.message);

        return res.status(500).json({
            message: "Unable to load this project."
        });
    }
};

// =========================
// CREATE PROJECT
// =========================
const createProject = async (req, res) => {
    try {
        const requestedId = req.body?.id;
        const {
            title,
            description,
            image,
            github_url,
            demo_url
        } = req.body || {};

        const cleanId = requestedId === undefined || requestedId === ""
            ? null
            : Number(requestedId);
        if (
            cleanId !== null &&
            (!isValidId(requestedId) || !Number.isSafeInteger(cleanId))
        ) {
            return res.status(400).json({ message: "Project ID must be a positive whole number." });
        }

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
                message: "Project title must not exceed 200 characters."
            });
        }

        if (cleanDescription.length > 10000) {
            return res.status(400).json({
                message: "Project description must not exceed 10000 characters."
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

        if (
            !isValidOptionalUrl(github_url) ||
            !isValidOptionalUrl(demo_url)
        ) {
            return res.status(400).json({
                message: "GitHub and demo links must be valid HTTP or HTTPS URLs."
            });
        }

        const cleanGithubUrl =
            typeof github_url === "string" && github_url.trim()
                ? github_url.trim()
                : null;

        const cleanDemoUrl =
            typeof demo_url === "string" && demo_url.trim()
                ? demo_url.trim()
                : null;

        const [result] = cleanId === null
            ? await db.execute(
                `INSERT INTO projects
                    (title, description, image, github_url, demo_url, created_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    cleanTitle,
                    cleanDescription,
                    cleanImage || null,
                    cleanGithubUrl,
                    cleanDemoUrl,
                    req.user.id
                ]
            )
            : await db.execute(
                `INSERT INTO projects
                    (id, title, description, image, github_url, demo_url, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    cleanId,
                    cleanTitle,
                    cleanDescription,
                    cleanImage || null,
                    cleanGithubUrl,
                    cleanDemoUrl,
                    req.user.id
                ]
            );

        return res.status(201).json({
            message: "Project created successfully!",
            project: {
                id: cleanId === null ? result.insertId : cleanId,
                title: cleanTitle,
                description: cleanDescription,
                image: cleanImage || null,
                github_url: cleanGithubUrl,
                demo_url: cleanDemoUrl,
                created_by: req.user.id
            }
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "That project ID is already in use." });
        }
        console.error("Create project error:", error.message);

        return res.status(500).json({
            message: "Unable to create project."
        });
    }
};

// =========================
// UPDATE PROJECT
// =========================
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            id: requestedId,
            title,
            description,
            image,
            github_url,
            demo_url
        } = req.body || {};

        if (!isValidId(id)) {
            return res.status(400).json({ message: "Invalid project ID." });
        }
        const cleanId = requestedId === undefined || requestedId === ""
            ? Number(id)
            : Number(requestedId);
        if (
            !isValidId(cleanId) ||
            !Number.isSafeInteger(cleanId)
        ) {
            return res.status(400).json({ message: "Project ID must be a positive whole number." });
        }

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
        const cleanImage = typeof image === "string" ? image.trim() : "";
        const cleanGithubUrl = typeof github_url === "string" && github_url.trim()
            ? github_url.trim()
            : null;
        const cleanDemoUrl = typeof demo_url === "string" && demo_url.trim()
            ? demo_url.trim()
            : null;

        if (cleanTitle.length > 200 || cleanDescription.length > 10000) {
            return res.status(400).json({
                message: "Title or description exceeds the allowed length."
            });
        }

        if (
            (image !== undefined && image !== null && typeof image !== "string") ||
            cleanImage.length > 2048
        ) {
            return res.status(400).json({
                message: "Image must be a string no longer than 2048 characters."
            });
        }

        if (
            !isValidOptionalUrl(github_url) ||
            !isValidOptionalUrl(demo_url)
        ) {
            return res.status(400).json({
                message: "GitHub and demo links must be valid HTTP or HTTPS URLs."
            });
        }

        const [existing] = await db.execute(
            "SELECT id FROM projects WHERE id = ? LIMIT 1",
            [Number(id)]
        );
        if (existing.length === 0) {
            return res.status(404).json({ message: "Project not found." });
        }

        if (cleanId !== Number(id)) {
            const [idConflict] = await db.execute(
                "SELECT id FROM projects WHERE id = ? LIMIT 1",
                [cleanId]
            );
            if (idConflict.length > 0) {
                return res.status(409).json({ message: "That project ID is already in use." });
            }
        }

        await db.execute(
            `UPDATE projects
             SET id = ?, title = ?, description = ?, image = ?, github_url = ?, demo_url = ?
             WHERE id = ?`,
            [
                cleanId,
                cleanTitle,
                cleanDescription,
                cleanImage || null,
                cleanGithubUrl,
                cleanDemoUrl,
                Number(id)
            ]
        );

        return res.status(200).json({
            message: "Project updated successfully!",
            id: cleanId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "That project ID is already in use." });
        }
        console.error("Update project error:", error.message);
        return res.status(500).json({ message: "Unable to update project." });
    }
};

// =========================
// DELETE PROJECT
// =========================
const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid project ID."
            });
        }

        const [projects] = await db.execute(
            "SELECT id, created_by FROM projects WHERE id = ? LIMIT 1",
            [Number(id)]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                message: "Project not found."
            });
        }

        const project = projects[0];

        // Only the owner or an admin may delete the project
        if (
            Number(project.created_by) !== Number(req.user.id) &&
            req.user.role !== "admin"
        ) {
            return res.status(403).json({
                message: "You do not have permission to delete this project."
            });
        }

        const [result] = await db.execute(
            "DELETE FROM projects WHERE id = ?",
            [Number(id)]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Project not found."
            });
        }

        return res.status(200).json({
            message: "Project deleted successfully!"
        });
    } catch (error) {
        console.error("Delete project error:", error.message);

        return res.status(500).json({
            message: "Unable to delete project."
        });
    }
};

module.exports = {
    getProjects,
    getMyProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject
};
