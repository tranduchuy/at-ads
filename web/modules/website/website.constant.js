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
  },
  month: {
    aMonth: 1,
    threeMonths: 3,
    sixMonths: 6,
    aYear: 12
  },
  popupConfig: {
    "themeColor" : "#2196f3",
    "popupPosition": 2,
    "autoShowPopupRepeatTime": 0,
    "autoShowPopup": false,
		"supporter" : {
			"name" : "Nguyễn Thị A",
			"avatar" : "http://vaytienkhongthechap.net.vn/wp-content/uploads/2016/04/telephone_skills.jpg",
			"major" : "Hỗ trợ viên",
			"phone" : "0999999999"
		}
  }
};
