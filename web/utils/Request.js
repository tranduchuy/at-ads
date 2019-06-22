// url, body, token
const request = require('request');
const HttpCode = require('../config/http-code');

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const _handleResponse = (resolve, reject, body) => {
  try {
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    if (body.status === HttpCode.ERROR) {
      return reject(new Error(body.messages[0]));
    } else {
      return resolve(body);
    }
  } catch (e) {
    return reject(new Error(`Cannot parse json. ${e.message}. Content: ${body}`));
  }

};

const get = (uri, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      uri,
      method: 'GET',
    };

    if (token && token.toString().trim() !== '') {
      options.headers = {
        ctoken: token
      }
    }

    request(options, (err, httpResponse, body) => {
      if (err) {
        return reject(err);
      }

      return _handleResponse(resolve, reject, body);
    });
  });
};

/**
 *
 * @param {string} uri
 * @param {Object} data
 * @param {string} token
 * @returns {Promise<any>}
 */
const post = (uri, data, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      uri,
      method: 'POST',
      json: data
    };

    if (token && token.toString().trim() !== '') {
      options.headers = {
        ctoken: token
      }
    }

    request(options, (err, httpResponse, body) => {
      if (err) {
        return reject(err);
      }

      return _handleResponse(resolve, reject, body);
    });
  });
};

const put = (uri, data, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      uri,
      method: 'PUT',
      json: data
    };

    if (token && token.toString().trim() !== '') {
      options.headers = {
        ctoken: token
      }
    }

    request(options, (err, httpResponse, body) => {
      if (err) {
        return reject(err);
      }

      return _handleResponse(resolve, reject, body);
    });
  });
};

const del = (uri, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      uri,
      method: 'DELETE',
    };

    if (token && token.toString().trim() !== '') {
      options.headers = {
        ctoken: token
      }
    }

    request(options, (err, httpResponse, body) => {
      if (err) {
        return reject(err);
      }

      return _handleResponse(resolve, reject, body);
    });
  });
};

const convertObjectToQueryString = (obj) => {
  const params = [];
  for(const key in obj) {
    if (obj.hasOwnProperty(key)) {
      params.push(`${key}=${obj[key]}`);
    }
  }

  return params.join('&');
};

module.exports = {get, post, put, del, convertObjectToQueryString};