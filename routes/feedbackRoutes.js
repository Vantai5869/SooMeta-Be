// routes/feedback.js
import express from 'express';
import mongoose from 'mongoose'; // Cần cho ObjectId.isValid
import Feedback from '../models/Feedback.js';
import authMiddleware from '../middleware/auth.js'; // Middleware xác thực của bạn
import User from '../models/User.js'; 

const router = express.Router();

// POST /feedback - Gửi một phản hồi mới (route này bạn đã có)
router.post('/', authMiddleware, async (req, res) => {
    // ... (giữ nguyên logic của bạn)
    if (!req.currentUser || !req.currentUser.id) {
        return res.status(401).json({ message: 'Xác thực thất bại. Vui lòng đăng nhập.' });
    }
    const { feedbackText, pageContext } = req.body;
    if (!feedbackText || typeof feedbackText !== 'string' || feedbackText.trim().length < 10) {
        return res.status(400).json({ message: 'Nội dung phản hồi phải có ít nhất 10 ký tự.' });
    }
    try {
        const newFeedback = new Feedback({
            userId: req.currentUser.id,
            feedbackText: feedbackText.trim(),
            pageContext: pageContext ? pageContext.trim() : undefined,
        });
        await newFeedback.save();
        res.status(201).json({ message: 'Cảm ơn bạn đã gửi phản hồi!' });
    } catch (error) {
        console.error("Lỗi khi lưu phản hồi:", error);
        res.status(500).json({ message: 'Lỗi server khi lưu phản hồi.'});
    }
});

// GET /feedback - Lấy danh sách phản hồi (cho admin)
router.get('/', authMiddleware, async (req, res) => {
    if (!req.currentUser || req.currentUser.role !== 'admin') {
        return res.status(403).json({ message: 'Truy cập bị từ chối. Yêu cầu quyền admin.' });
    }

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15; // Tăng limit mặc định lên 15
        const statusFilter = req.query.status; 

        let query = {};
        if (statusFilter && ['new', 'seen', 'in-progress', 'resolved', 'wont-fix'].includes(statusFilter)) {
            query = { status: statusFilter };
        }

        const skip = (page - 1) * limit;

        const feedbacks = await Feedback.find(query)
            .populate('userId', 'email name') // Lấy email và tên của người dùng
            .sort({ createdAt: -1 }) // Mới nhất trước
            .skip(skip)
            .limit(limit);

        const totalFeedbacks = await Feedback.countDocuments(query);
        const totalPages = Math.ceil(totalFeedbacks / limit);

        res.json({
            feedbacks,
            currentPage: page,
            totalPages,
            totalFeedbacks,
        });

    } catch (error) {
        console.error("Lỗi lấy danh sách phản hồi:", error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách phản hồi.', details: error.message });
    }
});

// PATCH /feedback/:feedbackId/status - Cập nhật trạng thái phản hồi (cho admin)
router.patch('/:feedbackId/status', authMiddleware, async (req, res) => {
    if (!req.currentUser || req.currentUser.role !== 'admin') {
        return res.status(403).json({ message: 'Truy cập bị từ chối. Yêu cầu quyền admin.' });
    }

    const { feedbackId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
        return res.status(400).json({ message: 'ID phản hồi không hợp lệ.' });
    }

    const allowedStatuses = ['new', 'seen', 'in-progress', 'resolved', 'wont-fix'];
    if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({ message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${allowedStatuses.join(', ')}` });
    }

    try {
        const updatedFeedback = await Feedback.findByIdAndUpdate(
            feedbackId,
            { status },
            { new: true } // Trả về document đã được cập nhật
        ).populate('userId', 'email name');

        if (!updatedFeedback) {
            return res.status(404).json({ message: 'Không tìm thấy phản hồi.' });
        }
        res.json({ message: 'Cập nhật trạng thái phản hồi thành công.', feedback: updatedFeedback });
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái phản hồi:", error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái.', details: error.message });
    }
});


export default router;