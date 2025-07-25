import express from 'express';
import mongoose from 'mongoose';
import PracticeHistory from '../models/PracticeHistory.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// POST /practice-history: Lưu hoặc cập nhật lịch sử làm bài cho 1 câu hỏi
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { questionId, answer, isCorrect, timestamp } = req.body;
    const userId = req.currentUser.id;
    if (!questionId || typeof isCorrect === 'undefined' || typeof answer === 'undefined') {
      return res.status(400).json({ message: 'Thiếu trường bắt buộc.' });
    }
    const update = { answer, isCorrect, timestamp: timestamp ? new Date(timestamp) : new Date() };
    const history = await PracticeHistory.findOneAndUpdate(
      { userId, questionId },
      { $set: update },
      { upsert: true, new: true }
    );
    res.status(201).json({ message: 'Lưu lịch sử thành công.', history });
  } catch (error) {
    console.error('Error in POST /practice-history:', error);
    res.status(500).json({ message: 'Lỗi server.', details: error.message });
  }
});

// GET /practice-history?userId=...: Lấy toàn bộ lịch sử làm bài của user
router.get('/', authMiddleware, async (req, res) => {
  try {
    let userId = req.query.userId || req.currentUser.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'userId không hợp lệ.' });
    }
    const history = await PracticeHistory.find({ userId });
    res.json({ history });
  } catch (error) {
    console.error('Error in GET /practice-history:', error);
    res.status(500).json({ message: 'Lỗi server.', details: error.message });
  }
});

export default router; 