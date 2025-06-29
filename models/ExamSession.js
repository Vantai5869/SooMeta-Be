// models/ExamSession.js
import mongoose from "mongoose";

const examSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // Tham chiếu đến model User của bạn (đảm bảo tên model là 'user')
    required: true,
  },
  examId: { // ID của đề thi cụ thể mà người dùng đã làm
    type: String, // Hoặc Number, tùy thuộc vào cách bạn định danh đề thi
    required: true,
  },
  examMeta: { // Thông tin mô tả về đề thi cho dễ hiển thị
    description: { type: String },
    level: { type: String }, // Ví dụ: 'TOPIK I', 'TOPIK II'
    skill: { type: String }, // Ví dụ: '읽기', '듣기'
    year: { type: String },   // Ví dụ: 'Đề thi năm 2023 lần thứ 90'
  },
  selectedAnswers: { // Lưu các câu trả lời của người dùng
    type: mongoose.Schema.Types.Mixed, // Cho phép lưu object dạng { '1': 0, '2': 3 }
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  isSubmitted: { // Sẽ luôn là true khi lưu vào đây
    type: Boolean,
    default: true,
  },
  submittedAt: { // Thời điểm người dùng nộp bài
    type: Date,
    default: Date.now,
  },
  initialDuration: { // Thời gian làm bài gốc của đề thi (tính bằng giây)
    type: Number,
    required: true,
  },
  // Bạn có thể thêm các trường khác nếu cần
  // Ví dụ: thời gian làm bài thực tế của người dùng
  // timeTaken: { type: Number } // (tính bằng giây)
});

// Index để tối ưu truy vấn thường dùng
examSessionSchema.index({ userId: 1, submittedAt: -1 }); // Lấy các bài làm của user, sắp xếp theo thời gian mới nhất
examSessionSchema.index({ userId: 1, examId: 1 });

export default mongoose.model('ExamSession', examSessionSchema);