const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/products';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

router.get('/', auth, checkPermission('products', 'can_view'), productController.getAllProducts);
router.get('/:id', auth, checkPermission('products', 'can_view'), productController.getProductById);
router.post('/', auth, checkPermission('products', 'can_add'), upload.single('image'), productController.createProduct);
router.put('/:id', auth, checkPermission('products', 'can_update'), upload.single('image'), productController.updateProduct);
router.delete('/:id', auth, checkPermission('products', 'can_delete'), productController.deleteProduct);

module.exports = router;
