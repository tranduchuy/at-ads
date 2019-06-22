const config = require('config');
const mongoConfig = config.get('mongo');
const mongoose = require('mongoose');

module.exports = (callback) => {
  const connectDbStr = `mongodb://127.0.0.1:27017/atads`;

  mongoose.connect(connectDbStr, {useNewUrlParser: true}, function (err) {
    if (err) {
      throw err;
    } else {
      callback();
    }
  });
};
