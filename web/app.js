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
const whitelist = [
  'http://localhost:4200',
  'http://192.168.1.133:4200',
  'http://click.appnet.edu.vn',
  'https://baohanhnguyenkim.com/',
  'http://baohanhnguyenkim.com/',
  'https://hecta.vn'
];
const corsOptionsDelegate = function (req, callback) {
  let corsOptions;
  if (whitelist.indexOf(req.header('Origin')) !== -1) {
    corsOptions = { origin: true, credentials: true } // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false } // disable CORS for this request
  }
  callback(null, corsOptions) // callback expects two parameters: error and options
};
app.use(cors(corsOptionsDelegate));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/api', require('./routes'));

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
