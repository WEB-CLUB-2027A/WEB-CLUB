
const express = require("express");
const router = express.Router();

const projectController = require("../controllers/projectController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// Public: get all projects.
router.get("/", projectController.getProjects);

// Authenticated users: get projects created by their own account.
router.get("/mine", authMiddleware, projectController.getMyProjects);

// Public: get one project.
router.get("/:id", projectController.getProjectById);

// Admin only: create a project.
router.post(
    "/",
    authMiddleware,
    adminMiddleware,
    projectController.createProject
);

// Admin only: update a project.
router.put(
    "/:id",
    authMiddleware,
    adminMiddleware,
    projectController.updateProject
);

// Admin only: delete a project.
router.delete(
    "/:id",
    authMiddleware,
    adminMiddleware,
    projectController.deleteProject
);

module.exports = router;
