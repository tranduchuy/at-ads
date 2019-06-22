/**
 * Created by duong_000 on 10/18/2016.
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const saleSchema = new Schema({
  title: String,
  formality: Number,
  type: Number,
  city: String,
  district: Number,
  ward: Number,
  street: Number,
  project: String,
  area: Number,
  areaData: Number,
  price: Number,
  priceData: Number,
  unit: Number,
  address: String,
  keywordList: Array,
  description: String,
  streetWidth: Number,
  frontSize: Number,
  direction: Number,
  balconyDirection: Number,
  floorCount: Number,
  bedroomCount: Number,
  toiletCount: Number,
  furniture: String,
  images: Array,
  contactName: String,
  contactAddress: String,
  contactPhone: String,
  contactMobile: String,
  contactEmail: String,
  admin: {type: Array, default: []},
  status: {type: Number, default: global.STATUS.PENDING_OR_WAIT_COMFIRM},
  date: {type: Number, default: Date.now},
  createdByType: {type: Number, default: global.CREATED_BY.HAND},
  adStatus:{
    type: Number,
    default: global.STATUS.PAID_FORM_VIEW_STOP
  },
  view: {
    type: Number,
    default: 0
  },
  impression: {
    type: Number,
    default: 0,
  },
  click: {
    type: Number,
    default: 0
  },
  cpv: {
    type: Number,
    default: 0
  },
  ctr: {
    type: Number,
    default: 0
  },
  adRank: {
    type: Number,
    default: 0
  },
  paidForm: { // 1: thả theo ngày. 2: trả theo view
    type: Number,
    default: null
  },
  budgetPerDay: {
    type: Number,
    default: 0
  },
  isValidBalance: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: new Date()
  },
  updatedAt: {
    type: Date,
    default: new Date()
  }
});

const SaleModel = mongoose.model('Sale', saleSchema, 'Sales');
module.exports = SaleModel;
module.exports.Model = saleSchema;
