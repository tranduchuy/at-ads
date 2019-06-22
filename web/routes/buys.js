const express = require('express');
const router = express.Router();
const BuyController = require('../controller/user/BuyController');

router['post']('/add', BuyController.add);
router['post']('/update/:id', BuyController.update);

module.exports = router;
