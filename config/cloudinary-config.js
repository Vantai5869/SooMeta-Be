import { v2 as cloudinary } from 'cloudinary';

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: 'dueyjeqd5',  // Thay bằng tên Cloud của bạn
  api_key: '561595587471163',  // Thay bằng API Key của bạn
  api_secret: '78Uz9arowByOL-xM6lx57Ing1oP'  // Thay bằng API Secret của bạn
});

export default cloudinary;
