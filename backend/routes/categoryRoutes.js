const express = require('express');
const router = express.Router();
const { getAllCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const auth = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');

router.get('/', auth, checkPermission('categories', 'can_view'), getAllCategories);
router.post('/', auth, checkPermission('categories', 'can_add'), createCategory);
router.put('/:id', auth, checkPermission('categories', 'can_update'), updateCategory);
router.delete('/:id', auth, checkPermission('categories', 'can_delete'), deleteCategory);

module.exports = router;
