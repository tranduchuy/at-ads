const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const newsSchema = new Schema({
    title: String,
    content: String,
    type: Number,
    image: String,
    description: String,
    status: {type: Number, default: global.STATUS.ACTIVE},
    admin: {
        type: Array,
        default: []
    },
    date: {type: Number, default: Date.now},
    createdByType: {type: Number, default: global.CREATED_BY.HAND}
});

const NewsModel = mongoose.model('News', newsSchema, 'News');
module.exports = NewsModel;
module.exports.Model = newsSchema;
