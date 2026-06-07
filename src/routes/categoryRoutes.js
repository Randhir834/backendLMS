const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { getCategories, getCategoryById, createCategoryController, updateCategory, deleteCategory } = require('../controllers/categoryController');

const router = express.Router();

router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.post('/', authenticate, authorizeRoles('admin'), createCategoryController);
router.put('/:id', authenticate, authorizeRoles('admin'), updateCategory);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteCategory);

module.exports = router;
