
const db = require("../config/database");

// =========================
// GET MY PROFILE
// =========================
const getProfile = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                message: "Authentication required."
            });
        }

        const [users] = await db.execute(
            `SELECT id, name, email, role, profile_image, cover_image, dashboard_logo,
                    github_url, linkedin_url, created_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        return res.status(200).json({
            message: "Profile loaded successfully.",
            user: users[0]
        });
    } catch (error) {
        console.error("Get profile error:", error.message);

        return res.status(500).json({
            message: "Server error."
        });
    }
};

const updateAdminProfile = async (req, res) => {
    try {
        const { name, profile_image, cover_image, dashboard_logo, github_url, linkedin_url } = req.body || {};
        if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
            return res.status(400).json({
                message: "Name is required and must not exceed 100 characters."
            });
        }

        const profileFields = {
            profile_image: { value: profile_image, label: "Profile image" },
            cover_image: { value: cover_image, label: "Cover image" },
            dashboard_logo: { value: dashboard_logo, label: "Dashboard logo" },
            github_url: { value: github_url, label: "GitHub" },
            linkedin_url: { value: linkedin_url, label: "LinkedIn" }
        };
        for (const { value, label } of Object.values(profileFields)) {
            if (value === undefined) continue;
            if (typeof value !== "string" || value.trim().length > 2048) {
                return res.status(400).json({
                    message: `${label} URL must not exceed 2048 characters.`
                });
            }
            if (value.trim()) {
                try {
                    const url = new URL(value.trim());
                    if (!["http:", "https:"].includes(url.protocol)) {
                        throw new Error("Invalid URL protocol.");
                    }
                } catch (error) {
                    return res.status(400).json({
                        message: `${label} must be a valid HTTP or HTTPS URL.`
                    });
                }
            }
        }

        await db.execute(
            `UPDATE users
             SET name = ?, profile_image = COALESCE(?, profile_image), cover_image = COALESCE(?, cover_image),
                 dashboard_logo = COALESCE(?, dashboard_logo), github_url = COALESCE(?, github_url),
                 linkedin_url = COALESCE(?, linkedin_url)
             WHERE id = ? AND role = 'admin'`,
            [
                name.trim(),
                profile_image === undefined ? null : profile_image.trim(),
                cover_image === undefined ? null : cover_image.trim(),
                dashboard_logo === undefined ? null : dashboard_logo.trim(),
                github_url === undefined ? null : github_url.trim(),
                linkedin_url === undefined ? null : linkedin_url.trim(),
                req.user.id
            ]
        );

        const [users] = await db.execute(
            `SELECT id, name, email, role, profile_image, cover_image, dashboard_logo,
                    github_url, linkedin_url, created_at
             FROM users
             WHERE id = ? AND role = 'admin'
             LIMIT 1`,
            [req.user.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: "Administrator account not found." });
        }

        return res.status(200).json({
            message: "Profile updated successfully.",
            user: users[0],
            name: users[0].name,
            profile_image: users[0].profile_image,
            cover_image: users[0].cover_image,
            dashboard_logo: users[0].dashboard_logo,
            github_url: users[0].github_url,
            linkedin_url: users[0].linkedin_url
        });
    } catch (error) {
        console.error("Update admin profile error:", error.message);
        return res.status(500).json({
            message: "Unable to update your profile."
        });
    }
};

// =========================
// GET USER COUNT (ADMIN)
// =========================
const getUserCount = async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT COUNT(*) AS total FROM users"
        );

        return res.status(200).json({
            totalMembers: Number(rows[0].total)
        });
    } catch (error) {
        console.error("Get user count error:", error.message);

        return res.status(500).json({
            message: "Server error."
        });
    }
};

module.exports = {
    getProfile,
    updateAdminProfile,
    getUserCount
};
