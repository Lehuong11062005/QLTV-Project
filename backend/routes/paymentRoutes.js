// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware"); // Import correctly

// --- PUBLIC ROUTES ---
// Callbacks from MoMo do not have your JWT, so they must remain public (or use MoMo signature verification)
router.post('/create-url', authenticateToken, authorizeRoles(['DocGia']), paymentController.createPaymentUrl); // Only logged in users pay
router.post('/momo-ipn', paymentController.handleMomoCallback); // Must be public for MoMo server

// --- ADMIN ROUTES ---
router.get('/history', authenticateToken, authorizeRoles(['Admin', 'ThuThu']), paymentController.getTransactionList);
router.put('/update-status', authenticateToken, authorizeRoles(['Admin', 'ThuThu']), paymentController.updateTransactionStatus);

// --- USER ROUTES ---
router.get('/my-history', authenticateToken, authorizeRoles(['DocGia']), paymentController.getMyTransactions);

module.exports = router;