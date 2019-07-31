const { attach_cookie } = require('./utils/attach-cookie');

const cookieParser = require('cookie-parser');

const express = require('express');
const path = require('path');

const cors = require('cors');

const app = express();

app.use(cors());
app.use(cookieParser());

// attach uuid
app.use(attach_cookie('/static/tracking.js'));

// Serving static files
app.use('/static', express.static(path.join(__dirname, 'public')));

module.exports = app;
