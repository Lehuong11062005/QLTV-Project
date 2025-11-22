// config/cloudinaryConfig.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: 'dpep148gh', // Đăng ký tk Cloudinary để lấy
  api_key: '118833866364937',
  api_secret: 'gKP-McD48udsknFoBURiH5dvYlQ'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'QLTV_Books', // Tên thư mục trên Cloud
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage: storage });

module.exports = upload;