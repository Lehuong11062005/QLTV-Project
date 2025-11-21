require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db/dbConfig');  // ⬅️ Sửa đúng tại đây
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static('public/uploads'));

app.get('/', (req, res) => {
  res.send('✅ API server đang hoạt động! Truy cập /api/test để kiểm tra.');
});

app.use('/api', routes);

connectDB().then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`)
  );
});
