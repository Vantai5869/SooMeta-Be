// routes/users.js
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose'; // Vẫn cần cho .isValid ObjectId
import User from '../models/User.js'; // Model User VẪN LÀ PHIÊN BẢN ĐÃ CẬP NHẬT với role, tier, name
import authMiddleware from '../middleware/auth.js';
import adminAuthMiddleware from '../middleware/adminAuth.js';

const router = express.Router();

// POST / - Tạo user mới hoặc đăng nhập
router.post('/', async (req, res) => {
    try {
        const { email, deviceId, platform, name } = req.body; // Vẫn nhận name nếu client gửi

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Email is required and must be a string.' });
        }
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'deviceId is required and must be a string.' });
        }
        if (!platform || typeof platform !== 'string' || !['iOS', 'Android', 'WEB'].includes(platform)) {
            return res.status(400).json({ error: 'platform is required and must be one of: iOS, Android, WEB.' });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not defined in environment variables.');
            return res.status(500).json({ error: 'Server configuration error: JWT_SECRET missing.' });
        }

        let userDocument = await User.findOne({ email: email.toLowerCase() });
        let statusCode;
        let responseMessage;

        if (userDocument) { // User đã tồn tại -> Đăng nhập
            userDocument.deviceId = deviceId;
            userDocument.platform = platform;
            userDocument.lastLogin = new Date();
            if (name && typeof name === 'string' && name.trim() !== '') {
                 userDocument.name = name.trim();
            }
            // Hook pre('save') trong User model sẽ tự động xử lý subscriptionTier nếu cần khi userDocument.save()
            await userDocument.save();
            statusCode = 200;
            responseMessage = 'User logged in successfully!';
        } else { // User chưa tồn tại -> Tạo mới
            userDocument = new User({
                email: email.toLowerCase(),
                deviceId,
                platform,
                name: name && typeof name === 'string' ? name.trim() : undefined,
                lastLogin: new Date(),
                // role sẽ là 'user' (default từ schema)
                // subscriptionTier sẽ được pre('save') hook xử lý thành 'nomo' cho role 'user'
            });
            await userDocument.save();
            statusCode = 201;
            responseMessage = 'User created and logged in successfully!';
        }

        const payload = {
            user: {
                id: userDocument.id, // Mongoose virtual 'id' (string representation of _id)
                email: userDocument.email,
                // Không cần gửi role và tier trong token nếu authMiddleware sẽ lấy từ DB
            },
        };

        const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

        // --- ĐIỀU CHỈNH QUAN TRỌNG Ở ĐÂY ---
        // Trả về cấu trúc user object GIỐNG HỆT như phiên bản cũ của bạn
        // mà frontend (cụ thể là authStore) đang mong đợi sau khi đăng nhập.
        // Dựa trên code bạn cung cấp ở turn #37, nó chỉ có _id và email.
        // Nếu phiên bản cũ của bạn có trả về 'role', hãy thêm vào đây.
        const userForResponse = {
            _id: userDocument.id, 
            email: userDocument.email,
            role: userDocument.role, 
            subscriptionTier: userDocument.subscriptionTier,
            name: userDocument.name,
        };
        // --- HẾT ĐIỀU CHỈNH ---

        res.status(statusCode).json({
            message: responseMessage,
            token,
            user: userForResponse, // Sử dụng object user đã được tinh gọn
        });

    } catch (error) {
        console.error("Error in POST /users:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message, details: error.errors });
        }
        if (error.code === 11000) { 
             return res.status(409).json({ error: 'Email này đã được đăng ký.', field: 'email' });
        }
        res.status(500).json({ error: 'Lỗi server nội bộ.', details: error.message });
    }
});


// GET /users - Lấy danh sách tất cả users (CHỈ ADMIN)
router.get('/', authMiddleware, adminAuthMiddleware, async (req, res) => {
    try {
        // Route này cho admin, nên có thể trả về đầy đủ thông tin (trừ password)
        const users = await User.find().select('-password'); 
        res.json(users.map(user => user.toJSON())); // Áp dụng toJSON để có 'id' và bỏ '_id', '__v'
    } catch (error) {
        console.error("Error in GET /users (admin):", error);
        res.status(500).json({ error: 'Lỗi khi lấy danh sách người dùng.' });
    }
});

// GET /users/:id - Lấy thông tin user theo ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        if (!req.currentUser) {
             return res.status(401).json({ message: 'Xác thực thất bại.'});
        }
        if (req.currentUser.id !== req.params.id && req.currentUser.role !== 'admin') {
            return res.status(403).json({ message: 'Bạn không có quyền truy cập thông tin này.' });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID người dùng không hợp lệ.' });
        }
        // Route này cho admin hoặc user xem chính mình, có thể trả về đầy đủ thông tin
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        res.json(user.toJSON());
    } catch (error) {
        console.error(`Error in GET /users/${req.params.id}:`, error);
        res.status(500).json({ error: 'Lỗi khi lấy thông tin người dùng.' });
    }
});

// PUT /users/:id - Cập nhật thông tin user
// Route này vẫn giữ logic cập nhật đầy đủ, vì nó có thể được gọi từ trang admin
// hoặc từ trang profile của user (nơi có thể muốn cập nhật nhiều hơn).
// Nếu bạn muốn route này cũng trả về user object tối giản, hãy điều chỉnh userResponse.
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const userIdToUpdate = req.params.id;
        if (!req.currentUser) {
             return res.status(401).json({ message: 'Xác thực thất bại.'});
        }
        const loggedInUser = req.currentUser;

        if (loggedInUser.id !== userIdToUpdate && loggedInUser.role !== 'admin') {
            return res.status(403).json({ message: 'Bạn không có quyền cập nhật thông tin này.' });
        }
        if (!mongoose.Types.ObjectId.isValid(userIdToUpdate)) {
            return res.status(400).json({ message: 'ID người dùng không hợp lệ.' });
        }

        const { name, role, subscriptionTier, isActive, premiumExpiresAt, platform, deviceId } = req.body;
        
        const userToUpdate = await User.findById(userIdToUpdate);
        if (!userToUpdate) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng để cập nhật.' });
        }

        // User tự cập nhật hoặc admin cập nhật
        if (name !== undefined) userToUpdate.name = String(name).trim(); // Chuyển sang String để đảm bảo
        if (platform !== undefined && ['iOS', 'Android', 'WEB'].includes(platform)) userToUpdate.platform = platform;
        if (deviceId !== undefined) userToUpdate.deviceId = String(deviceId);
        
        // Chỉ Admin
        if (loggedInUser.role === 'admin') {
            if (role !== undefined && ['user', 'admin'].includes(role)) {
                userToUpdate.role = role;
            }
            if (subscriptionTier !== undefined && ['nomo', 'premium', null].includes(subscriptionTier)) {
                 if (userToUpdate.role === 'admin' && subscriptionTier !== null) {
                    return res.status(400).json({ message: 'Admin không thể có subscription tier.' });
                 }
                 if (userToUpdate.role === 'user') {
                    userToUpdate.subscriptionTier = subscriptionTier;
                 }
            }
            if (premiumExpiresAt !== undefined) {
                userToUpdate.premiumExpiresAt = premiumExpiresAt ? new Date(premiumExpiresAt) : null;
            }
            if (typeof isActive === 'boolean') {
                userToUpdate.isActive = isActive;
            }
        } else { // User thường tự cập nhật, không cho đổi các trường nhạy cảm
            if (role !== undefined || subscriptionTier !== undefined || isActive !== undefined || premiumExpiresAt !== undefined) {
                return res.status(403).json({ message: 'Bạn không có quyền thay đổi các thông tin này.' });
            }
        }
        
        const updatedUser = await userToUpdate.save(); // .save() sẽ trigger pre('save') hook
        
        // Route PUT này có thể vẫn trả về user đầy đủ, vì nó dùng cho cả admin
        res.json({ message: 'Thông tin người dùng đã được cập nhật.', user: updatedUser.toJSON() });

    } catch (error) {
        console.error(`Error in PUT /users/${req.params.id}:`, error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message, details: error.errors });
        }
        res.status(500).json({ error: 'Lỗi server khi cập nhật thông tin người dùng.' });
    }
});

// Xóa user (CHỈ ADMIN)
router.delete('/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
    try {
        if (!req.currentUser) {
            return res.status(401).json({ message: 'Xác thực thất bại.'});
        }
        const userIdToDelete = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(userIdToDelete)) {
            return res.status(400).json({ message: 'ID người dùng không hợp lệ.' });
        }
        if (req.currentUser.id === userIdToDelete) {
            return res.status(400).json({ message: "Admin không thể tự xóa tài khoản của mình." });
        }
        const user = await User.findByIdAndDelete(userIdToDelete);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        res.json({ message: 'Đã xóa người dùng thành công.' });
    } catch (error) {
        console.error(`Error in DELETE /users/${req.params.id}:`, error);
        res.status(500).json({ error: 'Lỗi khi xóa người dùng.' });
    }
});

export default router;