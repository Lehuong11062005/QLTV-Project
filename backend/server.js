require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db/dbConfig');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ----------------------------------------------------
// SỬA LỖI 1: Cấu hình CORS
// Tạm thời cho phép tất cả để Frontend trên Vercel gọi được.
// Sau này hoàn thiện sẽ khóa lại sau.
// ----------------------------------------------------
app.use(cors()); 
// Hoặc nếu muốn kỹ hơn thì dùng: app.use(cors({ origin: '*' }));

app.use(express.json());
app.use('/uploads', express.static('public/uploads'));

app.get('/', (req, res) => {
  res.send('✅ API server đang hoạt động! Truy cập /api/test để kiểm tra.');
});

app.use('/api', routes);

// ----------------------------------------------------
// SỬA LỖI 2: Tách việc chạy Server ra khỏi kết nối DB
// Mục đích: Để Render nhận diện server đã "Live" dù DB có lỗi
// ----------------------------------------------------

// 1. Cho Server chạy ngay lập tức
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại port ${PORT}`);
});

// 2. Kết nối Database chạy song song (hoặc sau đó)
connectDB()
  .then(() => console.log('✅ Đã kết nối Database thành công'))
  .catch((err) => console.log('❌ Lỗi kết nối Database (Đừng lo nếu chưa config env):', err));