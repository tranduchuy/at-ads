const { attach_cookie } = require('./utils/attach-cookie');

require('./config/def');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const HttpStatus = require('http-status-codes');
const fs = require('fs');


// create logs folder
if (!fs.existsSync('./logs')) {
  fs.mkdirSync('./logs');
}
// config log4js
const log4js = require('log4js');
log4js.configure('./config/log4js.json');
const loggerApp = log4js.getLogger('app');

const app = express();

app.use(cors());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/api', require('./routes'));


// attach uuid
app.use(attach_cookie('/static/tracking.js'));

// Serving static files
app.use('/static', express.static(path.join(__dirname, 'public')));


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  const msg = err.message ? err.message : JSON.stringify(err);

  loggerApp.error('app::error ', err);

  return res
    .status(HttpStatus.BAD_REQUEST)
    .json({
      messages: [msg]
    });
});

module.exports = app;
