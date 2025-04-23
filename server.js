import cors from "cors";
import mongoose from "mongoose";
import "dotenv/config";
import express from "express";
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import transcriptionRoutes from './routes/transcriptionRoutes.js';
import uploadFileToCloudRoutes from './routes/uploadFileToCloudRoutes.js';
import { AssemblyAI } from 'assemblyai';
import nodemailer from 'nodemailer';

const client = new AssemblyAI({
  apiKey: '674d42163f3a448ea246cc6b877a4eac',
});

const app = express();
app.use(cors());
app.use(express.json());

app.use('/users', userRoutes);
app.use('/upload', uploadRoutes);
app.use('/transcriptions', transcriptionRoutes);
app.use('/upload-file-cloud', uploadFileToCloudRoutes);
app.post('/send-mail', async (req, res) => {
  const { email, code } = req.body; // Lấy email từ body của yêu cầu

  if (!email || !code) {
    return res.status(400).json({ message: 'Email và mã xác nhận là bắt buộc!' });
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  // Cấu hình email
  const mailOptions = {
    from: `"SooMeta Team" <${process.env.EMAIL}>`, // Thêm tên người gửi để tăng độ tin cậy
    to: email,
    subject: 'Xác nhận tài khoản từ SooMeta', // Chủ đề rõ ràng, tránh từ như "Xin chào"
    html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .code { color: #0055ff; font-size: 24px; font-weight: bold; }
                .footer { font-size: 12px; color: #777; margin-top: 20px; }
                a { color: #0055ff; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Xin chào,</h2>
                <p>Cảm ơn bạn đã sử dụng dịch vụ của SooMeta. Dưới đây là mã xác nhận để hoàn tất quá trình đăng ký hoặc đăng nhập:</p>
                <p class="code">${code}</p>
                <p>Mã này có hiệu lực trong vòng 10 phút. Vui lòng nhập mã vào ứng dụng hoặc trang web của chúng tôi để tiếp tục.</p>
                <p>Nếu bạn không yêu cầu mã này, xin vui lòng bỏ qua email này hoặc liên hệ với chúng tôi tại <a href="mailto:soomain.tp@gmail.com">soomain.tp@gmail.com</a>.</p>
                <div class="footer">
                    <p>Trân trọng,<br>Đội ngũ SooMeta</p>
                    <p>© 2025 SooMeta. Mọi quyền được bảo lưu.</p>
                </div>
            </div>
        </body>
        </html>
    `,
    text: `Xin chào,\n\nCảm ơn bạn đã sử dụng dịch vụ của SooMeta. Mã xác nhận của bạn là: ${code}\n\nMã này có hiệu lực trong vòng 10 phút. Vui lòng nhập mã vào ứng dụng hoặc trang web của chúng tôi để tiếp tục.\n\nNếu bạn không yêu cầu mã này, xin vui lòng bỏ qua email này hoặc liên hệ với chúng tôi tại soomain.tp@gmail.com.\n\nTrân trọng,\nĐội ngũ SooMeta\n© 2025 SooMeta. Mọi quyền được bảo lưu.` // Thêm phiên bản text để tăng khả năng tương thích
};

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      res.json({ status: 500, message: 'Email không thể gửi!', error });
    } else {
      res.json({ status: 200, message: 'Email đã được gửi!', info });
    }
  });
})

const URI = process.env.MONGODB_URL;
const connectDB = async () => {
  try {
    await mongoose.connect(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

app.listen(process.env.PORT || 3000, () => {
  console.log("Server is running on port 3000");
});