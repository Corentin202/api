import express from 'express';
import UserModel from '../models/UserModel.js';
import PasswordModel from '../models/PasswordModel.js';
import CategoryModel from '../models/CategoryModel.js';
import { initializeDatabase } from '../config/db.js';

const router = express.Router();

// Middleware CORS
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

router.options('*', (req, res) => res.sendStatus(200));

// Routes principales
router.post('/init-db', async (req, res) => {
    try {
        await initializeDatabase();
        res.status(200).json({ status: 'success', message: 'Database initialized successfully' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            throw new Error('Missing required fields');
        }

        const userId = await UserModel.register({ username, email, password });

        // Création des catégories par défaut
        const defaultCategories = [
            { name: 'Personnel', color: '#3b82f6' },
            { name: 'Travail', color: '#10b981' },
            { name: 'Finance', color: '#f59e0b' },
            { name: 'Social', color: '#ec4899' }
        ];

        for (const category of defaultCategories) {
            await CategoryModel.create({
                userId,
                name: category.name,
                color: category.color
            });
        }

        res.status(201).json({ status: 'success', userId });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            throw new Error('Missing credentials');
        }

        const user = await UserModel.login({ username, password });
        const passwords = await PasswordModel.getAllForUser(user.id);
        const categories = await CategoryModel.getAllForUser(user.id);

        res.json({
            status: 'success',
            user,
            passwords,
            categories
        });
    } catch (error) {
        res.status(401).json({ status: 'error', message: error.message });
    }
});

// Gestion des mots de passe
router.route('/passwords/:id?/:action?')
    .post(async (req, res) => {
        try {
            const passwordData = { ...req.body, userId: req.body.userId };
            const passwordId = await PasswordModel.add(passwordData);
            res.status(201).json({ status: 'success', passwordId });
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    })
    .put(async (req, res) => {
        try {
            const { id } = req.params;
            const success = await PasswordModel.update(id, req.body);
            success ? 
                res.json({ status: 'success', message: 'Password updated' }) :
                res.status(404).json({ status: 'error', message: 'Password not found' });
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    })
    .delete(async (req, res) => {
        try {
            const { id } = req.params;
            const { userId } = req.query;
            
            if (req.params.action === 'permanent') {
                const success = await PasswordModel.permanentlyDelete(id, userId);
                success ?
                    res.json({ status: 'success', message: 'Permanently deleted' }) :
                    res.status(404).json({ status: 'error', message: 'Not found in trash' });
            } else {
                const success = await PasswordModel.delete(id, userId);
                success ?
                    res.json({ status: 'success', message: 'Moved to trash' }) :
                    res.status(404).json({ status: 'error', message: 'Password not found' });
            }
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

// Restauration des mots de passe
router.post('/passwords/:id/restore', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const success = await PasswordModel.restore(id, userId);
        
        success ?
            res.json({ status: 'success', message: 'Password restored' }) :
            res.status(404).json({ status: 'error', message: 'Password not found in trash' });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

// Gestion des favoris
router.patch('/passwords/:id/favorite', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, favorite } = req.body;
        const success = await PasswordModel.toggleFavorite(id, userId, favorite);
        
        success ?
            res.json({ status: 'success', message: 'Favorite status updated' }) :
            res.status(404).json({ status: 'error', message: 'Password not found' });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

// Gestion de la corbeille
router.route('/trash')
    .get(async (req, res) => {
        try {
            const { userId } = req.query;
            const passwords = await PasswordModel.getTrash(userId);
            res.json({ status: 'success', passwords });
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    })
    .delete(async (req, res) => {
        try {
            const { userId } = req.query;
            const success = await PasswordModel.emptyTrash(userId);
            success ?
                res.json({ status: 'success', message: 'Trash emptied' }) :
                res.status(404).json({ status: 'error', message: 'No passwords in trash' });
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

// Gestion des catégories
router.route('/categories/:id?')
    .post(async (req, res) => {
        try {
            const categoryData = req.body;
            const categoryId = await CategoryModel.create(categoryData);
            res.status(201).json({ status: 'success', categoryId });
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    })
    .put(async (req, res) => {
        try {
            const { id } = req.params;
            const success = await CategoryModel.update(id, req.body);
            success ?
                res.json({ status: 'success', message: 'Category updated' }) :
                res.status(404).json({ status: 'error', message: 'Category not found' });
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    })
    .delete(async (req, res) => {
        try {
            const { id } = req.params;
            const { userId } = req.query;
            const success = await CategoryModel.delete(id, userId);
            success ?
                res.json({ status: 'success', message: 'Category deleted' }) :
                res.status(404).json({ status: 'error', message: 'Category not found' });
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

// Gestion des erreurs globales
router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        status: 'error', 
        message: 'Internal server error' 
    });
});

export default router;