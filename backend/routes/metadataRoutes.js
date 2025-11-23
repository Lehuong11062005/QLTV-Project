const express = require('express');
const router = express.Router();
const metadataController = require('../controllers/metadataController');

// Chỉ có 2 route POST để thêm mới
router.post('/author', metadataController.createAuthor);
router.post('/category', metadataController.createCategory);

module.exports = router;