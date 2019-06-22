const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const urlParamSchema = new Schema({
    param: {
        type: String,
        required: true,
        index: true
    },
    customParam: {
        type: String,
        index: true,
        default: ''
    },
    postType: {
        type: Number,
        index: true,
    },
    formality: {
        type: Number,
        index: true,
    },
    type: {
        type: Number,
        index: true,
    },
    city: {
        type : String,
        enum: ["AG", "VT", "BD", "BP", "BTH", "BDD", "BL", "BG", "BK", "BN", "BTR", "CB", "CM", "CT", "GL", "HN", "HG", "HNA", "HT", "HB", "HY", "HD", "HP", "HGI", "SG", "KH", "KG", "KT", "LCH", "LA", "LCA", "LDD", "LS", "NDD", "NA", "NB", "NT", "PT", "PY", "QB", "QNA", "QNG", "QNI", "QT", "ST", "SL", "TH", "TB", "TN", "TTH", "TG", "TV", "TQ", "TNI", "VL", "VP", "YB", "DDB", "DDN", "DDL", "DNO", "DNA", "DDT", null],
        index: true
    },
    district: {
        type: Number,
        index: true,
    },
    ward: {
        type: Number,
        index: true,
    },
    street: {
        type: Number,
        index: true,
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'Projects'
    },
    direction: {
        type: Number,
        index: true,
    },
    bedroomCount: Number,
    areaMax: Number,
    areaMin: Number,
    area: Number,
    priceMax: Number,
    priceMin: Number,
    price: Number,
    
    extra: Object,
    
    text: String,
    
    metaTitle: String,
    metaDescription: String,
    metaType: String,
    metaUrl: String,
    metaImage: String,
    canonical: String,
    textEndPage: String,
    
    status: {
        type: Number,
        default: global.STATUS.ACTIVE,
        index: true,
    },
    updatedBy: {type: Array, default: []}
});

const UrlParamModel = mongoose.model('UrlParam', urlParamSchema, 'UrlParams');
module.exports = UrlParamModel;
module.exports.Model = urlParamSchema;
