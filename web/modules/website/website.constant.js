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
    themeColor : "#2196f3",
    popupPosition: 2,
    autoShowPopupRepeatTime: 0,
    autoShowPopup: false,
		supporter : {
			name : "Nguyễn Thị A",
			avatar : "//w.cokhach.com/assets/images/background/popup-bg-11.jpg",
			major : "Hỗ trợ viên",
			phone : "0999999999"
		}
  },
  fakeCustomerConfig: {
    isEnabled: false,
    runningDevices: [1, 2, 3],    // 1. Desktop, 2. Mobile, 3. Tablet
    positionOnPage: 2,            // 1. Bottom left, 2. Bottom right, 3. Top left, 4. Top right
    autoDisplayTime: [10, 90],          // Seconds in [10, 90]
    avatarType: 1,
    title: 'Mới mua hàng!',
    body: 'Khách hàng #fake_email vừa mới mua hàng thành công!',
    pageUrl: 'https://x2.com.vn',
    themeColor: '#039be5',
    shape: 1         
  }
};
