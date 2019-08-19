module.exports = {
  setting: {
    autoBlockByMaxClick: -1,
    autoRemoveBlocking: false,
    autoBlackListIp: [],
    autoBlackListIpRanges: false,
    customBlackList: [],
    mobileNetworks: {
      viettel: false,
      mobifone: false,
      vinafone: false,
      vietnammobile: false,
      fpt: false
    },
    sampleBlockingIp: ''
  },
  isConnected: false,
  campaignStatus: {
    ENABLED: 'Hoạt động',
    PAUSED: 'Tạm dừng',
    ISENABLED: true,
    ISDISABLED: false
  },
  googleCampaignStatus: {
    ENABLED: 'ENABLED',
    isTargetGoogleSearch: true
  },
  trackingScript: `<script type="text/javascript" src="https://static-click.appnet.edu.vn/static/tracking.js?key={accountKey}"></script>`

};
