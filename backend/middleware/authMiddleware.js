
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        // 1. Check that the JWT secret is configured
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing.");
            return res.status(500).json({
                message: "Server configuration error."
            });
        }

        // 2. Check the Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Access denied. No token provided."
            });
        }

        // 3. Require the Bearer token format
        const parts = authHeader.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer" ||
            !parts[1]
        ) {
            return res.status(401).json({
                message: "Invalid authorization format."
            });
        }

        // 4. Verify the token signature and expiration
        const decoded = jwt.verify(
            parts[1],
            process.env.JWT_SECRET,
            {
                algorithms: ["HS256"]
            }
        );

        // 5. Validate the token payload
        if (
            !decoded ||
            typeof decoded !== "object" ||
            !Number.isSafeInteger(Number(decoded.id)) ||
            Number(decoded.id) <= 0 ||
            typeof decoded.role !== "string" ||
            !decoded.role.trim()
        ) {
            return res.status(401).json({
                message: "Invalid token payload."
            });
        }

        // 6. Attach the authenticated user to the request
        req.user = {
            id: Number(decoded.id),
            email:
                typeof decoded.email === "string"
                    ? decoded.email
                    : undefined,
            role: decoded.role
        };

        return next();

    } catch (error) {
        if (
            error.name !== "JsonWebTokenError" &&
            error.name !== "TokenExpiredError" &&
            error.name !== "NotBeforeError"
        ) {
            console.error(
                "Authentication error:",
                error.message
            );
        }

        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
};

module.exports = authMiddleware;
