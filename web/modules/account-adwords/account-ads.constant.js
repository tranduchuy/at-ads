const config = require('config');
const trackingScript = config.get('trackingScript')

module.exports = {
  connectType: {
    byId: 'GOOGLE_ADS_ID',
    byEmail: 'EMAIL'
  },
  setting: {
    autoBlockByMaxClick: 2,
    countMaxClickInHours: 24,
    autoRemoveBlocking: false,
    autoBlockWithAiAndBigData: true,
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
    sampleBlockingIp: '',
    maxIps: 400,
  },
  isConnected: false,
  campaignStatus: {
    ENABLED: 'Hoạt động',
    PAUSED: 'Tạm dừng',
    ISENABLED: true,
    ISDISABLED: false
  },
  ipsNumberForAutoBlackList: 100, 
  googleCampaignStatus: {
    ENABLED: 'ENABLED',
    IS_DISPLAY: 'DISPLAY',
    IS_SEARCH: 'SEARCH',
    IS_DISPLAY_SMART_CAMPAIGN: 'DISPLAY_SMART_CAMPAIGN',
    IS_SHOPPING: 'SHOPPING'
  },
  Paging: {
    PAGE: 1,
    LIMIT: 10
  },
  trackingScript: `<script type="text/javascript" src="${trackingScript}?key={accountKey}"></script>`,
  retryCount:3,
  positionBlockIp: {
    CUSTOM_BLACKLIST:'customBlackList',
    AUTO_BLACKLIST: 'autoBlackListIp',
    SAMPLE_BLACKLIST: 'sampleBlockingIp'
  },
  configStep: {
    CONNECT_GOOGLE_ADS: 1,
    ADD_CAMPAIGN: 2,
    ADD_WEBSITE: 3,
    ADD_TRACKING_FOR_WEBSITE: 4,
    SUCCESS: 5
  }
};
