
const express = require("express");
const router = express.Router();

const memberController = require("../controllers/memberController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// Public: view member directory without emails or account roles.
router.get("/", memberController.getMembers);

// Admin only: list accounts that do not have a member profile yet.
router.get(
    "/admin/eligible-users",
    authMiddleware,
    adminMiddleware,
    memberController.getEligibleUsers
);

// Authenticated users: access only their own profile.
router.get(
    "/me",
    authMiddleware,
    memberController.getMyMemberProfile
);

// Authenticated users: create their own profile.
router.post(
    "/",
    authMiddleware,
    memberController.createMemberProfile
);

// Admin only: create a profile for an existing account.
router.post(
    "/admin",
    authMiddleware,
    adminMiddleware,
    memberController.createAdminMemberProfile
);

// Authenticated users: update only their own profile.
router.put(
    "/me",
    authMiddleware,
    memberController.updateMemberProfile
);

// Admin only: update any public member profile.
router.put(
    "/admin/:id",
    authMiddleware,
    adminMiddleware,
    memberController.updateAdminMemberProfile
);

// Admin only: remove a public member profile without deleting its user account.
router.delete(
    "/admin/:id",
    authMiddleware,
    adminMiddleware,
    memberController.deleteAdminMemberProfile
);

module.exports = router;
