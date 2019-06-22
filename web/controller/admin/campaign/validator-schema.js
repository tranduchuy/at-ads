const campaignTypeConstant = require('../../../constants/campaign-type');
const urlPattern = '^(?:(?:(?:https?|ftp):)?\\/\\/)(?:\\S+(?::\\S*)?@)?(?:(?!(?:10|127)(?:\\.\\d{1,3}){3})(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\\.(?:[a-z\u00a1-\uffff]{2,})))(?::\\d{2,5})?(?:[/?#]\\S*)?$'

const createSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    name: {
      type: 'string',
      minLength: 3
    },
    leadMinPrice: {
      type: 'number',
      minimum: 0
    },
    leadMaxPrice: {
      type: 'number'
    },
    downTime: {
      type: 'number',
      minimum: 5
    },
    downPriceStep: {
      type: 'number',
      minimum: 100000
    },
    campaignType: {
      enum: [campaignTypeConstant.PROJECT, campaignTypeConstant.LOCATION],
    },
    formality: {
      type: 'number'
    },
    type: {
      type: 'number'
    },
    city: {
      type: 'string'
    },
    district: {
      type: 'number'
    },
    projectId: {
      type: 'string'
    },
    domains: {
      type: 'array',
      items: {
        type: 'string',
        pattern: urlPattern,
        additionalProperties: true
      }
    },
    isPrivate: {
      type: 'boolean'
    },
    userId: {
      type: 'number'
    }
  },
  required: ['name', 'leadMinPrice', 'leadMaxPrice', 'downTime', 'downPriceStep', 'campaignType', 'formality', 'type', 'city', 'domains', 'isPrivate'],
  errorMessage: {
    properties: {
      domains: 'data.domain should be an array of valid domain'
    }
  }
};

const updateDomains = {
  type: 'object',
  properties: {
    domains: {
      type: 'array',
      items: {
        type: 'string',
        pattern: urlPattern
      }
    }
  },
  required: ['domains']
};

const updateInfoSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 3
    },
    leadMinPrice: {
      type: 'number',
      minimum: 0
    },
    leadMaxPrice: {
      type: 'number'
    },
    downTime: {
      type: 'number',
      minimum: 5
    },
    downPriceStep: {
      type: 'number',
      minimum: 100000
    },
    formality: {
      type: 'number'
    },
    type: {
      type: 'number'
    },
    city: {
      type: 'string'
    },
    district: {
      type: 'number'
    },
    projectId: {
      type: 'string'
    },
    domains: {
      type: 'array',
      items: {
        type: 'string',
        pattern: urlPattern
      }
    }
  },
  required: []
};

module.exports = {
  CREATE: createSchema,
  UPDATE_DOMAINS: updateDomains,
  UPDATE_INFO: updateInfoSchema
};
