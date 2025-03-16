import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export async function initializeDatabase() {
    const connection = await pool.getConnection();
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                passwordHash VARCHAR(255) NOT NULL,
                salt VARCHAR(255) NOT NULL,
                createdAt DATETIME NOT NULL,
                lastLogin DATETIME
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS passwords (
                id VARCHAR(36) PRIMARY KEY,
                userId VARCHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                username VARCHAR(255) NOT NULL,
                password VARCHAR(255) NOT NULL,
                url VARCHAR(255),
                notes TEXT,
                category VARCHAR(36),
                favorite BOOLEAN DEFAULT FALSE,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                deletedAt DATETIME,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id VARCHAR(36) PRIMARY KEY,
                userId VARCHAR(36) NOT NULL,
                name VARCHAR(255) NOT NULL,
                color VARCHAR(7) NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
    } finally {
        connection.release();
    }
}

export default pool;