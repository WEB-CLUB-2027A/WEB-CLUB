
const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const {
    register,
    login
} = require("../controllers/authController");

// Limit repeated login attempts from the same IP.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many login attempts. Please try again in 15 minutes."
    }
});

// Limit repeated registration attempts.
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many registration attempts. Please try again later."
    }
});

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);

module.exports = router;
