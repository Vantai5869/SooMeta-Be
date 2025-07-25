import express from 'express';
import DownloadStat from '../models/DownloadStat.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// POST /download-stats/:examFileId: Tăng lượt tải cho file
router.post('/:examFileId', authMiddleware, async (req, res) => {
  try {
    const { examFileId } = req.params;
    if (!examFileId) {
      return res.status(400).json({ message: 'examFileId là bắt buộc.' });
    }
    const stat = await DownloadStat.findOneAndUpdate(
      { examFileId },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
    res.json({ success: true, count: stat.count });
  } catch (error) {
    console.error('Error in POST /download-stats:', error);
    res.status(500).json({ message: 'Lỗi server.', details: error.message });
  }
});

// GET /download-stats: Lấy toàn bộ thống kê lượt tải
router.get('/', authMiddleware, async (req, res) => {
  try {
    const stats = await DownloadStat.find();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in GET /download-stats:', error);
    res.status(500).json({ message: 'Lỗi server.', details: error.message });
  }
});

export default router; 