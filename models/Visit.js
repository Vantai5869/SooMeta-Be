// models/Visit.js
import mongoose from "mongoose";

const visitSchema = new mongoose.Schema({
  // Thời điểm lượt truy cập đầu tiên trong ngày đó
  firstVisitAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  // Thời điểm lượt truy cập cuối cùng trong ngày đó
  lastVisitAt: {
    type: Date,
    default: Date.now, // Ban đầu giống firstVisitAt, sẽ được cập nhật sau
    required: true
  },
  // ID của người dùng đã đăng nhập (để xác định người dùng duy nhất)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    // Thêm index duy nhất cho user và ngày để đảm bảo chỉ có 1 bản ghi/user/ngày
    // Điều này sẽ được xử lý logic ở tầng ứng dụng, không cần index unique trực tiếp trên schema
  },
  // Đường dẫn URL mà người dùng truy cập lần cuối
  pagePath: {
    type: String,
    required: true, // Vẫn cần biết trang cuối cùng họ xem
    trim: true
  },
  // User Agent lần cuối
  userAgent: {
    type: String,
  }
}, {
  timestamps: false // Không dùng createdAt/updatedAt mặc định
});

// Thêm một index kết hợp để tìm kiếm nhanh theo user và ngày
// Điều này rất quan trọng để tối ưu hiệu suất khi tìm kiếm bản ghi để cập nhật
visitSchema.index({ user: 1, firstVisitAt: 1 });


export default mongoose.models.Visit || mongoose.model('Visit', visitSchema);