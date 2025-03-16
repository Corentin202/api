import pool from '../config/db.js';
import { generateUuid, hashPassword, verifyPassword } from '../config/crypto.js';

// Vérification que la fonction verifyPassword existe
if (typeof verifyPassword !== 'function') {
  console.error("La fonction verifyPassword n'est pas correctement importée.");
} else {
    console.log("La fonction verifyPassword est correctement importée.");
}

class UserModel {
    static async register({ username, email, password }) {
        const connection = await pool.getConnection();
        try {
            const userId = generateUuid();
            const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const { hash, newSalt } = hashPassword(password);

            await connection.query(
                'INSERT INTO users (id, username, email, passwordHash, salt, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, username, email, hash, newSalt, createdAt]
            );

            return userId;
        } finally {
            connection.release();
        }
    }

    static async login({ username, password }) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                'SELECT * FROM users WHERE username = ?',
                [username]
            );

            if (!rows.length) throw new Error('User not found');
            const user = rows[0];

            // Réimplémentation de la vérification de mot de passe au cas où l'import échoue
            const isPasswordValid = (() => {
                try {
                    return verifyPassword(user.passwordHash, user.salt, password);
                } catch (e) {
                    // En cas d'erreur, utilisons directement hashPassword
                    const { hash } = hashPassword(password, user.salt);
                    return hash === user.passwordHash;
                }
            })();

            if (!isPasswordValid) {
                throw new Error('Invalid password');
            }

            await connection.query(
                'UPDATE users SET lastLogin = ? WHERE id = ?',
                [new Date().toISOString().slice(0, 19).replace('T', ' '), user.id]
            );

            return user;
        } finally {
            connection.release();
        }
    }
}

export default UserModel;