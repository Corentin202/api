import pool from '../config/db.js';
import { generateUuid } from '../config/crypto.js';

class CategoryModel {
    // Créer une nouvelle catégorie
    static async create({ userId, name, color }) {
        const connection = await pool.getConnection();
        try {
            const categoryId = generateUuid();
            
            await connection.query(
                'INSERT INTO categories (id, userId, name, color) VALUES (?, ?, ?, ?)',
                [categoryId, userId, name, color]
            );
            
            return categoryId;
        } catch (error) {
            throw new Error(`Error creating category: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Récupérer toutes les catégories d'un utilisateur
    static async getAllForUser(userId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                'SELECT * FROM categories WHERE userId = ?',
                [userId]
            );
            return rows;
        } catch (error) {
            throw new Error(`Error fetching categories: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Supprimer une catégorie
    static async delete(categoryId, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Mettre à null la catégorie des mots de passe associés
            await connection.query(
                'UPDATE passwords SET category = NULL WHERE category = ? AND userId = ?',
                [categoryId, userId]
            );

            // Supprimer la catégorie
            const [result] = await connection.query(
                'DELETE FROM categories WHERE id = ? AND userId = ?',
                [categoryId, userId]
            );

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw new Error(`Error deleting category: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    // Mettre à jour une catégorie
    static async update(categoryId, { userId, name, color }) {
        const connection = await pool.getConnection();
        try {
            const updates = [];
            const params = [];

            if (name !== undefined) {
                updates.push('name = ?');
                params.push(name);
            }
            if (color !== undefined) {
                updates.push('color = ?');
                params.push(color);
            }

            if (updates.length === 0) {
                throw new Error('No fields to update');
            }

            params.push(categoryId, userId);

            const [result] = await connection.query(
                `UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND userId = ?`,
                params
            );

            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error updating category: ${error.message}`);
        } finally {
            connection.release();
        }
    }
}

export default CategoryModel;