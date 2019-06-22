const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ruleSchema = new Schema({
  userId: Number,
  formality: Number,
  type: Number,
  city: String,
  district: Number,
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project'
  },
  status: {
    type: Number,
    default: global.STATUS.ACTIVE
  },
  updatedAt: {
    type: Date,
    default: new Date()
  },
  createdAt: {
    type: Date,
    default: new Date()
  },
});

const RuleAlertLead = mongoose.model('RuleAlertLead', ruleSchema, 'RuleAlertLead');
module.exports = RuleAlertLead;
