require('./config/def');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const rootRouter = require('./routes/root');
require('./models');

const HTTP_CODE = require('./config/http-code');

// config log4js
const log4js = require('log4js');
log4js.configure('./config/log4js.json');

const app = express();

app.use(cors());
// init socket

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(require('./middlewares/CheckToken'));

app.use('/', rootRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.json({
      status: HTTP_CODE.ERROR,
      message: err.message,
      data: {}
  });
});

// require('./hotfix')();
// require('./database/dump/create-lead-history-and-schedule');

module.exports = app;
