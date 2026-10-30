
const mysql = require("mysql2/promise");
require("dotenv").config();

// Check required database settings.
const requiredVariables = [
    "DB_HOST",
    "DB_USER",
    "DB_NAME"
];

const missingVariables = requiredVariables.filter(
    (key) => !process.env[key]
);

if (missingVariables.length > 0) {
    throw new Error(
        `Missing database environment variables: ${missingVariables.join(", ")}`
    );
}

// Create the MySQL connection pool.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test the connection.
async function testDatabase() {
    let connection;

    try {
        connection = await pool.getConnection();

        await connection.query("SELECT 1");

        console.log("MySQL connected successfully!");
    } catch (error) {
        console.error("MySQL connection failed:", error.message);
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

testDatabase();

module.exports = pool;
