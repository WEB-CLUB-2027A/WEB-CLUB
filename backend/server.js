const express = require("express");
const cors = require("cors");
require("dotenv").config();

require("./config/database");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const eventRoutes =
    require("./routes/eventRoutes");
const memberRoutes =
    require("./routes/memberRoutes");

const courseRoutes =
    require("./routes/courseRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use(
    "/api/events",
    eventRoutes
);
app.use(
    "/api/members",
    memberRoutes
);

app.use(
    "/api/courses",
    courseRoutes
);

app.use("/api/messages", messageRoutes);

// Home
app.get("/", (req, res) => {
    res.json({
        message: "WEB-CLUB Backend is running 🚀"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`WEB-CLUB server running on http://localhost:${PORT}`);
});