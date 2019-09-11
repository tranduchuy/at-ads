const moment = require('moment');

module.exports = {
  status: 1,
  expiredAt: {
    doesNotExpire: null,
    aMonth: moment().add(1, 'M').endOf('day'),
    threeMonths: moment().add(3, 'M').endOf('day'),
    sixMonths: moment().add(6, 'M').endOf('day'),
    aYear: moment().add(12, 'M').endOf('day'),
  },
  vipType: {
    notTheVip: 0,
    vipWithinAMonth: 1,
    vipWithinThreeMonths: 2,
    vipWithinSixMonths: 3,
    vipWithinAYear: 4
  }
};
