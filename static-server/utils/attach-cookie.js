const uuidv4 = require('uuid/v4');
const config = require('config');

const attach_cookie = (path) => {
  return (req, res, next) => {
    console.log(req.cookies);
    const key = req.query.key;
    if (req.path === path && key) {
      if(!req.cookies.uuid){
        const uuid = uuidv4();
        res.cookie('uuid', uuid, {domain: config.get('parentDomain')});
      }
      res.cookie('key', key, {domain: config.get('parentDomain')});
    }
    next();
  }
};

module.exports = {
  attach_cookie
};
