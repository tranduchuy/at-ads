/**
 * Created by duong_000 on 10/18/2016.
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const childSchema = new Schema({
    companyId: String,
    personalId: String,
    status: {type: Number, default: global.STATUS.CHILD_WAITING},
    creditHistory: {type: Array, default: []},
    credit: {type: Number, default: 0},
    creditUsed: {type: Number, default: 0},
    date: {type: Number, default: Date.now}
});

const ChildModel = mongoose.model('Child', childSchema, 'Children');
module.exports = ChildModel;
module.exports.Model = childSchema;
