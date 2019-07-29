const uuidv4 = require('uuid/v4');

const attach_cookie = (url) => {
  return (req, res, next) => {
    if (req.url == url) {
      const uuid = uuidv4();
      res.cookie('uuid', uuid);
    }
    next();
  }
};

module.exports = {
  attach_cookie
};
