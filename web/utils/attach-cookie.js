const uuidv4 = require('uuid/v4');

const attach_cookie = (path) => {
  return (req, res, next) => {
    const key = req.query.key;
    if (req.path === path && key) {
      const uuid = uuidv4();
      res.cookie('uuid', uuid);
      res.cookie('key', key);
    }
    next();
  }
};

module.exports = {
  attach_cookie
};