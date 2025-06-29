// middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Đường dẫn tới User model của bạn

const authMiddleware = async (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ message: 'No token, authorization denied. Please include a token in the Authorization header.' });
    }

    // Token thường có dạng "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ message: 'Token error, format should be "Bearer <token>".' });
    }
    const token = parts[1];

    if (!token) { // Kiểm tra lại lần nữa sau khi split (dù trường hợp trên đã bao gồm)
        return res.status(401).json({ message: 'No token found after Bearer, authorization denied.' });
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not defined in environment variables for auth middleware.');
            return res.status(500).json({ error: 'Server configuration error: JWT_SECRET missing.' });
        }

        const decoded = jwt.verify(token, jwtSecret);
        // decoded.user sẽ chứa payload bạn đã đặt khi tạo token (ví dụ: { id: user.id, email: user.email })

        // Lấy thông tin user từ DB để đảm bảo user vẫn tồn tại và active
        // và để lấy thông tin role cập nhật nhất
        const userFromDb = await User.findById(decoded.user.id).select('-password'); // Loại trừ password

        if (!userFromDb) {
            return res.status(401).json({ message: 'User not found for the provided token.' });
        }

        if (!userFromDb.isActive) {
            return res.status(403).json({ message: 'User account is inactive. Please contact support.' });
        }

        // Gắn thông tin user (đã được xác thực và lấy từ DB) vào đối tượng request
        // để các route handler sau có thể sử dụng
        req.currentUser = {
            id: userFromDb.id,
            email: userFromDb.email,
            role: userFromDb.role,
            isActive: userFromDb.isActive,
            subscriptionTier: userFromDb.subscriptionTier
            // Thêm các trường khác nếu cần
        };

        next(); // Cho phép request đi tiếp tới route handler
    } catch (err) {
        console.error('Token verification error:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired.' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Token is not valid.' });
        }
        res.status(401).json({ message: 'Token is not valid or an unexpected error occurred.' });
    }
};

export default authMiddleware;