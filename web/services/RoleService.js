const isAdmin = (user) => {
  return [global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(user.role) !== -1;
};

module.exports = {
  isAdmin
};