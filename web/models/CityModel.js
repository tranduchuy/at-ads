const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const citySchema = new Schema({
    code: {type: String, default: ''},
    name: {type: String, default: ''}
});

const CityModel = mongoose.model('Cities', citySchema, 'Cities');
module.exports = CityModel;
module.exports.Model = citySchema;
