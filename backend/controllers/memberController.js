
const db = require("../config/database");

// =========================
// GET ALL MEMBERS (PUBLIC)
// Only return safe public profile fields.
// =========================
const getMembers = async (req, res) => {
    try {
        const [members] = await db.execute(`
            SELECT
                m.id,
                m.user_id,
                u.name,
                m.position,
                m.bio,
                m.skills,
                m.github_url,
                m.linkedin_url,
                m.profile_image,
                m.cover_image,
                m.joined_at
            FROM members AS m
            INNER JOIN users AS u ON u.id = m.user_id
            ORDER BY m.joined_at DESC
        `);

        return res.status(200).json({
            message: "Members retrieved successfully.",
            members
        });
    } catch (error) {
        console.error("Get members error:", error.message);

        return res.status(500).json({
            message: "Server error."
        });
    }
};

const getEligibleUsers = async (req, res) => {
    try {
        const [users] = await db.execute(`
            SELECT u.id, u.name, u.email
            FROM users AS u
            LEFT JOIN members AS m ON m.user_id = u.id
            WHERE m.id IS NULL
            ORDER BY u.name ASC
        `);

        return res.status(200).json({
            message: "Accounts without member profiles retrieved successfully.",
            users
        });
    } catch (error) {
        console.error("Get eligible member accounts error:", error.message);
        return res.status(500).json({
            message: "Unable to load accounts for new member profiles."
        });
    }
};

function validateAdminMemberFields(body, requireUserId) {
    const fields = {
        position: body.position ?? "",
        bio: body.bio ?? "",
        skills: body.skills ?? "",
        github_url: body.github_url ?? "",
        linkedin_url: body.linkedin_url ?? "",
        profile_image: body.profile_image ?? ""
    };

    for (const [key, value] of Object.entries(fields)) {
        if (typeof value !== "string") {
            return { error: `${key} must be a string.` };
        }
        fields[key] = value.trim();
    }

    if (fields.position.length > 100) {
        return { error: "Role / position must not exceed 100 characters." };
    }

    if (fields.bio.length > 2000 || fields.skills.length > 1000) {
        return { error: "Bio or skills text is too long." };
    }

    for (const key of ["github_url", "linkedin_url", "profile_image"]) {
        const value = fields[key];
        if (value.length > 2048) {
            return { error: "A profile URL is too long." };
        }
        if (value) {
            try {
                const parsed = new URL(value);
                if (!["http:", "https:"].includes(parsed.protocol)) {
                    return { error: `${key} must be a valid HTTP or HTTPS URL.` };
                }
            } catch {
                return { error: `${key} must be a valid HTTP or HTTPS URL.` };
            }
        }
    }

    if (!requireUserId) return { fields };

    const userId = Number(body.user_id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
        return { error: "Select a valid account for this member profile." };
    }

    return { fields, userId };
}

const createAdminMemberProfile = async (req, res) => {
    try {
        const requestedId = req.body?.id;
        const memberId = requestedId === undefined || requestedId === ""
            ? null
            : Number(requestedId);
        if (
            memberId !== null &&
            (!Number.isSafeInteger(memberId) || memberId <= 0)
        ) {
            return res.status(400).json({
                message: "Member profile ID must be a positive whole number."
            });
        }

        const { fields, userId, error } = validateAdminMemberFields(req.body || {}, true);
        if (error) return res.status(400).json({ message: error });

        const [users] = await db.execute(
            "SELECT id FROM users WHERE id = ? LIMIT 1",
            [userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: "Selected account was not found." });
        }

        const [existing] = await db.execute(
            "SELECT id FROM members WHERE user_id = ? LIMIT 1",
            [userId]
        );
        if (existing.length > 0) {
            return res.status(409).json({
                message: "This account already has a member profile."
            });
        }

        const [result] = memberId === null
            ? await db.execute(`
                INSERT INTO members
                    (user_id, position, bio, skills, github_url, linkedin_url, profile_image)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                userId,
                fields.position,
                fields.bio,
                fields.skills,
                fields.github_url,
                fields.linkedin_url,
                fields.profile_image
            ])
            : await db.execute(`
                INSERT INTO members
                    (id, user_id, position, bio, skills, github_url, linkedin_url, profile_image)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                memberId,
                userId,
                fields.position,
                fields.bio,
                fields.skills,
                fields.github_url,
                fields.linkedin_url,
                fields.profile_image
            ]);

        return res.status(201).json({
            message: "Member profile created successfully.",
            memberId: memberId === null ? result.insertId : memberId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "That member ID is in use, or this account already has a member profile."
            });
        }

        console.error("Admin create member profile error:", error.message);
        return res.status(500).json({
            message: "Unable to create the member profile."
        });
    }
};

const updateAdminMemberProfile = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid member profile ID." });
        }
        const requestedId = req.body?.id;
        const memberId = requestedId === undefined || requestedId === ""
            ? id
            : Number(requestedId);
        if (!Number.isSafeInteger(memberId) || memberId <= 0) {
            return res.status(400).json({
                message: "Member profile ID must be a positive whole number."
            });
        }

        const { fields, error } = validateAdminMemberFields(req.body || {}, false);
        if (error) return res.status(400).json({ message: error });

        const { name } = req.body || {};
        if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
            return res.status(400).json({
                message: "Member name is required and must not exceed 100 characters."
            });
        }
        const cleanName = name.trim();

        const [existing] = await db.execute(
            "SELECT id, user_id FROM members WHERE id = ? LIMIT 1",
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ message: "Member profile not found." });
        }

        if (memberId !== id) {
            const [idConflict] = await db.execute(
                "SELECT id FROM members WHERE id = ? LIMIT 1",
                [memberId]
            );
            if (idConflict.length > 0) {
                return res.status(409).json({ message: "That member profile ID is already in use." });
            }
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute(
                "UPDATE users SET name = ? WHERE id = ?",
                [cleanName, existing[0].user_id]
            );
            await connection.execute(`
                UPDATE members
                SET id = ?, position = ?, bio = ?, skills = ?, github_url = ?, linkedin_url = ?, profile_image = ?
                WHERE id = ?
            `, [
                memberId,
                fields.position,
                fields.bio,
                fields.skills,
                fields.github_url,
                fields.linkedin_url,
                fields.profile_image,
                id
            ]);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

        return res.status(200).json({
            message: "Member name and profile updated successfully.",
            id: memberId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "That member profile ID is already in use." });
        }
        console.error("Admin update member profile error:", error.message);
        return res.status(500).json({
            message: "Unable to update the member profile."
        });
    }
};

const deleteAdminMemberProfile = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid member profile ID." });
        }

        const [result] = await db.execute(
            "DELETE FROM members WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Member profile not found." });
        }

        return res.status(200).json({
            message: "Member profile removed successfully. The user account is unchanged."
        });
    } catch (error) {
        console.error("Admin delete member profile error:", error.message);
        return res.status(500).json({
            message: "Unable to remove the member profile."
        });
    }
};

// =========================
// GET MY PROFILE (PRIVATE)
// =========================
const getMyMemberProfile = async (req, res) => {
    try {
        const [members] = await db.execute(`
            SELECT
                m.id,
                m.user_id,
                u.name,
                u.email,
                u.role,
                m.position,
                m.bio,
                m.skills,
                m.github_url,
                m.linkedin_url,
                m.profile_image,
                m.cover_image,
                m.joined_at
            FROM members AS m
            INNER JOIN users AS u ON u.id = m.user_id
            WHERE m.user_id = ?
            LIMIT 1
        `, [req.user.id]);

        if (members.length === 0) {
            return res.status(404).json({
                message: "Member profile not found."
            });
        }

        return res.status(200).json({
            message: "Profile retrieved successfully.",
            member: members[0]
        });
    } catch (error) {
        console.error("Get my profile error:", error.message);

        return res.status(500).json({
            message: "Server error."
        });
    }
};

// =========================
// CREATE MY PROFILE
// =========================
const createMemberProfile = async (req, res) => {
    try {
        const {
            bio = "",
            skills = "",
            github_url = "",
            linkedin_url = "",
            profile_image = "",
            cover_image = ""
        } = req.body || {};

        const fields = {
            bio,
            skills,
            github_url,
            linkedin_url,
            profile_image,
            cover_image
        };

        for (const [key, value] of Object.entries(fields)) {
            if (typeof value !== "string") {
                return res.status(400).json({
                    message: `${key} must be a string.`
                });
            }
        }

        if (bio.length > 2000 || skills.length > 1000) {
            return res.status(400).json({
                message: "Bio or skills text is too long."
            });
        }

        if (
            github_url.length > 2048 ||
            linkedin_url.length > 2048 ||
            profile_image.length > 2048 ||
            cover_image.length > 2048
        ) {
            return res.status(400).json({
                message: "A profile URL is too long."
            });
        }

        // Allow only HTTP/HTTPS URLs when a URL is provided.
        const validWebUrl = (value) => {
            if (!value) return true;

            try {
                const parsed = new URL(value);
                return parsed.protocol === "https:" ||
                    parsed.protocol === "http:";
            } catch {
                return false;
            }
        };

        if (
            !validWebUrl(github_url) ||
            !validWebUrl(linkedin_url) ||
            !validWebUrl(profile_image) ||
            !validWebUrl(cover_image)
        ) {
            return res.status(400).json({
                message: "Profile URLs must be valid HTTP or HTTPS URLs."
            });
        }

        const [existing] = await db.execute(
            "SELECT id FROM members WHERE user_id = ? LIMIT 1",
            [req.user.id]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Your member profile already exists. Update it instead."
            });
        }

        const [result] = await db.execute(`
            INSERT INTO members
                (user_id, bio, skills, github_url, linkedin_url, profile_image, cover_image)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id,
            bio.trim(),
            skills.trim(),
            github_url.trim(),
            linkedin_url.trim(),
            profile_image.trim(),
            cover_image.trim()
        ]);

        return res.status(201).json({
            message: "Member profile created successfully.",
            memberId: result.insertId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Your member profile already exists."
            });
        }

        console.error("Create member profile error:", error.message);

        return res.status(500).json({
            message: "Server error."
        });
    }
};

// =========================
// UPDATE MY PROFILE
// Users can update only their own profile.
// =========================
const updateMemberProfile = async (req, res) => {
    try {
        const {
            bio,
            skills,
            github_url,
            linkedin_url,
            profile_image,
            cover_image
        } = req.body || {};

        const fields = {
            bio,
            skills,
            github_url,
            linkedin_url,
            profile_image,
            cover_image
        };

        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined && typeof value !== "string") {
                return res.status(400).json({
                    message: `${key} must be a string.`
                });
            }
        }

        const currentValues = Object.fromEntries(
            Object.entries(fields).map(([key, value]) => [
                key,
                value === undefined ? null : value.trim()
            ])
        );

        const [existing] = await db.execute(
            "SELECT id FROM members WHERE user_id = ? LIMIT 1",
            [req.user.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                message: "Create your member profile before updating it."
            });
        }

        const updated = {
            bio: currentValues.bio,
            skills: currentValues.skills,
            github_url: currentValues.github_url,
            linkedin_url: currentValues.linkedin_url,
            profile_image: currentValues.profile_image,
            cover_image: currentValues.cover_image
        };

        for (const key of ["bio", "skills", "github_url", "linkedin_url", "profile_image", "cover_image"]) {
            if (updated[key] === null) {
                updated[key] = undefined;
            }
        }

        if (
            (updated.bio !== undefined && updated.bio.length > 2000) ||
            (updated.skills !== undefined && updated.skills.length > 1000)
        ) {
            return res.status(400).json({
                message: "Bio or skills text is too long."
            });
        }

        for (const key of ["github_url", "linkedin_url", "profile_image", "cover_image"]) {
            const value = updated[key];

            if (value !== undefined && value.length > 2048) {
                return res.status(400).json({
                    message: "A profile URL is too long."
                });
            }

            if (value) {
                try {
                    const parsed = new URL(value);

                    if (!["https:", "http:"].includes(parsed.protocol)) {
                        throw new Error("Invalid protocol");
                    }
                } catch {
                    return res.status(400).json({
                        message: `${key} must be a valid HTTP or HTTPS URL.`
                    });
                }
            }
        }

        await db.execute(`
            UPDATE members
            SET
                bio = COALESCE(?, bio),
                skills = COALESCE(?, skills),
                github_url = COALESCE(?, github_url),
                linkedin_url = COALESCE(?, linkedin_url),
                profile_image = COALESCE(?, profile_image),
                cover_image = COALESCE(?, cover_image)
            WHERE user_id = ?
        `, [
            updated.bio ?? null,
            updated.skills ?? null,
            updated.github_url ?? null,
            updated.linkedin_url ?? null,
            updated.profile_image ?? null,
            updated.cover_image ?? null,
            req.user.id
        ]);

        return res.status(200).json({
            message: "Member profile updated successfully."
        });
    } catch (error) {
        console.error("Update member profile error:", error.message);

        return res.status(500).json({
            message: "Server error."
        });
    }
};

module.exports = {
    getMembers,
    getEligibleUsers,
    createAdminMemberProfile,
    updateAdminMemberProfile,
    deleteAdminMemberProfile,
    getMyMemberProfile,
    createMemberProfile,
    updateMemberProfile
};
