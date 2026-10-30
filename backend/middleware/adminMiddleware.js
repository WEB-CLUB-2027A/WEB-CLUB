
const db = require("../config/database");

async function adminMiddleware(req, res, next) {
    try {
        // 1. Check that the user is authenticated
        if (
            !req.user ||
            !Number.isSafeInteger(req.user.id) ||
            req.user.id <= 0
        ) {
            return res.status(401).json({
                message: "Authentication required."
            });
        }

        // 2. Get the current role from the database
        const [users] = await db.execute(
            "SELECT role FROM users WHERE id = ? LIMIT 1",
            [req.user.id]
        );

        // 3. Check that the account still exists
        if (users.length === 0) {
            return res.status(401).json({
                message: "User account not found."
            });
        }

        // 4. Only allow the current admin role
        if (users[0].role !== "admin") {
            return res.status(403).json({
                message: "Admin access required."
            });
        }

        // 5. Use the role stored in the database
        req.user.role = users[0].role;

        return next();
    } catch (error) {
        console.error("Admin authorization error:", error.message);

        return res.status(500).json({
            message: "Server error."
        });
    }
}

module.exports = adminMiddleware;
