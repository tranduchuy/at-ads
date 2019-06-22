const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const leadHistorySchema = new Schema({
  lead: {
    type: Schema.Types.ObjectId,
    ref: 'Lead'
  },
  name: String,
  email: String,
  area: Number,
  price: Number,
  bedrooms: Number,
  bathrooms: Number,
  street: String,
  direction: String,
  note: String,
  referenceDomain: String,
  utmSource: String,
  utmCampaign: String,
  utmMedium: String,
  createdAt: Date,
  updatedAt: Date
});

const LeadHistorySchema = mongoose.model('LeadHistory', leadHistorySchema, 'LeadHistory');
module.exports = LeadHistorySchema;
