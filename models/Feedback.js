// models/Feedback.js
import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user', // Hoặc 'user' tùy theo tên bạn đặt cho User model
    required: true 
  },
  feedbackText: { 
    type: String, 
    required: [true, "Nội dung phản hồi không được để trống."],
    trim: true,
    minlength: [10, "Phản hồi cần ít nhất 10 ký tự."],
    maxlength: [2000, "Phản hồi không được vượt quá 2000 ký tự."]
  },
  pageContext: { // URL hoặc mô tả trang mà người dùng đang phản hồi (tùy chọn)
    type: String,
    trim: true,
    maxlength: 200 
  },
  status: { // Trạng thái của phản hồi, ví dụ: new, seen, addressed, resolved
    type: String,
    enum: ['new', 'seen', 'in-progress', 'resolved', 'wont-fix'],
    default: 'new'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);