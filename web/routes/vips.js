var express = require('express');
var router = express.Router();

var PostPriorityController = require('../controller/user/PostPriorityController');



router.get('/list', PostPriorityController.list);
router.get('/price', PostPriorityController.price);


module.exports = router;
