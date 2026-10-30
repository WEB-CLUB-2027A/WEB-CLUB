
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

// Validate email format.
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// =========================
// REGISTER
// =========================
const register = async (req, res) => {
    try {
        let { name, email, password } = req.body || {};

        // Validate required fields.
        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Name, email, and password are required."
            });
        }

        name = name.trim();
        email = email.trim().toLowerCase();

        if (name.length > 100 || email.length > 254) {
            return res.status(400).json({
                message: "Name or email is too long."
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        // bcrypt supports passwords up to 72 bytes.
        if (
            password.length < 8 ||
            Buffer.byteLength(password, "utf8") > 72
        ) {
            return res.status(400).json({
                message: "Password must be at least 8 characters and no more than 72 bytes."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing.");
            return res.status(500).json({
                message: "Server configuration error."
            });
        }

        // Check for an existing account.
        const [existingUsers] = await db.execute(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                message: "Email already exists."
            });
        }

        // Hash the password before saving.
        const hashedPassword = await bcrypt.hash(password, 10);

        // Never accept the role from the request body.
        const [result] = await db.execute(
            `INSERT INTO users (name, email, password)
             VALUES (?, ?, ?)`,
            [name, email, hashedPassword]
        );

        return res.status(201).json({
            message: "User registered successfully!",
            user: {
                id: result.insertId,
                name,
                email,
                role: "member"
            }
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Email already exists."
            });
        }

        console.error("Register error:", error.message);

        return res.status(500).json({
            message: "Server error."
        });
    }
};

// =========================
// LOGIN
// =========================
const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing.");
            return res.status(500).json({
                message: "Server configuration error."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (
            normalizedEmail.length > 254 ||
            password.length > 1024
        ) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const [users] = await db.execute(
            `SELECT id, name, email, password, role
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                algorithm: "HS256",
                expiresIn: "1d"
            }
        );

        return res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            message: "Server error."
        });
    }
};

module.exports = {
    register,
    login
};
