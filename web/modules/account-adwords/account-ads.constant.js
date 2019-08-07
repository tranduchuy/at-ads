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
      vietnammobile: false
    },
    sampleBlockingIp: ''
  },
  isConnected: false,
  GoogleCampaignStatus: {
    ENABLED: 'ENABLED'
  },
  trackingScript: `<script type="text/javascript" src="http://159.65.11.195:3001/static/tracking.js?key={accountKey}"></script>`

};
