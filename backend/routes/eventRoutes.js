
const express = require("express");
const router = express.Router();

const eventController = require("../controllers/eventController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// Public: get all events.
router.get("/", eventController.getEvents);

// Authenticated users: get events created by their own account.
router.get("/mine", authMiddleware, eventController.getMyEvents);

// Public: get one event.
router.get("/:id", eventController.getEventById);

// Admin only: create an event.
router.post(
    "/",
    authMiddleware,
    adminMiddleware,
    eventController.createEvent
);

// Admin only: update an event.
router.put(
    "/:id",
    authMiddleware,
    adminMiddleware,
    eventController.updateEvent
);

// Admin only: delete an event.
router.delete(
    "/:id",
    authMiddleware,
    adminMiddleware,
    eventController.deleteEvent
);

module.exports = router;
