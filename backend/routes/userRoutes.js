const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for user image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/users';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'user-' + uniqueSuffix + path.extname(file.originalname));
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

// Tenant approval routes (admin only)
router.get('/pending-tenants', auth, checkPermission('users', 'can_view'), userController.getPendingTenants);
router.post('/:id/approve', auth, checkPermission('users', 'can_update'), userController.approveTenant);
router.post('/:id/reject', auth, checkPermission('users', 'can_delete'), userController.rejectTenant);

// Regular user routes
router.get('/', auth, checkPermission('users', 'can_view'), userController.getAllUsers);
router.post('/', auth, checkPermission('users', 'can_add'), upload.single('image'), userController.createUser);
router.put('/:id', auth, checkPermission('users', 'can_update'), upload.single('image'), userController.updateUser);
router.delete('/:id', auth, checkPermission('users', 'can_delete'), userController.deleteUser);

module.exports = router;
