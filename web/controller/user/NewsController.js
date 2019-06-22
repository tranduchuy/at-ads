var NewsModel = require('../../models/NewsModel');
var PostModel = require('../../models/PostModel');
var _ = require('lodash');
const EU = require('express-useragent');

var NewsController = {

    highlight: async function (req, res, next) {

        try {

            let newsList = await NewsModel.find({status : global.STATUS.ACTIVE}).sort({date: -1}).limit(6);
            let results = await Promise.all(newsList.map(async news => {

                let post = await PostModel.findOne({contentId: news._id});


                let result = {

                    id: news._id,
                    status: news.status,
                    title: news.title,
                    content: news.content,
                    cate: news.type,
                    image: news.image,
                    date: news.date,
                    description: news.description,

                };

                if (post) {
                    result.url = post.url;
                }

                return result;

            }));


            return res.json({
                status: 1,
                data: results,
                message: 'request success '
            });
        }
        catch (e) {
            return res.json({
                status: 0,
                data: {},
                message: 'unknown error : ' + e.message
            });
        }

    },
    latest: async function (req, res, next) {

        try {
            let newsList = await NewsModel.find({status : global.STATUS.ACTIVE}).sort({date: -1}).limit(10);
            let results = await Promise.all(newsList.map(async news => {

                let post = await PostModel.findOne({contentId: news._id});


                let result = {

                    id: news._id,
                    status: news.status,
                    title: news.title,
                    content: news.content,
                    cate: news.type,
                    image: news.image,
                    date: news.date,
                    description: news.description,

                };

                if (post) {
                    result.url = post.url;
                }

                return result;

            }));


            return res.json({
                status: 1,
                data: results,
                message: 'request success '
            });
        }
        catch (e) {
            return res.json({
                status: 0,
                data: {},
                message: 'unknown error : ' + e.message
            });
        }

    }
}
module.exports = NewsController
