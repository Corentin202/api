import pool from '../config/db.js';
import { generateUuid, encryptPassword, decryptPassword } from '../config/crypto.js';

class PasswordModel {
    // Récupérer tous les mots de passe d'un utilisateur
    static async getAllForUser(userId) {
        const connection = await pool.getConnection();
        try {
            // Récupérer la clé d'encryption (même façon que dans la méthode add)
            const encryptionKey = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
            
            const [rows] = await connection.query(
                'SELECT * FROM passwords WHERE userId = ? AND deletedAt IS NULL',
                [userId]
            );

            return rows.map(password => ({
                ...password,
                password: decryptPassword(password.password, encryptionKey)
            }));
        } catch (error) {
            throw new Error(`Error fetching passwords: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Ajouter un nouveau mot de passe
    static async add({ userId, title, username, password, url, notes, category, favorite }) {
        const connection = await pool.getConnection();
        try {
            const passwordId = generateUuid();
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            // Récupérer la clé d'encryption (exemple: depuis les variables d'environnement)
            const encryptionKey = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
            const encrypted = encryptPassword(password, encryptionKey);

            await connection.query(
                `INSERT INTO passwords 
                (id, userId, title, username, password, url, notes, category, favorite, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    passwordId,
                    userId,
                    title,
                    username,
                    encrypted,
                    url || null,
                    notes || null,
                    category || null,
                    favorite || false,
                    now,
                    now
                ]
            );

            return passwordId;
        } catch (error) {
            throw new Error(`Error adding password: ${error.message}`);
        } finally {
            connection.release();
        }
    }
    
    // Mettre à jour un mot de passe
    static async update(id, { userId, title, username, password, url, notes, category, favorite }) {
        const connection = await pool.getConnection();
        try {
            const updates = ['updatedAt = ?'];
            const params = [new Date().toISOString().slice(0, 19).replace('T', ' ')];

            if (title) {
                updates.push('title = ?');
                params.push(title);
            }
            if (username) {
                updates.push('username = ?');
                params.push(username);
            }
            if (password) {
                const encryptionKey = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
                updates.push('password = ?');
                params.push(encryptPassword(password, encryptionKey));
            }
            if (url !== undefined) {
                updates.push('url = ?');
                params.push(url);
            }
            if (notes !== undefined) {
                updates.push('notes = ?');
                params.push(notes);
            }
            if (category !== undefined) {
                updates.push('category = ?');
                params.push(category);
            }
            if (favorite !== undefined) {
                updates.push('favorite = ?');
                params.push(favorite);
            }

            params.push(id, userId);

            const [result] = await connection.query(
                `UPDATE passwords SET ${updates.join(', ')} WHERE id = ? AND userId = ?`,
                params
            );

            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error updating password: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Supprimer (soft delete)
    static async delete(id, userId) {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(
                'UPDATE passwords SET deletedAt = ? WHERE id = ? AND userId = ?',
                [new Date().toISOString().slice(0, 19).replace('T', ' '), id, userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error deleting password: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Restaurer depuis la corbeille
    static async restore(id, userId) {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(
                'UPDATE passwords SET deletedAt = NULL WHERE id = ? AND userId = ?',
                [id, userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error restoring password: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Suppression permanente
    static async permanentlyDelete(id, userId) {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(
                'DELETE FROM passwords WHERE id = ? AND userId = ? AND deletedAt IS NOT NULL',
                [id, userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error permanently deleting password: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Récupérer la corbeille
    static async getTrash(userId) {
        const connection = await pool.getConnection();
        try {
            const encryptionKey = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
            
            const [rows] = await connection.query(
                'SELECT * FROM passwords WHERE userId = ? AND deletedAt IS NOT NULL',
                [userId]
            );

            return rows.map(password => ({
                ...password,
                password: decryptPassword(password.password, encryptionKey)
            }));
        } catch (error) {
            throw new Error(`Error fetching trash: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Vider la corbeille
    static async emptyTrash(userId) {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(
                'DELETE FROM passwords WHERE userId = ? AND deletedAt IS NOT NULL',
                [userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error emptying trash: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Gestion des favoris
    static async toggleFavorite(id, userId, favorite) {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(
                'UPDATE passwords SET favorite = ?, updatedAt = ? WHERE id = ? AND userId = ?',
                [favorite, new Date().toISOString().slice(0, 19).replace('T', ' '), id, userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error toggling favorite: ${error.message}`);
        } finally {
            connection.release();
        }
    }
}

export default PasswordModel;