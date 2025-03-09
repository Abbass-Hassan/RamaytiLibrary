const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

router.get('/pdf', searchController.searchPdf);
router.get('/global-multi', searchController.searchGlobalMulti);

module.exports = router;