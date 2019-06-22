const ProjectModel = require('../../models/ProjectModel');
const PostModel = require('../../models/PostModel');
const UrlParamModel = require('../../models/UrlParamModel');
const urlSlug = require('url-slug');
const log4js = require('log4js');
const mongoose = require('mongoose');
const logger = log4js.getLogger('Controllers');
const HttpCode = require('../../config/http-code');
const ImageService = require('../../services/ImageService');

const update = async (req, res, next) => {
    logger.info('AdminProjectController::Update is called');

    try {
        const admin = req.user;
        if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.role) === -1) {
            logger.error('AdminProjectController::Update::error Permission denied', admin.token);
            return next(new Error('Permission denied'));
        }

        let id = req.params.id;
        if (!id || id.length === 0) {
            logger.error('AdminProjectController::Update::error Invalid project id', id);
            return next(new Error('Invalid project id'));
        }

        const post = await PostModel.findOne({_id: id});

        if (!post) {
            logger.error('AdminProjectController::Update::error Post of project not exist', id);
            return next(new Error('Post of project not exist'));
        }

        let project = await ProjectModel.findOne({_id: post.contentId});

        if (!project) {
            logger.error('AdminProjectController::Update::error Project not exist. Project Id: ', post.contentId);
            return next(new Error('Project not exist'));
        }

        const {status} = req.body;

        // update images
        const imagesProperties = ['introImages', 'overallSchema', 'groundImages', 'imageAlbums', 'projectProgressImages'];
        imagesProperties.forEach((imgPropNm) => {
            if (req.body[imgPropNm]) {
                ImageService.putUpdateImage(
                    project[imgPropNm].map(o => o.id),
                    req.body[imgPropNm].map(n => n.id)
                );
            }
        });

        const projectProperties = [
            'isShowOverview', 'type', 'introImages', 'title', 'address', 'area', 'projectScale',
            'price', 'deliveryHouseDate', 'constructionArea', 'descriptionInvestor', 'description',
            'isShowLocationAndDesign', 'infrastructure', 'location', 'isShowGround', 'overallSchema',
            'groundImages', 'isShowImageLibs', 'imageAlbums', 'isShowProjectProgress',
            'projectProgressTitle', 'projectProgressStartDate', 'projectProgressEndDate',
            'projectProgressDate', 'projectProgressImages', 'isShowTabVideo', 'video',
            'isShowFinancialSupport', 'financialSupport', 'isShowInvestor', 'detailInvestor',
            'district', 'city', 'status'
        ];
        const postProperties = [
            'metaTitle', 'metaDescription', 'metaType', 'metaUrl', 'metaImage', 'canonical', 'textEndPage'
        ];

        projectProperties.forEach(field => {
            project[field] = req.body[field] || project[field];
        });

        if (status === global.STATUS.ACTIVE || status === global.STATUS.BLOCKED || status === global.STATUS.DELETE) {
            project.status = status;
            post.status = status;
        }

        project.admin = (project.admin || []).push(new mongoose.Types.ObjectId(admin._id));

        // update post info
        postProperties.forEach(field => {
            post[field] = req.body[field] || post[field];
        });

        if (req.body.title && req.body.title !== project.title) {
            const count = await PostModel.find({url: new RegExp('^' + url)});
            let url = urlSlug(req.body.title);
            if (count > 0) {
                url += ('-' + count);
            }

            post.url = url;
        }

        const customUrl = req.body.url;

        if (customUrl && customUrl !== post.customUrl) {
            const countDuplicateUrl = await PostModel.countDocuments({
                _id: {$ne: id},
                $or: [
                    {url: customUrl},
                    {customUrl}
                ]
            });

            if (countDuplicateUrl === 0) {
                post.customUrl = customUrl.toString().trim();
            } else {
                logger.error('ProjectController::update::error. Duplicate url', customUrl);
                return next(new Error('Duplicate url: ' + customUrl));
            }
        }

        await project.save();
        await post.save();
        return res.json({
            status: HttpCode.SUCCESS,
            data: Object.assign({}, post.toObject(), project.toObject()),
            message: 'Update success'
        });
    } catch (e) {
        logger.error('AdminProjectController::update::error', e);
        return next(e);
    }
};

const add = async (req, res, next) => {
    logger.info('Admin/ProjectController::add::called');

    try {
        const admin = req.user;
        if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.role) === -1) {
            return next(new Error('Permission denied'));
        }

        let project = new ProjectModel();

        const {
            isShowOverview, type, introImages, title, address, area, projectScale,
            price, deliveryHouseDate, constructionArea, descriptionInvestor, description,
            isShowLocationAndDesign, infrastructure, location, isShowGround, overallSchema,
            groundImages, isShowImageLibs, imageAlbums, isShowProjectProgress,
            projectProgressTitle, projectProgressStartDate, projectProgressEndDate,
            projectProgressDate, projectProgressImages, isShowTabVideo, video,
            isShowFinancialSupport, financialSupport, isShowInvestor, detailInvestor,
            district, city, metaTitle, metaDescription, metaType, metaUrl, metaImage,
            canonical, textEndPage, createdByType
        } = req.body;
    
        if (createdByType) {
            const duplicateTitle = await ProjectModel.findOne({title: req.body.title});
            if (duplicateTitle) {
                logger.error('Admin/ProjectController::add::error. Crawling duplicate title');
                return next(new Error('Crawling duplicate title'));
            }
        }

        ['introImages', 'overallSchema', 'groundImages', 'imageAlbums', 'projectProgressImages'].forEach(fieldImg => {
            ImageService.postConfirmImage((req.body[fieldImg] || []).map(intro => {
                return intro.id;
            }));
        });

        const duplicateProjectByTitle = await ProjectModel.findOne({
            title
        }).lean();

        if (duplicateProjectByTitle) {
            if (duplicateProjectByTitle.status === global.STATUS.PENDING_OR_WAIT_COMFIRM) {
                req.params.id = duplicateProjectByTitle._id.toString();
                return await update(req, res, next);
            } else {
                return next(new Error('Duplicate title'));
            }
        }

        project.district = district;
        project.city = city;
        project.isShowOverview = isShowOverview;
        project.type = type;
        project.introImages = introImages;
        project.title = title;
        project.address = address;
        project.area = area;
        project.projectScale = projectScale;
        project.price = price;
        project.deliveryHouseDate = deliveryHouseDate;
        project.constructionArea = constructionArea;
        project.descriptionInvestor = descriptionInvestor;
        project.description = description;
        project.isShowLocationAndDesign = isShowLocationAndDesign;
        project.infrastructure = infrastructure;
        project.location = location;
        project.isShowGround = isShowGround;
        project.overallSchema = overallSchema;
        project.groundImages = groundImages;
        project.isShowImageLibs = isShowImageLibs;
        project.imageAlbums = imageAlbums;
        project.isShowProjectProgress = isShowProjectProgress;
        project.projectProgressTitle = projectProgressTitle;
        project.projectProgressStartDate = projectProgressStartDate;
        project.projectProgressEndDate = projectProgressEndDate;
        project.projectProgressDate = projectProgressDate;
        project.projectProgressImages = projectProgressImages;
        project.isShowTabVideo = isShowTabVideo;
        project.video = video;
        project.isShowFinancialSupport = isShowFinancialSupport;
        project.financialSupport = financialSupport;
        project.isShowInvestor = isShowInvestor;
        project.detailInvestor = detailInvestor;
        project.status = global.STATUS.ACTIVE;
        project.admin = [admin._id];
        project.createdByType = createdByType || global.CREATED_BY.HAND;
        project = await project.save();

        const post = new PostModel();
        post.postType = global.POST_TYPE_PROJECT;
        post.type = project.type;
        post.contentId = new mongoose.Types.ObjectId(project._id);
        post.user = admin._id;
        post.metaTitle = metaTitle;
        post.metaDescription = metaDescription;
        post.metaType = metaType;
        post.metaUrl = metaUrl;
        post.metaImage = metaImage;
        post.canonical = canonical;
        post.textEndPage = textEndPage;
        post.status = global.STATUS.ACTIVE;
        post.paymentStatus = global.STATUS.PAYMENT_FREE;

        let url = urlSlug(title);
        const count = await PostModel.find({url: new RegExp("^" + url)});
        if (count > 0) {
            url += `${url}-${count}`;
        }

        post.url = url;
        await post.save();
        logger.info('Admin/ProjectController::add::success');

        return res.json({
            status: HttpCode.SUCCESS,
            data: post,
            message: 'Success'
        });
    } catch (e) {
        logger.error('Admin/ProjectController::add::error', e);
        return next(e);
    }
};

const typeList = async (req, res, next) => {
    logger.info('Admin/ProjectController::typeList::called');
    try {
        const admin = req.user;
        if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.role) === -1) {
            return next(new Error('Permission denied'));
        }

        const types = await UrlParamModel.find({postType: global.POST_TYPE_PROJECT});
        let results = types.map(type => {
            return {text: type.text, id: type.type, url: type.param};
        });

        logger.info('Admin/ProjectController::typeList::success');
        return res.json({
            status: HttpCode.SUCCESS,
            data: results,
            message: 'Success'
        });
    } catch (e) {
        logger.error('Admin/ProjectController::typeList::error', e);
        return next(e);
    }
};

module.exports = {
    typeList,
    update,
    add
};
