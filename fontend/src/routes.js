// src/routes.js
import { Routes, Route } from "react-router-dom";

// --- Admin Pages ---
import Dashboard from "./pages/page_admin/Dashboard";
import AdminBorrowOrders from "./pages/page_admin/AdminBorrowOrders";
import AdminBorrowReturn from "./pages/page_admin/AdminBorrowReturn"; 
import AdminReturnHistory from "./pages/page_admin/AdminReturnHistory"; 
import AdminFeedback from "./pages/page_admin/AdminFeedback";
import AdminPurchaseOrders from "./pages/page_admin/AdminPurchaseOrders";
import BookManagement from "./pages/page_admin/BookManagement";
import BookStatusManagement from "./pages/page_admin/BookStatusManagement";
import PaymentTransactions from "./pages/page_admin/PaymentTransactions";
import StaffManagement from "./pages/page_admin/StaffManagement";
import StatisticsAndReports from "./pages/page_admin/StatisticsAndReports";
import UserManagement from "./pages/page_admin/UserManagement";

// --- User Pages ---
import BookDetail from "./pages/page_user/BookDetail";
import Books from "./pages/page_user/Books";
import BorrowCart from "./pages/page_user/BorrowCart"; 
import BorrowHistory from "./pages/page_user/BorrowHistory";
import BorrowDetail from './pages/page_user/BorrowDetail'; 
import Checkout from "./pages/page_user/Checkout"; // Trang này đóng vai trò là Giỏ hàng mua
import Feedback from "./pages/page_user/Feedback";
import Login from "./pages/page_user/Login";
import Register from "./pages/page_user/Register";
import Profile from "./pages/page_user/Profile";
import ActivateAccount from './pages/page_user/ActivateAccount';
import ForgotPassword from './pages/page_user/ForgotPassword';
import ResetPassword from './pages/page_user/ResetPassword';
import OrderHistory from "./pages/page_user/OrderHistory";
import OrderDetail from "./pages/page_user/OrderDetail";
import UserPaymentPage from "./pages/page_user/UserPaymentPage";
import UserTransactionHistory from "./pages/page_user/UserTransactionHistory";

export default function AppRoutes() {
  return (
    <Routes>
      {/* ================================================= */}
      {/* 👤 USER ROUTES (Độc giả) */}
      {/* ================================================= */}
      
      {/* 1. Sách & Trang chủ */}
      <Route path="/" element={<Books />} />
      <Route path="/books" element={<Books />} />
      <Route path="/books/:id" element={<BookDetail />} />

      {/* 2. Mượn sách */}
      <Route path="/borrow-cart" element={<BorrowCart />} /> 
      <Route path="/borrow-history" element={<BorrowHistory />} /> 
      <Route path="/user/borrow-detail/:maMuon" element={<BorrowDetail />} />

      {/* 3. Mua sách & Đơn hàng */}
      {/* ⭐️ Đổi path thành /cart để khớp với Sidebar */}
      <Route path="/cart" element={<Checkout />} /> 
      <Route path="/checkout" element={<Checkout />} /> {/* Giữ lại backup */}
      
      {/* Lịch sử đơn hàng */}
      <Route path="/order-history" element={<OrderHistory />} />
      <Route path="/order-history/:maDH" element={<OrderDetail />} />
      
      {/* Alias dự phòng */}
      <Route path="/orders" element={<OrderHistory />} />

      {/* 4. Tài khoản & Tiện ích */}
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/activate" element={<ActivateAccount />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* 5. Thanh toán & Lịch sử giao dịch (⭐️ ĐÃ SỬA KHỚP VỚI SIDEBAR) */}
      <Route path="/user/payments" element={<UserPaymentPage />}/>
      <Route path="/user/history" element={<UserTransactionHistory />} />

      {/* ================================================= */}
      {/* 🛡️ ADMIN ROUTES (Quản lý) */}
      {/* ================================================= */}

      {/* Dashboard */}
      <Route path="/admin/dashboard" element={<Dashboard />} />
      
      {/* Quản lý Sách & Kho */}
      <Route path="/admin/books" element={<BookManagement />} />
      <Route path="/admin/book-status" element={<BookStatusManagement />} />

      {/* Quản lý Mượn - Trả */}
      <Route path="/admin/borrow-orders" element={<AdminBorrowOrders />} />
      <Route path="/admin/borrow-return" element={<AdminBorrowReturn />} />
      <Route path="/admin/return-history" element={<AdminReturnHistory />} />

      {/* Quản lý Đơn hàng Mua */}
      <Route path="/admin/purchase-orders" element={<AdminPurchaseOrders />} />

      {/* Quản lý Người dùng & Nhân viên */}
      <Route path="/admin/users" element={<UserManagement />} />
      <Route path="/admin/staff" element={<StaffManagement />} />

      {/* Báo cáo & Thanh toán */}
      <Route path="/admin/payments" element={<PaymentTransactions />} />
      <Route path="/admin/statistics" element={<StatisticsAndReports />} />
      <Route path="/admin/feedback" element={<AdminFeedback />} />
    </Routes>
  );
}