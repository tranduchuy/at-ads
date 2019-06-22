// var UrlParamModel4 = require('../models/UrlParamModel2');
// var data= require('../files/js/selectorX');
// var data2 = require('../files/js/selectorX2');
// var data3 = require('../files/js/selectorX3');
// var data4 = require('../files/js/selectorX4');
// // var data5 = require('../files/js/selectorX5');
// var urlSlug = require('url-slug');
// const {forEach} = require('p-iteration');
//
//
// function getBedRoomCounts() {
//     var results = [];
//
//     for (let i = 0; i <= 5; i++) {
//
//         if (i > 0) {
//             results.push({
//                 params: {
//                     bedroomCount: i
//                 },
//                 url: i + '-phong-ngu'
//             });
//         }
//         if (i == 0) {
//             results.push({
//                 params: {
//                     bedroomCount: 0
//                 },
//                 url: 'khong-xac-dinh-phong-ngu'
//             });
//         }
//     }
//     return results;
// }
//
//
// function getAreas() {
//
//     var results = [];
//
//     let areas = data.areaList;
//     for (let area of areas) {
//         results.push({
//             params: {
//                 areaMin: area.min.value,
//                 areaMax: area.max.value,
//             },
//             url: 'dt-' + urlSlug(area.Value)
//         });
//     }
//     return results;
//
// }
//
// function getPrices() {
//
//     var results = [];
//
//     for (let prices of data.priceLevel) {
//         for (let price of prices) {
//             results.push({
//                 params: {
//                     priceMin: price.min.value,
//                     priceMax: price.max.value,
//                 },
//                 url: urlSlug(price.Value)
//             });
//         }
//     }
//     return results;
//
// }
//
// function getDirections() {
//
//     var results = [];
//
//     let directions = data.directionList;
//     for (let direction of directions) {
//         results.push({
//             params: {
//                 direction: direction.value
//             },
//             url: urlSlug(' huong ' + direction.name)
//         });
//     }
//     return results;
// }
//
//
// function getWardsAndStreet(district) {
//
//
//     var results = [];
//
//     var wards = district.ward;
//     var streets = district.street;
//
//     for (let ward of wards) {
//         results.push({
//
//             params: {
//                 ward: ward.id
//             },
//             url: urlSlug(ward.pre + '-' + ward.name)
//         });
//     }
//
//     for (let street of streets) {
//         for (let ward of wards) {
//             results.push({
//
//                 params: {
//                     street: street.id,
//                     ward: ward.id
//                 },
//                 url: urlSlug(street.pre + '-' + street.name + '-' + ward.pre + '-' + ward.name)
//             });
//         }
//         results.push(
//             {
//
//                 params: {
//                     street: street.id
//                 },
//                 url:
//                     urlSlug(street.pre + '-' + street.name)
//             });
//     }
//
//     return results;
//
// }
//
// function getDistricts(city) {
//
//     var results = [];
//
//     for (let district of city.district) {
//         results.push({
//
//             params: {
//                 district: district.id
//             },
//             url: urlSlug(district.pre + '-' + district.name)
//         });
//         for (let ward of getWardsAndStreet(district)) {
//             ward.params.district = district.id;
//             results.push(ward);
//         }
//     }
//
//     return results;
//
//
// }
//
//
// function getCities() {
//
//     var results = [];
//
//     var cities = [].concat(data.cityListOTher1,data2.cityListOTher2,data3.cityListOTher3,data4.cityListOTher4);
//     // cities = cities.concat(cities,data2.cityListOTher2);
//     // cities = cities.concat(cities,data3.cityListOTher3);
//     // cities = cities.concat(cities,data4.cityListOTher4);
//
//     for (let city of cities) {
//         results.push({
//
//             params: {
//                 city: city.code
//             },
//             url: urlSlug(city.name)
//         });
//
//         for (let district of getDistricts(city)) {
//             district.params.city = city.code;
//             results.push(district);
//         }
//
//     }
//     return results;
// }
//
// async function insertParams(ob, path, error) {
//
//     var model = new UrlParamModel4(ob);
//     var result = undefined;
//
//
//     try {
//         ob.param = path + (error == 0 ? '' : '-' + error);
//         result = await model.save();
//
//     } catch (e) {
//         error++;
//         console.log(e.message);
//         return await insertParams(ob, path, error);
//     }
//
//     return result;
//
//
// }
//
// function getBuysSells() {
//     let buys = data.cateListBuy;
//     let sales = data.cateList;
//
//     buys = buys.concat(sales);
//
//     var results = [];
//
//     for (let buy of buys) {
//
//
//         results.push({
//
//             params: {
//                 postType: global.POST_TYPE_BUY,
//                 formality: buy.id
//             },
//             url: urlSlug(buy.name)
//         });
//
//         let children = buy.children;
//
//
//         for (let child of children) {
//             results.push({
//
//                 params: {
//                     postType: global.POST_TYPE_BUY,
//                     formality: buy.id,
//                     type: child.id
//                 },
//                 url: urlSlug(child.name)
//             })
//
//         }
//
//         return results;
//     }
//
//
// }
//
// var ScriptController = {
//
//
//     generateUrl2: async function () {
//
//
//
//
//         var directions = getDirections();
//
//         console.log('directions ',directions.length);
//
//         var prices = getPrices();
//
//         console.log('prices ',prices.length);
//
//         var areas = getAreas();
//
//         console.log('areas ',areas.length);
//
//
//         var beds = getBedRoomCounts();
//
//         console.log('beds ',beds.length);
//
//
//         var buys = getBuysSells();
//
//         console.log('buys ',buys.length);
//
//         var locations = getCities();
//
//         console.log('locations ',locations.length);
//
//
//
//
//         for (var ilocation = locations.length - 1; ilocation >= 0; ilocation--) {
//
//             for (var idirection = directions.length - 1; idirection >= 0; idirection--) {
//
//                 for (var iprice = prices.length - 1; iprice >= 0; iprice--) {
//
//                     for (var iarea = areas.length - 1; iarea >= 0; iarea--) {
//
//                         for (var ibed = beds.length - 1; ibed >= 0; ibed--) {
//
//                             for (var ibuy = buys.length - 1; ibuy >= 0; ibuy--) {
//
//
//                                 var params = [];
//
//                                 if (ibuy >= 0) {
//                                     params.push(buys[ibuy]);
//                                 }
//
//                                 if (ilocation >= 0) {
//                                     params.push(locations[ilocation]);
//                                 }
//                                 if (idirection >= 0) {
//                                     params.push(directions[idirection]);
//                                 }
//                                 if (iprice >= 0) {
//                                     params.push(prices[iprice]);
//                                 }
//                                 if (iarea >= 0) {
//                                     params.push(areas[iarea]);
//                                 }
//                                 if (ibed >= 0) {
//                                     params.push(beds[ibed]);
//                                 }
//
//
//                                 if (params.length == 0) {
//                                     continue;
//                                 }
//
//
//                                 var ob = {};
//                                 var path = '';
//                                 for (var i = 0; i < params.length; i++) {
//
//                                     var param = params[i];
//
//                                     ob = Object.assign(ob, param.params);
//                                     path = ((path.length > 0 ? path + '-' : '') + param.url);
//
//
//                                 }
//
//                                 var result = await insertParams(ob, path, 0);
//                                 console.log(result);
//
//                             }
//                         }
//
//                     }
//
//
//                 }
//
//
//             }
//
//
//         }
//
//
//     },
//
//     generateUrl: async function (req, res, next) {
//
//         try {
//
//             var urlParam;
//
//             let buys = data.cateListBuy;
//
//             for (let buy of buys) {
//
//                 urlParam = new UrlParamModel4();
//                 urlParam.param = urlSlug(buy.name);
//                 urlParam.postType = global.POST_TYPE_BUY;
//                 urlParam.formality = buy.id;
//
//                 await urlParam.save();
//
//                 let children = buy.children;
//                 for (let child of children) {
//
//                     urlParam = new UrlParamModel4();
//                     urlParam.param = urlSlug(child.name);
//                     urlParam.postType = global.POST_TYPE_BUY;
//                     urlParam.formality = buy.id;
//                     urlParam.type = child.id;
//                     await urlParam.save();
//                 }
//             }
//             let sales = data.cateList;
//
//             for (let sale of sales) {
//
//                 urlParam = new UrlParamModel4();
//                 urlParam.param = urlSlug(sale.name);
//                 urlParam.postType = global.POST_TYPE_SALE;
//                 urlParam.formality = sale.id;
//                 urlParam.save();
//
//                 let children = sale.children;
//
//                 for (let child of children) {
//
//                     urlParam = new UrlParamModel4();
//                     urlParam.param = urlSlug(child.name);
//                     urlParam.postType = global.POST_TYPE_SALE;
//                     urlParam.formality = sale.id;
//                     urlParam.type = child.id;
//
//                     await urlParam.save();
//                 }
//             }
//
//             let cities = data.cityListOTher1;
//
//             var params = await UrlParamModel4.find({postType: 1});
//
//             for (let city of cities) {
//
//                 for (let param of params) {
//
//                     urlParam = new UrlParamModel4();
//                     urlParam.param = urlSlug(param.param + ' tai ' + city.name);
//                     urlParam.postType = param.postType;
//                     urlParam.formality = param.formality;
//                     urlParam.type = param.type;
//                     urlParam.city = city.code;
//
//                     urlParam.save();
//
//
//                     let districts = city.district;
//
//                     for (let district of districts) {
//
//                         urlParam = new UrlParamModel4();
//
//                         urlParam.param = urlSlug(param.param + ' ' + district.pre + ' ' + district.name + ' ' + city.name);
//                         urlParam.postType = param.postType;
//                         urlParam.formality = param.formality;
//                         urlParam.type = param.type;
//                         urlParam.city = city.code;
//                         urlParam.district = district.id;
//
//                         urlParam.save();
//
//
//                         let wards = district.ward;
//
//
//                         for (let ward of wards) {
//
//                             urlParam = new UrlParamModel4();
//
//                             urlParam.param = urlSlug(param.param + ' ' + ward.pre + ' ' + ward.name + ' ' + district.pre + ' ' + district.name);
//
//                             let checkParam = await UrlParamModel4.findOne({param: urlParam.param});
//                             if (checkParam) {
//                                 urlParam.param += '-' + ward.id;
//                             }
//
//                             urlParam.postType = param.postType;
//                             urlParam.formality = param.formality;
//                             urlParam.type = param.type;
//                             urlParam.city = city.code;
//                             urlParam.district = district.id;
//                             urlParam.ward = ward.id;
//
//                             await urlParam.save();
//                         }
//
//
//                         let streets = district.street;
//                         for (let street of streets) {
//
//                             urlParam = new UrlParamModel4();
//
//                             urlParam.param = urlSlug(param.param + ' ' + street.pre + ' ' + street.name + ' ' + district.pre + ' ' + district.name);
//
//                             let checkParam = await UrlParamModel4.findOne({param: urlParam.param});
//                             if (checkParam) {
//                                 urlParam.param += '-' + street.id;
//                             }
//
//                             urlParam.postType = param.postType;
//                             urlParam.formality = param.formality;
//                             urlParam.type = param.type;
//                             urlParam.city = city.code;
//                             urlParam.district = district.id;
//                             urlParam.street = street.id;
//
//                             await urlParam.save();
//
//
//                             for (let ward of wards) {
//
//                                 urlParam = new UrlParamModel4();
//
//                                 urlParam.param = urlSlug(param.param + ' ' + street.pre + ' ' + street.name + ' ' + ward.pre + ' ' + ward.name);
//
//                                 let checkParam = await UrlParamModel4.findOne({param: urlParam.param});
//                                 if (checkParam) {
//                                     urlParam.param += '-' + ward.id;
//                                     let checkParam = await UrlParamModel4.findOne({param: urlParam.param});
//                                     if (checkParam) {
//                                         urlParam.param += '-' + ward.id + '-d';
//                                     }
//                                 }
//
//                                 urlParam.postType = param.postType;
//                                 urlParam.formality = param.formality;
//                                 urlParam.type = param.type;
//                                 urlParam.city = city.code;
//                                 urlParam.district = district.id;
//                                 urlParam.ward = ward.id;
//                                 urlParam.street = street.id;
//
//                                 await urlParam.save();
//                             }
//                         }
//                     }
//                 }
//
//
//             }
//
//             params = await UrlParamModel4.find({postType: 1});
//
//             for (let param of params) {
//                 let directions = data.directionList;
//                 for (let direction of directions) {
//
//                     urlParam = new UrlParamModel4();
//
//                     urlParam.param = urlSlug(param.param + ' huong ' + direction.name);
//
//                     urlParam.postType = param.postType;
//                     urlParam.formality = param.formality;
//                     urlParam.type = param.type;
//                     urlParam.city = param.city;
//                     urlParam.district = param.district;
//                     urlParam.ward = param.ward;
//                     urlParam.street = param.street;
//                     urlParam.direction = direction.value;
//
//                     await urlParam.save();
//                 }
//
//
//             }
//
//             params = await UrlParamModel4.find({postType: 1});
//
//             for (let param of params) {
//                 let prices = data.priceLevel;
//                 for (let price of prices) {
//
//                     urlParam = new UrlParamModel4();
//
//                     urlParam.param = urlSlug(param.param + ' gia ' + price.Value);
//
//                     urlParam.postType = param.postType;
//                     urlParam.formality = param.formality;
//                     urlParam.type = param.type;
//                     urlParam.city = param.city;
//                     urlParam.district = param.district;
//                     urlParam.ward = param.ward;
//                     urlParam.street = param.street;
//                     urlParam.direction = param.direction;
//                     urlParam.priceMax = price.max.value;
//                     urlParam.priceMin = price.min.value;
//                     urlParam.price = price.Name;
//
//                     await urlParam.save();
//                 }
//
//
//             }
//
//             params = await UrlParamModel4.find({postType: 1});
//
//             for (let param of params) {
//                 let areas = data.areaList;
//                 for (let area of areas) {
//
//                     urlParam = new UrlParamModel4();
//
//                     urlParam.param = urlSlug(param.param + ' dien tich ' + area.Value);
//
//                     urlParam.postType = param.postType;
//                     urlParam.formality = param.formality;
//                     urlParam.type = param.type;
//                     urlParam.city = param.code;
//                     urlParam.district = param.id;
//                     urlParam.ward = param.id;
//                     urlParam.street = param.id;
//                     urlParam.balconyDirection = param.balconyDirection;
//                     urlParam.priceMax = param.priceMax;
//                     urlParam.priceMin = param.priceMin;
//                     urlParam.price = param.price;
//                     urlParam.areaMax = area.max.value;
//                     urlParam.areaMin = area.min.value;
//                     urlParam.area = area.Name;
//
//                     await urlParam.save();
//                 }
//
//
//             }
//
//             let count = await UrlParamModel4.count();
//
//             return res.json({
//                 status: 1,
//                 data: {total: count},
//                 message: 'success !'
//             });
//
//         }
//         catch (e) {
//             return res.json({
//                 status: 0,
//                 data: urlParam,
//                 message: 'unknown error : ' + e.message
//             });
//         }
//
//
//     }
//
// }
// module.exports = ScriptController
