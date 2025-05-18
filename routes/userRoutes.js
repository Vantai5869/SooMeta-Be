// users.js (tệp router của bạn)
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js'; // Import auth middleware
import adminAuthMiddleware from '../middleware/adminAuth.js'; // Import admin auth middleware

const router = express.Router();

// POST / - Tạo user mới hoặc đăng nhập (đã cập nhật ở lần trước)
router.post('/', async (req, res) => {
    try {
        const { email, deviceId, platform } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not defined in environment variables.');
            return res.status(500).json({ error: 'Server configuration error: JWT_SECRET missing.' });
        }

        let user = await User.findOne({ email: email.toLowerCase() });
        let token;
        let statusCode;
        let message;

        if (user) {
            user.deviceId = deviceId || user.deviceId;
            user.platform = platform || user.platform;
            user.lastLogin = Date.now(); // Cập nhật trường lastLogin từ schema của bạn
            await user.save();
            statusCode = 200;
            message = 'User logged in successfully!';
        } else {
            user = new User({
                email: email.toLowerCase(),
                deviceId,
                platform,
                lastLogin: Date.now(), // Schema của bạn dùng lastLogin
                // role và isActive sẽ có giá trị default từ schema
            });
            await user.save();
            statusCode = 201;
            message = 'User created and logged in successfully!';
        }

        const payload = {
            user: {
                id: user.id,
                email: user.email,
                // role: user.role, // Có thể thêm role vào payload nếu muốn, nhưng lấy từ DB sẽ cập nhật hơn
            },
        };

        token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

        res.status(statusCode).json({
            message,
            token,
            user: {
                id: user.id,
                email: user.email,
                deviceId: user.deviceId,
                platform: user.platform,
                role: user.role,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
            },
        });

    } catch (error) {
        console.error("Error in POST /users:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'An internal server error occurred.', details: error.message });
    }
});


// Lấy danh sách tất cả users (CHỈ ADMIN)
router.get('/', authMiddleware, adminAuthMiddleware, async (req, res) => {
    try {
        // req.currentUser được thiết lập bởi authMiddleware
        // adminAuthMiddleware đã kiểm tra req.currentUser.role === 'admin'
        const users = await User.find().select('-password'); // Giả sử bạn có trường password
        res.json(users);
    } catch (error) {
        console.error("Error in GET /users (admin):", error);
        res.status(500).json({ error: 'Failed to retrieve users.' });
    }
});

// Lấy thông tin user theo ID (User có thể lấy thông tin của chính họ, Admin có thể lấy của bất kỳ ai)
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        // req.currentUser được thiết lập bởi authMiddleware
        if (req.currentUser.id !== req.params.id && req.currentUser.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden. You can only access your own profile or must be an admin.' });
        }

        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error(`Error in GET /users/${req.params.id}:`, error);
        if (error.kind === 'ObjectId') {
             return res.status(400).json({ message: 'Invalid user ID format' });
        }
        res.status(500).json({ error: 'Failed to retrieve user.' });
    }
});

// Cập nhật thông tin user (User có thể cập nhật của chính họ, Admin có thể cập nhật của bất kỳ ai)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const userIdToUpdate = req.params.id;
        const loggedInUser = req.currentUser;

        if (loggedInUser.id !== userIdToUpdate && loggedInUser.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden. You can only update your own profile or must be an admin.' });
        }

        const { email, role, isActive, ...updateData } = req.body; // Tách các trường nhạy cảm

        // Chỉ admin mới được thay đổi role và isActive
        if (loggedInUser.role === 'admin') {
            if (role !== undefined) updateData.role = role;
            if (isActive !== undefined) updateData.isActive = isActive;
        } else {
            // Người dùng thường không được tự ý thay đổi role hoặc isActive của mình qua API này
            if (role !== undefined || isActive !== undefined) {
                 return res.status(403).json({ message: 'You are not authorized to change role or active status.' });
            }
        }

        // Không cho phép thay đổi email qua route này để đơn giản hóa,
        // hoặc nếu có, cần logic xác minh email mới phức tạp hơn.
        if (email && email !== loggedInUser.email && loggedInUser.id === userIdToUpdate) {
            // return res.status(400).json({ message: 'Email change is not supported via this route or requires verification.' });
        }


        const updatedUser = await User.findByIdAndUpdate(userIdToUpdate, updateData, { new: true, runValidators: true }).select('-password');
        if (!updatedUser) return res.status(404).json({ message: 'User not found' });
        res.json(updatedUser);
    } catch (error) {
        console.error(`Error in PUT /users/${req.params.id}:`, error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        if (error.kind === 'ObjectId') {
             return res.status(400).json({ message: 'Invalid user ID format' });
        }
        res.status(500).json({ error: 'Failed to update user.' });
    }
});

// Xóa user (CHỈ ADMIN)
router.delete('/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
    try {
        // adminAuthMiddleware đã kiểm tra quyền admin
        const userIdToDelete = req.params.id;

        // Ngăn admin tự xóa chính mình (tùy chọn)
        if (req.currentUser.id === userIdToDelete) {
            return res.status(400).json({ message: "Admin cannot delete their own account through this route." });
        }

        const user = await User.findByIdAndDelete(userIdToDelete);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(`Error in DELETE /users/${req.params.id}:`, error);
         if (error.kind === 'ObjectId') {
             return res.status(400).json({ message: 'Invalid user ID format' });
        }
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

export default router;