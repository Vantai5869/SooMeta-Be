// routes/vocabulary.js
import express from 'express';
import Vocabulary from '../models/Vocabulary.js'; // Đường dẫn đến model Vocabulary
import User from '../models/User.js'; // Cần để check user nếu cần (dù authMiddleware đã làm)
import authMiddleware from '../middleware/auth.js'; // Middleware xác thực của bạn
import mongoose from 'mongoose';

const router = express.Router();

// POST /vocabulary - Lưu một từ vựng mới
router.post('/', authMiddleware, async (req, res) => {
    // req.currentUser được thiết lập bởi authMiddleware
    if (!req.currentUser || !req.currentUser.id) {
        return res.status(401).json({ message: 'Xác thực thất bại. Vui lòng đăng nhập.' });
    }

    const { koreanWord, vietnameseMeaning, examples } = req.body;

    if (!koreanWord || !vietnameseMeaning) {
        return res.status(400).json({ message: 'Từ tiếng Hàn và nghĩa tiếng Việt là bắt buộc.' });
    }

    // Xử lý và giới hạn số lượng ví dụ
    let processedExamples = [];
    if (Array.isArray(examples)) {
        processedExamples = examples
            .filter(ex => ex && typeof ex.koreanExample === 'string' && typeof ex.vietnameseExample === 'string')
            .slice(0, 2); // Chỉ lấy tối đa 2 ví dụ hợp lệ
    }

    try {
        const userId = req.currentUser.id;

        // Kiểm tra xem từ này đã được user lưu trước đó chưa
        let existingEntry = await Vocabulary.findOne({ userId, koreanWord });

        if (existingEntry) {
            // Nếu đã tồn tại, có thể cập nhật ví dụ hoặc nghĩa nếu khác
            // Hoặc đơn giản là thông báo đã tồn tại
            existingEntry.vietnameseMeaning = vietnameseMeaning; // Cập nhật nghĩa nếu cần
            existingEntry.examples = processedExamples; // Cập nhật ví dụ
            await existingEntry.save();
            return res.status(200).json({ 
                message: 'Từ vựng đã được cập nhật (hoặc đã tồn tại với nội dung tương tự).', 
                vocabulary: existingEntry,
                isNew: false
            });
        }

        // Nếu chưa tồn tại, tạo mới
        const newVocabulary = new Vocabulary({
            userId,
            koreanWord,
            vietnameseMeaning,
            examples: processedExamples
        });

        await newVocabulary.save();
        res.status(201).json({ 
            message: 'Từ vựng đã được lưu thành công!', 
            vocabulary: newVocabulary,
            isNew: true 
        });

    } catch (error) {
        console.error("Lỗi khi lưu từ vựng:", error);
        if (error.code === 11000) { // Lỗi trùng lặp key từ MongoDB
             return res.status(409).json({ message: 'Từ vựng này đã được bạn lưu trước đó.', isNew: false });
        }
        res.status(500).json({ message: 'Lỗi server khi lưu từ vựng.', details: error.message });
    }
});


// GET /vocabulary/check - Kiểm tra từ vựng đã được lưu chưa
router.get('/check', authMiddleware, async (req, res) => {
    if (!req.currentUser || !req.currentUser.id) {
        return res.status(401).json({ message: 'Xác thực thất bại.' });
    }
    const { koreanWord } = req.query;
    if (!koreanWord || typeof koreanWord !== 'string') {
        return res.status(400).json({ message: 'Thiếu tham số koreanWord.' });
    }
    try {
        const entry = await Vocabulary.findOne({ userId: req.currentUser.id, koreanWord: koreanWord });
        if (entry) {
            res.json({ isFavorited: true, entryId: entry._id });
        } else {
            res.json({ isFavorited: false });
        }
    } catch (error) {
        console.error("Lỗi kiểm tra từ vựng:", error);
        res.status(500).json({ message: 'Lỗi server khi kiểm tra từ vựng.', details: error.message });
    }
});


// // (Tùy chọn) GET /vocabulary - Lấy tất cả từ vựng đã lưu của người dùng
// router.get('/', authMiddleware, async (req, res) => {
//     if (!req.currentUser || !req.currentUser.id) {
//         return res.status(401).json({ message: 'Xác thực thất bại.' });
//     }
//     try {
//         const vocabularies = await Vocabulary.find({ userId: req.currentUser.id })
//                                            .sort({ createdAt: -1 });
//         res.json(vocabularies);
//     } catch (error) {
//         console.error("Lỗi lấy danh sách từ vựng:", error);
//         res.status(500).json({ message: 'Lỗi server khi lấy danh sách từ vựng.', details: error.message });
//     }
// });

router.get('/', authMiddleware, async (req, res) => {
    if (!req.currentUser || !req.currentUser.id) {
        return res.status(401).json({ message: 'Xác thực thất bại.' });
    }

    let queryConditions = { userId: req.currentUser.id }; // Mặc định lấy của người dùng hiện tại

    // Nếu là admin và có cung cấp userId trong query, thì lấy của user đó
    if (req.currentUser.role === 'admin' && req.query.userId && typeof req.query.userId === 'string') {
        if (!mongoose.Types.ObjectId.isValid(req.query.userId)) {
            return res.status(400).json({ message: "Định dạng User ID trong query không hợp lệ." });
        }
        queryConditions = { userId: req.query.userId };
    }
    // Nếu admin không cung cấp userId, họ sẽ xem được từ vựng của chính họ (hành vi mặc định)
    // Nếu muốn admin xem tất cả, cần một điều kiện khác hoặc endpoint riêng.

    try {
        const vocabularies = await Vocabulary.find(queryConditions)
                                           .sort({ createdAt: -1 }); // Sắp xếp mới nhất trước
        res.json(vocabularies);
    } catch (error) {
        console.error("Lỗi lấy danh sách từ vựng:", error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách từ vựng.', details: error.message });
    }
});


// DELETE /vocabulary/:entryId - Xóa một mục từ vựng đã lưu
router.delete('/:entryId', authMiddleware, async (req, res) => {
    if (!req.currentUser || !req.currentUser.id) {
        return res.status(401).json({ message: 'Xác thực thất bại.' });
    }

    const { entryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(entryId)) {
        return res.status(400).json({ message: 'ID từ vựng không hợp lệ.' });
    }

    try {
        const vocabularyEntry = await Vocabulary.findById(entryId);

        if (!vocabularyEntry) {
            return res.status(404).json({ message: 'Từ vựng không tìm thấy.' });
        }

        // Đảm bảo người dùng chỉ xóa từ vựng của chính họ
        if (vocabularyEntry.userId.toString() !== req.currentUser.id) {
            return res.status(403).json({ message: 'Bạn không có quyền xóa từ vựng này.' });
        }

        await Vocabulary.findByIdAndDelete(entryId);
        // Hoặc dùng: await vocabularyEntry.deleteOne(); nếu đã có document

        res.status(200).json({ message: 'Đã xóa từ vựng thành công.' });

    } catch (error) {
        console.error("Lỗi khi xóa từ vựng:", error);
        res.status(500).json({ message: 'Lỗi server khi xóa từ vựng.', details: error.message });
    }
});

export default router;