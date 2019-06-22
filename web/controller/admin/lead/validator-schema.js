const directionList = require('../../../config/selector').directionList;

const statusEnum = [
  global.STATUS.LEAD_NEW,
  global.STATUS.LEAD_FINISHED,
  global.STATUS.LEAD_RETURNING,
  global.STATUS.LEAD_SOLD,
  global.STATUS.DELETE
];
const directionEnum = directionList
  .slice(0)
  .map(d => d.value);

const getList = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      pattern: '\\d+'
    },
    campaignId: {
      type: 'string'
    },
    phone: {
      type: 'string',
      pattern: '\\d+',
      minLength: 10,
      maxLength: 12
    },
    page: {
      type: 'string',
      pattern: '\\d+'
    },
    limit: {
      type: 'string',
      pattern: '\\d+'
    },
    status: {
      enum: statusEnum.map(s => s.toString())
    }
  },
  required: [],
  errorMessage: {
    properties: {
      campaignId: 'Campaign id should be string id mongo',
      projectId: 'Project id should be string id mongo',
      page: 'Page should be number from 1,2,3...',
      limit: 'Limit should be number',
      status: 'Status must be in enum ' + statusEnum.join(',')
    }
  }
};

const updateStatus = {
  type: 'object',
  properties: {
    status: {
      enum: statusEnum
    }
  },
  required: ['status']
};

const updateInfo = {
  type: 'object',
  properties: {
    name: {
      type: 'string'
    },
    email: {
      format: 'email'
    },
    bedrooms: {
      type: 'number',
      minimum: 1
    },
    bathrooms: {
      type: 'number',
      minimum: 1
    },
    area: {
      type: 'number',
      minimum: 0
    },
    price: {
      type: 'number',
      minimum: 0
    },
    street: {
      type: 'string'
    },
    direction: {
      enum: directionEnum // get from selector
    },
    note: {
      type: 'string'
    }
  },
  required: [],
  errorMessage: {
    properties: {
      email: 'Email is wrong format',
      bedrooms: 'Bedrooms should be a number',
      bathrooms: 'Bathrooms should be a number',
      area: 'Area should be a number',
      price: 'Price should be a number',
      direction: `Direction should be in enum ${directionEnum.join(', ')}`
    }
  }
};

const create = {
  type: 'object',
  properties: {
    phone: {
      type: 'string',
      pattern: '\\d+',
      minLength: 10,
      maxLength: 12
    },
    name: {
      type: 'string'
    },
    campaignId: {
      type: 'string',
      minLength: 24,
      maxLength: 24
    },
    email: {
      format: 'email'
    },
    bedrooms: {
      type: 'number',
      minimum: 1
    },
    bathrooms: {
      type: 'number',
      minimum: 1
    },
    area: {
      type: 'number',
      minimum: 0
    },
    price: {
      type: 'number',
      minimum: 0
    },
    street: {
      type: 'string'
    },
    direction: {
      enum: directionEnum // get from selector
    },
    note: {
      type: 'string'
    }
  },
  required: ['phone', 'name', 'campaignId'],
  errorMessage: {
    properties: {
      phone: 'Phone is required should be string number with 10-12 characters',
      name: 'Name is required',
      campaignId: 'Campaign id is required and should be string of mongo',
      email: 'Email is wrong format',
      bedrooms: 'Bedrooms should be a number',
      bathrooms: 'Bathrooms should be a number',
      area: 'Area should be a number',
      price: 'Price should be a number',
      direction: `Direction should be in enum ${directionEnum.join(', ')}`
    }
  }
};

module.exports = {
  CREATE: create,
  LIST: getList,
  UPDATE_STATUS: updateStatus,
  UPDATE_INFO: updateInfo
};
