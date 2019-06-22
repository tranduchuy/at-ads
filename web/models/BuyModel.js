/**
 * Created by duong_000 on 10/18/2016.
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const buySchema = new Schema({
    title: String,
    description: String,
    keywordList: Array,
    formality: Number,
    type: Number,
    city: String,
    district: Number,
    ward: Number,
    street: Number,
    project: String,
    area: Number,
    price: Number,
    unit: Number,
    address: String,
    images: Array,
    contactName: String,
    contactAddress: String,
    contactPhone: String,
    contactMobile: String,
    contactEmail: String,
    receiveMail: Boolean,
    admin: {type: Array, default: []},
    status: {type: Number, default: global.STATUS.PENDING_OR_WAIT_COMFIRM},
    date: {type: Number, default: Date.now},
    createdByType: {type: Number, default: global.CREATED_BY.HAND}
});

const BuyModel = mongoose.model('Buy', buySchema, 'Buys');
module.exports = BuyModel;
module.exports.Model = buySchema;
