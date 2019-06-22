const express = require('express');
const router = express.Router();
const NewsController = require('../controller/user/NewsController');
router.get('/highlight', NewsController.highlight);
router.get('/latest', NewsController.latest);

module.exports = router;
