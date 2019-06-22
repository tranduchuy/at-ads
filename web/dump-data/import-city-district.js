/*
* This script handle imports cities, districts into database
* */

require('../config/def');
const urlSlug = require('url-slug');
const dbConnect = require('../database/db');
const CityModel = require('../models/CityModel');
const DistrictModel = require('../models/DistrictModel');
const ProjectModel = require('../models/ProjectModel');
const PostModel = require('../models/PostModel');
const list1 = require('./selectors/cityList1');
const list2 = require('./selectors/cityList2');
const list3 = require('./selectors/cityList3');
const list4 = require('./selectors/cityList4');
const cities = [
    ...list1,
    ...list2,
    ...list3,
    ...list4
];

// import city, district
async function importCity(cityData) {
    let city = await CityModel.findOne({code: cityData.code});
    if (city) {
        return Promise.resolve(city);
    }

    city = new CityModel();
    city.code = cityData.code;
    city.name = cityData.name;
    await city.save();
    return city;
}

async function importDistrict(districtData, cityObj) {
    let district = await DistrictModel.findOne({id: districtData.id});
    if (district) {
        return Promise.resolve(district);
    }

    district = new DistrictModel();
    district.id = districtData.id;
    district.name = districtData.name || '';
    district.pre = districtData.pre || '';
    district.wards = districtData.ward || [];
    district.streets = districtData.street || [];
    district.city = cityObj._id;

    await district.save();
    return district;
}

// check duplicate by title
// sample: {"id":2324,"name":"13B Conic Phong Phú","lat":10.71240234375,"lng":106.64177703857422,"cats":[40,48,50,51,59,163,324,325,326]}
async function importProjectPost(projectData, districtObj, cityObj) {
    let project = await ProjectModel.findOne({title: projectData.name});

    if (project) {
        return Promise.resolve(null);
    }

    project = new ProjectModel();
    project.title = projectData.name;
    project.id = parseInt(projectData.id);
    project.status = global.STATUS.PENDING_OR_WAIT_COMFIRM;
    project.city = cityObj.code;
    project.district = districtObj.id;
    await project.save();

    const post = new PostModel();
    post.paymentStatus = global.STATUS.PAYMENT_FREE;
    post.status = global.STATUS.ACTIVE;
    post.postType = global.POST_TYPE_PROJECT;
    post.contentId = project._id;
    let url = urlSlug(projectData.name);
    const count = await PostModel.find({url: new RegExp('^' + url)});
    if (count > 0) {
        url += '-' + count;
    }

    post.url = url;
    await post.save();
    return project;
}

async function run() {
    cities.forEach(async (cityData) => {
        // create city
        const city = await importCity(cityData);

        cityData.district.forEach(async (districtData) => {
            // create district
            const district = await importDistrict(districtData, city);
            districtData.project.forEach(async (projectData) => {
                await importProjectPost(projectData, district, city);
            });
        });
    });
}

dbConnect(async () => {
    await run();
});
