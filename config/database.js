import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    enableKeepAlive: true,
    keepAliveInitialDelay: 0,

    ssl: {
        // Resolusi path absolut, supaya tetap valid dari
        // direktori mana pun proses Node dijalankan.
        ca: fs.readFileSync(
            new URL("../certs/isrgrootx1.pem", import.meta.url)
        ),
        rejectUnauthorized: true,
    },
});

(async () => {
    try {
        const connection = await db.getConnection();
        console.log("Connected to Database");
        connection.release();
    } catch (error) {
        console.error("Failed to connect to Database:", error.message);
    }
})();

export default db;
