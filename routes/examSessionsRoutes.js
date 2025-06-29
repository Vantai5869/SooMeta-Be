// routes/examSessions.js
import express from 'express';
import ExamSession from '../models/ExamSession.js';
import authMiddleware from '../middleware/auth.js'; // Middleware xác thực token
import User from '../models/User.js'; 
// adminAuthMiddleware có thể không cần nếu chúng ta kiểm tra role trực tiếp trong route
// import adminAuthMiddleware from '../middleware/adminAuth.js'; 

const router = express.Router();

// === POST /api/exam-sessions - Lưu một phiên làm bài mới ===
// (Giữ nguyên như trước)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      examId, examMeta, selectedAnswers, score,
      totalQuestions, initialDuration,
    } = req.body;
    const userId = req.currentUser.id;

    if (!examId || selectedAnswers === undefined || score === undefined || totalQuestions === undefined || initialDuration === undefined) {
      return res.status(400).json({ message: 'Thiếu các trường thông tin bắt buộc.' });
    }

    const newExamSession = new ExamSession({
      userId, examId, examMeta: examMeta || {},
      selectedAnswers, score, totalQuestions, initialDuration,
      submittedAt: new Date(),
    });

    await newExamSession.save();
    res.status(201).json({ message: 'Lưu kết quả bài làm thành công.', session: newExamSession });

  } catch (error) {
    console.error("Error in POST /exam-sessions:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Lỗi dữ liệu đầu vào.", details: error.errors });
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi lưu bài làm.', details: error.message });
  }
});

// === GET /api/exam-sessions - Lấy lịch sử làm bài ===
// - User thường: Chỉ lấy các bài của chính họ.
// - Admin: Có thể lấy tất cả bài hoặc filter theo userId, examId.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.currentUser.id;
    const currentUserRole = req.currentUser.role; // Đảm bảo authMiddleware trả về role

    let queryConditions = {};

    // Xác định điều kiện truy vấn dựa trên vai trò
    if (currentUserRole !== 'admin') {
      queryConditions = { userId: currentUserId }; // User thường chỉ thấy bài của mình
    } else {
      // Admin có thể filter theo userId nếu được cung cấp
      if (req.query.userId) {
        queryConditions = { userId: req.query.userId };
      }
      // Nếu không có req.query.userId, admin sẽ thấy của tất cả users (queryConditions = {})
    }

    // Filter theo examId nếu được cung cấp (áp dụng cho cả admin và user thường)
    if (req.query.examId) {
      queryConditions.examId = req.query.examId;
    }

    const page = parseInt(req.query.page ) || 1;
    const limit = parseInt(req.query.limit ) || 10;
    const skip = (page - 1) * limit;

    const sessions = await ExamSession.find(queryConditions)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'email name role'); // Lấy thêm thông tin user

    const totalSessions = await ExamSession.countDocuments(queryConditions);

    res.json({
      sessions,
      currentPage: page,
      totalPages: Math.ceil(totalSessions / limit),
      totalSessions,
    });
  } catch (error) {
    console.error("Error in GET /exam-sessions:", error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi lấy lịch sử làm bài.' });
  }
});

// === GET /api/exam-sessions/latest - Lấy bài làm mới nhất của người dùng hiện tại ===
// (Giữ nguyên như trước)
router.get('/latest', authMiddleware, async (req, res) => {
    try {
        const userId = req.currentUser.id;
        const latestSession = await ExamSession.findOne({ userId })
                                            .sort({ submittedAt: -1 })
                                            .populate('userId', 'email name role');
        if (!latestSession) {
            return res.status(404).json({ message: 'Không tìm thấy bài làm nào cho người dùng này.' });
        }
        res.json(latestSession);
    } catch (error) {
        console.error("Error in GET /exam-sessions/latest:", error);
        res.status(500).json({ message: 'Lỗi máy chủ khi lấy bài làm mới nhất.' });
    }
});


router.get('/distinct-exams', authMiddleware, async (req, res) => {
  if (!req.currentUser || req.currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Truy cập bị từ chối.' });
  }
  try {
      const distinctExamsWithStats = await ExamSession.aggregate([
          {
              $group: {
                  _id: "$examId", // Nhóm theo examId
                  examMeta: { $first: "$examMeta" }, // Lấy examMeta từ bản ghi đầu tiên
                  // Tạo một tập hợp các userId duy nhất cho mỗi examId
                  uniqueUserIds: { $addToSet: "$userId" } 
              }
          },
          {
              $project: { // Định hình lại output
                  examId: "$_id",
                  examMeta: 1,
                  totalCompletions: { $size: "$uniqueUserIds" }, // Tính tổng số userId duy nhất
                  _id: 0 // Loại bỏ _id mặc định của $group
              }
          },
          {
              $sort: { "examMeta.year": -1, "examMeta.description": 1 } // Sắp xếp (tùy chọn)
          }
      ]);
      res.json(distinctExamsWithStats);
  } catch (error) {
      console.error("Error in GET /exam-sessions/distinct-exams:", error);
      res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách đề thi và thống kê.', details: error.message });
  }
});


// === GET /exam-sessions/exam/:examId/participants - Lấy danh sách người dùng đã làm đề (ADMIN ONLY) ===
router.get('/exam/:examId/participants', authMiddleware, async (req, res) => {
  try {
    if (!req.currentUser || req.currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Truy cập bị từ chối.' });
    }
    const examIdParam = req.params.examId;

    const distinctUserObjectIds = await ExamSession.distinct('userId', { examId: examIdParam }).exec();

    if (distinctUserObjectIds.length === 0) {
      return res.json([]); 
    }

    // DÒNG GÂY LỖI NẾU User KHÔNG ĐƯỢC ĐỊNH NGHĨA ĐÚNG CÁCH
    const usersWhoTookExam = await User.find({ 
        '_id': { $in: distinctUserObjectIds } 
    }).select('email name _id'); 

    res.json(usersWhoTookExam.map(user => ({
        _id: user._id.toString(),
        email: user.email,
        name: user.name
    })));

  } catch (error) {
    console.error(`Error in GET /exam-sessions/exam/${req.params.examId}/participants:`, error);
    // Kiểm tra xem có phải lỗi do User is not defined không, mặc dù thường nó sẽ crash sớm hơn
    if (error instanceof ReferenceError && error.message.includes("User is not defined")) {
        return res.status(500).json({ message: 'Lỗi server: Model User chưa được định nghĩa đúng cách trong route.' });
    }
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách người tham gia.', details: error.message });
  }
});


// === GET /api/exam-sessions/:sessionId - Lấy chi tiết một bài làm theo ID ===
// (Giữ nguyên như trước)
router.get('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const session = await ExamSession.findById(req.params.sessionId)
                                   .populate('userId', 'email name role');
    if (!session) {
      return res.status(404).json({ message: 'Không tìm thấy bài làm.' });
    }
    if (session.userId._id.toString() !== req.currentUser.id && req.currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền xem bài làm này.' });
    }
    res.json(session);
  } catch (error) {
    console.error(`Error in GET /exam-sessions/${req.params.sessionId}:`, error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'ID bài làm không hợp lệ.' });
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi lấy chi tiết bài làm.' });
  }
});


// === DELETE /api/exam-sessions/:sessionId - Xóa một bài làm ===
// (Giữ nguyên như trước)
router.delete('/:sessionId', authMiddleware, async (req, res) => {
    try {
        const session = await ExamSession.findById(req.params.sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Không tìm thấy bài làm để xóa.' });
        }
        if (session.userId.toString() !== req.currentUser.id && req.currentUser.role !== 'admin') {
            return res.status(403).json({ message: 'Bạn không có quyền xóa bài làm này.' });
        }
        await ExamSession.findByIdAndDelete(req.params.sessionId);
        res.json({ message: 'Đã xóa bài làm thành công.' });
    } catch (error) {
        console.error(`Error in DELETE /exam-sessions/${req.params.sessionId}:`, error);
        if (error.kind === 'ObjectId') {
             return res.status(400).json({ message: 'ID bài làm không hợp lệ.' });
        }
        res.status(500).json({ message: 'Lỗi máy chủ khi xóa bài làm.' });
    }
});

export default router;