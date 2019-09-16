module.exports = {
  setting: {
    autoBlockByMaxClick: 2,
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
    isTargetGoogleSearch: true
  },
  Paging: {
    PAGE: 1,
    LIMIT: 10
  },
  trackingScript: `<script type="text/javascript" src="https://static-click.appnet.edu.vn/static/tracking.js?key={accountKey}"></script>`,
  retryCount:3
};
