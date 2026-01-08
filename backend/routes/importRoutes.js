const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const importController = require('../controllers/importController');
const auth = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() !== '.csv') {
            return cb(new Error('Only CSV files are allowed'));
        }
        cb(null, true);
    }
});

// Products import routes
router.post('/products/analyze', auth, checkPermission('products', 'can_import'), upload.single('file'), importController.analyzeProductsImport);
router.post('/products/process', auth, checkPermission('products', 'can_import'), importController.processProductsImport);

// Categories import routes
router.post('/categories/analyze', auth, checkPermission('categories', 'can_import'), upload.single('file'), importController.analyzeCategoriesImport);
router.post('/categories/process', auth, checkPermission('categories', 'can_import'), importController.processCategoriesImport);

// Users import routes
router.post('/users/analyze', auth, checkPermission('users', 'can_import'), upload.single('file'), importController.analyzeUsersImport);
router.post('/users/process', auth, checkPermission('users', 'can_import'), importController.processUsersImport);

// Coupons import routes
router.post('/coupons/analyze', auth, checkPermission('coupons', 'can_import'), upload.single('file'), importController.analyzeCouponsImport);
router.post('/coupons/process', auth, checkPermission('coupons', 'can_import'), importController.processCouponsImport);

module.exports = router;
