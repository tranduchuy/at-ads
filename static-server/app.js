const { attach_cookie } = require('./utils/attach-cookie');
const stringReplace = require('string-replace-middleware');
const cookieParser = require('cookie-parser');
const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const config = require('config');
const fs = require('fs');
const ejs = require('ejs');

app.use(cors());
app.use(cookieParser());

// attach uuid
app.use(attach_cookie('/static/tracking.js'));

app.use('/static/tracking.js', function (req, res) {
	var f = ejs.compile(fs.readFileSync('./public/tracking.js').toString('utf8'));
	var fileContent = f({ hostApi: config.get('hostApi') });
	res.setHeader('Content-Type', 'application/javascript');
	res.setHeader('Content-Length', fileContent.length);
	res.send(fileContent);
});

// Serving static files
// app.use('/static', express.static(path.join(__dirname, 'public')));

module.exports = app;
