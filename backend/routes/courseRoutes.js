
const express = require("express");
const router = express.Router();

const courseController = require("../controllers/courseController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// Public: get all courses.
router.get("/", courseController.getCourses);

// Public: get one course.
router.get("/:id", courseController.getCourseById);

// Admin only: create a course.
router.post(
    "/",
    authMiddleware,
    adminMiddleware,
    courseController.createCourse
);

// Admin only: delete a course.
router.delete(
    "/:id",
    authMiddleware,
    adminMiddleware,
    courseController.deleteCourse
);

module.exports = router;
