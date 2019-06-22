const getList = {
  type: 'object',
  additionalProperties: true,
  properties: {
    status: {
      type: 'string',
      pattern: '\\d+'
    },
    campaignId: {
      type: 'string'
    },
    page: {
      type: 'string',
      pattern: '\\d+'
    },
    limit: {
      type: 'string',
      pattern: '\\d+'
    }
  },
  required: [],
  errorMessage: {
    properties: {
      status: 'Status should in enum: NEW, SOLD, RETURNED, FINISHED',
      campaignId: 'Campaign should be a string id',
      page: 'Page should be a number from 1,2,3...',
      limit: 'Limit should be a number'
    }
  }
};

module.exports = {
  LIST: getList
};
