// middleware/adminAuth.js
const adminAuthMiddleware = (req, res, next) => {
    // Middleware này giả định rằng authMiddleware đã chạy trước
    // và req.currentUser đã được thiết lập với thông tin role.
    if (req.currentUser && req.currentUser.role === 'admin') {
        next(); // User là admin, cho phép truy cập
    } else {
        res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }
};

export default adminAuthMiddleware;