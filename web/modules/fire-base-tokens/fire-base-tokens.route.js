const express = require('express');
const router = express.Router({});
const FireBaseTokensController = require('./fire-base-tokens.controller');

router.post('/', FireBaseTokensController.addFireBaseToken);

module.exports = router;
