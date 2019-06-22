var express = require('express');
var router = express.Router();

var ProjectController = require('../controller/user/ProjectController');



// router.get('/list', ProjectController.list);
router.get('/highlight', ProjectController.highlight);
// router.post('/update/:id', ProjectController.update);


module.exports = router;
