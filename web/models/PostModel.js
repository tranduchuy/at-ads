const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const postSchema = new Schema({
    contentId: {
        type: Schema.Types.ObjectId,
        index: true
    },
    postType: {
        type: Number,
        index: true
    },
    type: {
        type: Number,
        index: true,
    },
    formality: {
        type: Number,
        index: true
    },
    admin: String,
    status: {
        type: Number,
        index: true
    },
    paymentStatus: {
        type : Number,
        default : global.STATUS.PAYMENT_UNPAID,
        index: true
    },
    price: Number,
    priority: {
        type: Number,
        index: true,
    },
    from: {
      type: Number,
      index: true
    },
    to: {
        type: Number,
        index: true
    },
    url: {
        type: String,
        index: true,
    },
    customUrl: {
        type: String,
        default: '',
        index: true
    },
    date: {
        type: Number,
        default: Date.now,
        index: true
    },
    refresh: {
        type: Number,
        default: Date.now,
        index: true
    },
    metaTitle: String,
    metaDescription: String,
    metaType: String,
    metaUrl: String,
    metaImage: String,
    canonical: String,
    textEndPage: String,
    user: Number,
    tags: {type: Array, default: []}
});

const PostModel = mongoose.model('Post', postSchema, 'Posts');
module.exports = PostModel;
module.exports.Model = postSchema;
