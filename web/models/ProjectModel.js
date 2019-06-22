/**
 * Created by duong_000 on 10/18/2016.
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const projectSchema = new Schema({
    id: {type: Number, default: null}, // use for old selector
    status: Number,
    isShowOverview: Boolean,
    type: String,
    introImages: Array,
    title: String,
    address: String,
    area: Number,
    projectScale: String,
    price: Number,
    deliveryHouseDate: Number,
    constructionArea: Number,
    descriptionInvestor: String,
    description: String,
    isShowLocationAndDesign: Boolean,
    location: String,
    infrastructure: String,
    isShowGround: Boolean,
    overallSchema: Array,
    groundImages: Array,
    isShowImageLibs: Boolean,
    imageAlbums: Array,
    isShowProjectProgress: Boolean,
    projectProgressTitle: String,
    projectProgressStartDate: Number,
    projectProgressEndDate: Number,
    projectProgressDate: Number,
    projectProgressImages: Array,
    isShowTabVideo: Boolean,
    video: String,
    isShowFinancialSupport: Boolean,
    financialSupport: String,
    isShowInvestor: Boolean,
    detailInvestor: String,
    district: Number,
    city: String,
    admin: {type: Array, default: []},
    date: {type: Number, default: Date.now},
    createdByType: {type: Number, default: global.CREATED_BY.HAND}
});

const projectModel = mongoose.model('Project', projectSchema, 'Projects');
module.exports = projectModel;
module.exports.Model = projectSchema;
