// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true, // Thêm trim để loại bỏ khoảng trắng thừa
    lowercase: true // Thêm lowercase để đảm bảo tính nhất quán
  },
  name: { // Thêm trường tên hiển thị (tùy chọn)
    type: String,
    trim: true,
    default: '' 
  },
  deviceId: { 
    type: String, 
    required: true 
  },
  platform: { 
    type: String, 
    enum: ['iOS', 'Android','WEB'], 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], // Giờ đây role chỉ có thể là 'user' hoặc 'admin'
    default: 'user' 
  },
  subscriptionTier: { // Trường mới để phân biệt user thường và premium
    type: String,
    enum: ['nomo', 'premium', null], // Cho phép null nếu role là admin hoặc không áp dụng
    default: function() {
      // Chỉ đặt default 'nomo' nếu role là 'user' và chưa có giá trị
      // Tuy nhiên, Mongoose default chỉ hoạt động khi tạo mới.
      // Logic này phức tạp hơn nếu dùng default function.
      // Để đơn giản, ta có thể để default là 'nomo' và xử lý ở tầng ứng dụng.
      // Hoặc nếu user được tạo mới với role 'user', tier sẽ là 'nomo'.
      // Nếu là admin, trường này có thể không cần thiết hoặc là null.
      return this.role === 'user' ? 'nomo' : null;
    }
    // default: 'nomo', // Cách đơn giản hơn là mặc định nomo, admin sẽ không dùng trường này.
  },
  premiumExpiresAt: { // Ngày hết hạn của gói premium (tùy chọn)
    type: Date,
    default: null 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  lastLogin: { 
    type: Date, 
    default: null 
  }
});

// Middleware pre-save để đảm bảo subscriptionTier chỉ được đặt cho role 'user'
// và là 'nomo' nếu không có giá trị nào được cung cấp cho user mới.
userSchema.pre('save', function(next) {
  if (this.role === 'user') {
    if (!this.subscriptionTier) { // Nếu user mới hoặc tier chưa được đặt
      this.subscriptionTier = 'nomo';
    }
  } else if (this.role === 'admin') {
    this.subscriptionTier = null; // Admin không có tier, hoặc bạn có thể bỏ qua việc set nó
    this.premiumExpiresAt = null;
  }
  next();
});


// Đảm bảo bạn giữ nguyên tên model là 'user' (viết thường) nếu các ref khác đang dùng tên này
export default mongoose.models.user || mongoose.model('user', userSchema);