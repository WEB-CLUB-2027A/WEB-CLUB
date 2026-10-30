
const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// Logged-in users can view their own profile.
router.get(
    "/profile",
    authMiddleware,
    userController.getProfile
);

// Only admins can update their own display name.
router.patch(
    "/profile",
    authMiddleware,
    adminMiddleware,
    userController.updateAdminProfile
);

// Only admins can view the total user count.
router.get(
    "/count",
    authMiddleware,
    adminMiddleware,
    userController.getUserCount
);

module.exports = router;
