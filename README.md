📚 Hệ Thống Quản Lý Thư Viện (QLTV Project)

Dự án QLTV-Project là một ứng dụng quản lý thư viện hiện đại, hỗ trợ quản lý kho sách, quy trình mượn/trả, quản lý người dùng và tích hợp thanh toán trực tuyến.



🌟 Tính năng chính

👤 Dành cho Độc giả (User)


Tìm kiếm & Xem sách: Tra cứu danh sách sách theo tên, tác giả hoặc thể loại.

Quản lý Giỏ sách: Thêm sách vào giỏ để đăng ký mượn hoặc mua.

Mượn/Trả sách: Gửi yêu cầu mượn sách và theo dõi lịch sử trả sách.

Thanh toán: Tích hợp thanh toán qua QR Bank hoặc ví điện tử (Momo).

Cá nhân: Quản lý hồ sơ, đổi mật khẩu và xem lịch sử giao dịch.

Phản hồi: Gửi đánh giá và góp ý về dịch vụ thư viện.



🛡️ Dành cho Quản trị viên (Admin)


Dashboard: Thống kê tổng quan về doanh thu, số lượng sách và lượt mượn.

Quản lý Sách: Thêm, sửa, xóa thông tin sách; cập nhật tình trạng sách (mới/cũ/hỏng).

Duyệt Đơn: Xử lý các yêu cầu mượn sách và xác nhận đơn hàng mua sách.

Quản lý Nhân sự: Quản lý tài khoản nhân viên và người dùng hệ thống.

Báo cáo & Thống kê: Xuất báo cáo chi tiết về hoạt động thư viện.



🏗️ Kiến trúc kỹ thuật

Backend (Node.js & Express)

Ngôn ngữ: JavaScript (Node.js).

Cơ sở dữ liệu: Microsoft SQL Server (MSSQL).

Xác thực: JWT (JSON Web Token) cho phiên làm việc và Bcryptjs để mã hóa mật khẩu.

Middleware: Xử lý phân quyền Admin và kiểm tra token truy cập.

Tiện ích: * Multer & Cloudinary: Xử lý và lưu trữ hình ảnh bìa sách.

Nodemailer: Gửi email xác nhận, kích hoạt tài khoản.


Frontend (ReactJS)


Framework: React v19 với react-router-dom v7 để điều hướng.

Giao diện: Tailwind CSS cho thiết kế responsive và hiện đại.

Quản lý API: Axios được cấu hình để giao tiếp đồng bộ với Backend.

Công cụ: react-app-rewired để tối ưu hóa cấu hình build.

📂 Cấu trúc thư mục
Plaintext
QLTV-Project/

├── backend/                # Mã nguồn máy chủ (API)

│   ├── config/             # Cấu hình Cloudinary, Email

│   ├── controllers/        # Xử lý logic nghiệp vụ

│   ├── db/                 # Kết nối MSSQL & Scripts Migration

│   ├── middleware/         # Kiểm tra quyền & Token

│   ├── routes/             # Định nghĩa các endpoint API

│   └── server.js           # Điểm khởi đầu của Backend

├── fontend/                # Mã nguồn giao diện (UI)

│   ├── public/             # Tài sản tĩnh (index.html, icons)

│   ├── src/

│   │   ├── components/     # Các thành phần giao diện dùng chung

│   │   ├── pages/          # Giao diện Admin và User riêng biệt

│   │   ├── services/       # Gọi API (Auth, Book, Order...)

│   │   └── routes.js       # Cấu hình định tuyến ứng dụng

└── package.json            # Cấu hình chung của Root dự án





🛠 Hướng dẫn cài đặt chi tiết

Bước 1: Clone dự án

git clone https://github.com/lehuong11062005/qltv-project.git
cd qltv-project

Bước 2: Thiết lập Backend
Di chuyển vào thư mục backend:

cd backend
npm install

Tạo tệp .env trong thư mục backend và điền cấu hình:

PORT=5000
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_SERVER=your_server_name
DB_DATABASE=QLTV
JWT_SECRET=your_secret_key
CLOUDINARY_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

Chạy script SQL trong backend/db/migrations/QLTV.sql vào SQL Server của bạn.

Bước 3: Thiết lập Frontend
Mở terminal mới và di chuyển vào thư mục frontend:

cd fontend
npm install

Cấu hình URL API trong src/services/api.js (mặc định thường là http://localhost:5000/api).

🚀 Khởi chạy ứng dụng
Khởi động Backend:

cd backend
npm start

Server sẽ chạy tại: http://localhost:5000


Khởi động Frontend:

cd fontend
npm start

Giao diện sẽ chạy tại: http://localhost:3000



📝 Giấy phép
Dự án được phát triển cho mục đích học tập. Vui lòng ghi rõ nguồn khi sử dụng.
