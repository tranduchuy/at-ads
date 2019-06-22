const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const districtModel = new Schema({
    id: Number,
    name: {type: String, default: ''},
    pre: {type: String, default: ''},
    city: {
        type: Schema.Types.ObjectId,
        ref: 'Cities'
    },
    wards: Array,
    streets: Array
});

const DistrictModel = mongoose.model('Districts', districtModel, 'Districts');
module.exports = DistrictModel;
module.exports.Model = districtModel;
