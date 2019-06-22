const express = require('express');
const router = express.Router({});
const SearchController = require('../controller/user/SearchController');

router.get('', SearchController.search);
router.get('/url-redirect', SearchController.getUrlToRedirect);
router.post('/box', SearchController.filter);

module.exports = router;
