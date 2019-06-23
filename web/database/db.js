const config = require('config');
const mongoConfig = config.get('mongo');
const mongoose = require('mongoose');

module.exports = (callback) => {
  mongoose.connect(mongoConfig.uri, { useNewUrlParser: true }, function (err) {
    if (err) {
      throw err;
    } else {
      callback();
    }
  });
};
