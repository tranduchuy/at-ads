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
  GoogleCampaignStatus: {
    ENABLED: 'ENABLED'
  },
  trackingScript: `<script type="text/javascript" src="https://static-click.appnet.edu.vn/static/tracking.js?key={accountKey}"></script>`

};
