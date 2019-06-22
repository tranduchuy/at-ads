const TokenModel = require('../models/TokenModel');
const randomstring = require('randomstring');
const AccessToken = {
  generate: function (user) {
    const token = randomstring.generate(100) + new Date().getTime();

    TokenModel({
      token: token,
      user: user,
      date: new Date()
    }).save();

    return token;
  }
};

module.exports = AccessToken;
