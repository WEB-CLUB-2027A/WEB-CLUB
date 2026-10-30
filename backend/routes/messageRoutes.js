
const express = require("express");
const router = express.Router();

const messageController = require("../controllers/messageController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// Public: visitors can submit contact messages.
router.post("/", messageController.createMessage);

// Admin only: view all submitted messages.
router.get(
    "/",
    authMiddleware,
    adminMiddleware,
    messageController.getMessages
);

// Admin only: update a message's read status.
router.patch(
    "/:id/status",
    authMiddleware,
    adminMiddleware,
    messageController.updateMessageStatus
);

// Admin only: edit submitted message details.
router.patch(
    "/:id",
    authMiddleware,
    adminMiddleware,
    messageController.updateMessage
);

// Admin only: delete a message.
router.delete(
    "/:id",
    authMiddleware,
    adminMiddleware,
    messageController.deleteMessage
);

module.exports = router;
