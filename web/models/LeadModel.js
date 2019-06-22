const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const leadSchema = new Schema({
  campaign: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  user: {
    type: Number,
    default: null
  },
  status: {
    type: Number,
    default: global.STATUS.LEAD_NEW
  },
  deleteFlag: {
    type: Number,
    default: 0
  },
  phone: String,
  price: {
    type: Number,
    default: null
  },
  histories: {
    type: [{type: Schema.Types.ObjectId, ref: 'LeadHistory'}],
    default: []
  },
  createdAt: Date,
  updatedAt: Date,
  boughtAt: {
    type: Date,
    default: null
  }
});

const LeadModel = mongoose.model('Lead', leadSchema, 'Leads');
module.exports = LeadModel;
