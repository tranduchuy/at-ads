module.exports = {
  ctrl: require('./user.controller'),
  adminCtrl: require('./admin-user.controller'),
  route: require('./user.route'),
  adminRoute: require('./admin-user.route'),
  service: require('./user.service'),
  const: require('./user.constant')
};