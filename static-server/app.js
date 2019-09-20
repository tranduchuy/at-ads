const { attach_cookie } = require('./utils/attach-cookie');
const stringReplace = require('string-replace-middleware');
const cookieParser = require('cookie-parser');
const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const config = require('config');

app.use(cors());
app.use(cookieParser());

// attach uuid
app.use(attach_cookie('/static/tracking.js'));


app.use(stringReplace({
	'{{hostApi}}': config.get('hostApi'),
}));
// Serving static files
app.use('/static', express.static(path.join(__dirname, 'public')));

module.exports = app;
