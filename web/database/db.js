const config = require('config');
const mongoConfig = config.get('mongo');
const mongoose = require('mongoose');
const SendGrid = require('../services/send-grid.service');
const SendGridConfig = config.get('SENDGRID');

module.exports = (callback) => {
  mongoose.connect(mongoConfig.uri, { useNewUrlParser: true }, async function (err) {
    if (err) {
      const title = 'Phần mềm của bạn đang gặp vấn đề.';
      const info  = {
        service: 'ConnectDB ERROR',
        error  : err
      };

      await SendGrid.sendErrorMessage(SendGridConfig.TO, title, 'hello', info);
      throw err;
    } else {
      callback();
    }
  });
};
