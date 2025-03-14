import { Router } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary-config.js';

const router = Router();

// Cấu hình multer storage để lưu tệp trực tiếp lên Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads',  // Tên thư mục lưu trữ trong Cloudinary
    allowed_formats: ['mp3', 'wav', 'flac'], // Các định dạng âm thanh được phép upload
  }
});

// Tạo instance của multer với storage
const upload = multer({ storage: storage });

// Route upload tệp lên Cloudinary
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: 'Không có tệp nào được chọn!' });
    }

    // Tệp đã được upload thành công lên Cloudinary
    const fileUrl = req.file.path;  // URL của tệp đã upload lên Cloudinary
    const fileName = req.file.originalname; // Tên file gốc

    // Lấy thêm thông tin về tệp như duration từ Cloudinary API
    const fileInfo = await cloudinary.api.resource(req.file.public_id);

    // Lấy thông tin như duration và title
    const fileDuration = fileInfo.duration;  // Thời gian của file âm thanh
    const fileTitle = fileInfo.original_filename;  // Tên của file (title)

    res.status(200).send({
      message: 'Tệp đã được tải lên Cloudinary thành công!',
      url: fileUrl,
      title: fileTitle,
      duration: fileDuration,
    });
  } catch (error) {
    console.error('Error uploading file: ', error);
    res.status(500).send({ error: 'Có lỗi xảy ra khi tải tệp lên Cloudinary!' });
  }
});

export default router;
