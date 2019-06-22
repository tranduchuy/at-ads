const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const leadPriceScheduleSchema = new Schema({
  lead: {
    type: Schema.Types.ObjectId,
    ref: 'Lead'
  },
  isFinished: {
    type: Boolean,
    default: false
  },
  price: Number,
  downPriceStep: Number,
  minPrice: Number,
  downPriceAt: Date,
  createdAt: Date,
  updatedAt: Date
});

const LeadModel = mongoose.model('LeadPriceSchedule', leadPriceScheduleSchema, 'LeadPriceSchedule');
module.exports = LeadModel;
