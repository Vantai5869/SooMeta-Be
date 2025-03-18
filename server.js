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
app.get('/send-mail', async (req, res) => {
  const { email, code } = req.body; // Lấy email từ body của yêu cầu

  if (!email || !code) {
    return res.status(400).json({ message: 'Email và mã xác nhận là bắt buộc!' });
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  // Cấu hình email
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'Xin chào từ SooMeta',
    html: `
        <h1>Xin chào từ SooMeta</h1>
<p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi. Mã xác nhận của bạn là:</p>
<h2 style="color: blue;">${code}</h2>
<p>Vui lòng sử dụng mã này trong vòng 10 phút để hoàn tất quá trình xác nhận.</p>
<p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
<hr>
<footer>
  <p>© 2025 SooMeta. Địa chỉ: 123 Đường ABC, TP. HCM.</p>
  <p>Liên hệ: soomain.tp@gmail.com</p>
</footer>
      `, // Sử dụng HTML để hiển thị mã xác nhận
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

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});