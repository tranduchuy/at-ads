const request = require('request');

const getHTML = (uri) => {
  return new Promise((resolve) => {
    const options = {
      uri,
      method: 'GET',
      rejectUnauthorized: false
    };

    request(options, (err, httpResponse, body) => {
      if (err) {
        return resolve(null);
      }

      return resolve(body);
    });
  });
};

module.exports = {getHTML};
