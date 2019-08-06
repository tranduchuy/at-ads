const uuidv4 = require('uuid/v4');

const attach_cookie = (path) => {
  return (req, res, next) => {
    console.log(req.cookies);
    const key = req.query.key;
    if (req.path === path && key) {
      if(!req.cookies.uuid){
        const uuid = uuidv4();
        res.cookie('uuid', uuid, {domain: '.appnet.edu.vn'});
      }
      res.cookie('key', key, {domain: '.appnet.edu.vn'});
    }
    next();
  }
};

module.exports = {
  attach_cookie
};
