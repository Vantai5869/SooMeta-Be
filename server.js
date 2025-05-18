// server.js (hoặc app.js)

import cors from "cors";
import mongoose from "mongoose";
import "dotenv/config";
import express from "express";
import http from 'http'; // Thêm import http
import { Server as SocketIOServer } from 'socket.io'; // Import Server từ socket.io

import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import transcriptionRoutes from './routes/transcriptionRoutes.js';
import uploadFileToCloudRoutes from './routes/uploadFileToCloudRoutes.js';
// import { AssemblyAI } from 'assemblyai'; // Bỏ comment nếu bạn dùng AssemblyAI ở đây
import nodemailer from 'nodemailer';

// Import hàm xử lý Socket.IO từ tệp riêng
import initializeSocketIO from './socketHandlers.js';

// const client = new AssemblyAI({ // Bỏ comment nếu bạn dùng AssemblyAI ở đây
//   apiKey: '674d42163f3a448ea246cc6b877a4eac', // Cẩn thận với API key, nên dùng biến môi trường
// });

const app = express();
app.use(cors()); // Cân nhắc cấu hình CORS chặt chẽ hơn cho production
app.use(express.json());

// Tạo HTTP server từ Express app
const httpServer = http.createServer(app);

// Khởi tạo Socket.IO server và gắn vào HTTP server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*", // CHỈNH SỬA CHO PHÙ HỢP VỚI PRODUCTION (ví dụ: "https://your-admin-domain.com")
    methods: ["GET", "POST"]
  }
});

// Gọi hàm để thiết lập các trình xử lý sự kiện Socket.IO
initializeSocketIO(io);

// Các routes API của bạn
app.use('/users', userRoutes);
app.use('/upload', uploadRoutes);
app.use('/transcriptions', transcriptionRoutes);
app.use('/upload-file-cloud', uploadFileToCloudRoutes);

app.post('/send-mail', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: 'Email và mã xác nhận là bắt buộc!' });
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  const mailOptions = {
    from: `"SooMeta Team" <${process.env.EMAIL}>`,
    to: email,
    subject: 'Xác nhận tài khoản từ SooMeta',
    html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                .header { text-align: center; margin-bottom: 20px; }
                .header img { max-width: 150px; } /* Thêm logo nếu có */
                .code { color: #0055ff; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; padding: 10px; background-color: #f0f8ff; border-radius: 5px;}
                .footer { font-size: 12px; color: #777; margin-top: 20px; text-align: center; }
                a { color: #0055ff; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Xác nhận tài khoản SooMeta</h2>
                </div>
                <p>Xin chào,</p>
                <p>Cảm ơn bạn đã đăng ký/sử dụng dịch vụ của SooMeta. Mã xác nhận của bạn là:</p>
                <p class="code">${code}</p>
                <p>Mã này có hiệu lực trong vòng 10 phút. Vui lòng nhập mã này vào ứng dụng hoặc trang web của chúng tôi để tiếp tục.</p>
                <p>Nếu bạn không yêu cầu mã này, xin vui lòng bỏ qua email này hoặc liên hệ với bộ phận hỗ trợ của chúng tôi tại <a href="mailto:soomain.tp@gmail.com">soomain.tp@gmail.com</a>.</p>
                <div class="footer">
                    <p>Trân trọng,<br>Đội ngũ SooMeta</p>
                    <p>© ${new Date().getFullYear()} SooMeta. Mọi quyền được bảo lưu.</p>
                </div>
            </div>
        </body>
        </html>
    `,
    text: `Xin chào,\n\nCảm ơn bạn đã sử dụng dịch vụ của SooMeta. Mã xác nhận của bạn là: ${code}\n\nMã này có hiệu lực trong vòng 10 phút. Vui lòng nhập mã vào ứng dụng hoặc trang web của chúng tôi để tiếp tục.\n\nNếu bạn không yêu cầu mã này, xin vui lòng bỏ qua email này hoặc liên hệ với chúng tôi tại soomain.tp@gmail.com.\n\nTrân trọng,\nĐội ngũ SooMeta\n© ${new Date().getFullYear()} SooMeta. Mọi quyền được bảo lưu.`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    res.json({ status: 200, message: 'Email đã được gửi!', infoId: info.messageId });
  } catch (error) {
    console.error("Lỗi gửi mail:", error);
    res.status(500).json({ status: 500, message: 'Email không thể gửi!', error: error.message });
  }
});

const URI = process.env.MONGODB_URL;
const connectDB = async () => {
  try {
    await mongoose.connect(URI, {
      // Các tùy chọn useNewUrlParser và useUnifiedTopology không còn cần thiết từ Mongoose v6
      // useNewUrlParser: true,
      // useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => { // Sử dụng httpServer để lắng nghe
  console.log(`Server (HTTP and WebSocket) is running on port ${PORT}`);
});
