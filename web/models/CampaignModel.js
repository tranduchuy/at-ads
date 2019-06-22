const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const campaignSchema = new Schema({
  name: String,
  leadMinPrice: {
    type: Number,
    default: 0
  },
  leadMaxPrice: {
    type: Number,
    default: 0
  },
  downTime: {
    type: Number,
    default: 0
  },
  downPriceStep: {
    type: Number,
    default: 0
  },
  campaignType: {
    type: Number,
    default: -1
  },
  formality: {
    type: Number,
    default: 0
  },
  type: {
    type: Number,
    default: 0
  },
  city: {
    type: String,
    default: 0
  },
  district: {
    type: Number,
    default: 0
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Projects',
    default: null
  },
  domains: {
    type: Array,
    default: []
  },
  admin: {
    type: Number,
    default: null
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  user: {
    type: Number,
    default: null
  },
  status: {
    type: Number,
    default: global.STATUS.ACTIVE
  },
  deleteFlag: {
    type: Number,
    default: 0, // 1: means deleted
  },
  updatedAt: Date,
  createdAt: Date
});

module.exports = mongoose.model('Campaign', campaignSchema, 'Campaign');
