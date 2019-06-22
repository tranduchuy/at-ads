var ProjectModel = require('../../models/ProjectModel');
var PostModel = require('../../models/PostModel');
var _ = require('lodash');


var ProjectController = {

    highlight: async function (req, res, next) {

        try {


            let projects = await ProjectModel.find({status: global.STATUS.ACTIVE}).sort({date: -1}).limit(10);

            let results = await Promise.all(projects.map(async project => {

                let post = await PostModel.findOne({contentId: project._id});


                let result = {

                    id: project._id,
                    status: project.status,
                    isShowOverview: project.isShowOverview,
                    type: project.type,
                    introImages: project.introImages,
                    title: project.title,
                    address: project.address,
                    area: project.area,
                    projectScale: project.projectScale,
                    price: project.price,
                    deliveryHouseDate: project.deliveryHouseDate,
                    constructionArea: project.constructionArea,
                    descriptionInvestor: project.descriptionInvestor,
                    description: project.description,

                    isShowLocationAndDesign: project.isShowLocationAndDesign,
                    location: project.location,
                    infrastructure: project.infrastructure,

                    isShowGround: project.isShowGround,
                    overallSchema: project.overallSchema,
                    groundImages: project.groundImages,

                    isShowImageLibs: project.isShowImageLibs,
                    imageAlbums: project.imageAlbums,

                    isShowProjectProgress: project.isShowProjectProgress,
                    projectProgressTitle: project.projectProgressTitle,
                    projectProgressStartDate: project.projectProgressStartDate,
                    projectProgressEndDate: project.projectProgressEndDate,
                    projectProgressDate: project.projectProgressDate,
                    projectProgressImages: project.projectProgressImages,

                    isShowTabVideo: project.isShowTabVideo,
                    video: project.video,

                    isShowFinancialSupport: project.isShowFinancialSupport,
                    financialSupport: project.financialSupport,

                    isShowInvestor: project.isShowInvestor,
                    detailInvestor: project.detailInvestor,

                    district: project.district,
                    city: project.city
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
module.exports = ProjectController
