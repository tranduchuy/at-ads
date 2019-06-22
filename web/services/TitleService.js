const selector = require('../config/selector.js');
const CityList = require('../config/cities.json');
const StringService = require('./StringService');

const getPostType = (data) => {
    let postType = POST_TYPE_SALE;
    
    if (data) {
        
        let formality = getFormalitySaleByValue(data);
        if (formality)
            postType = POST_TYPE_SALE;
        else {
            formality = getFormalityBuyByValue(data);
            if (formality)
                postType = POST_TYPE_BUY;
        }
    }
    
    return postType;
};

const getTitle = (data) => {
    let title = '';
    
    if (data.formality) {
        let formality = getFormalitySaleByValue(data.formality);
        if (formality)
            title = formality.name;
        else {
            formality = getFormalityBuyByValue(data.formality);
            if (formality)
                title = formality.name;
        }
        
        if (formality && data.type) {
            const type = getTypeByValue(formality, data.type);
            if (type) title = type.name;
        }
    }
    
    return title || 'Bất Động Sản';
};

const getLocationTitle = (data) => {
    let locationTitle = '';
    
    if (data.city) {
        const city = getCityByCode(data.city);
        if (city)
            locationTitle = city.name;
        if (city && data.district) {
            const district = getDistrictByValue(city, data.district);
            if (district)
                locationTitle = (`${district.pre || ''} ${district.name}, ${locationTitle}`).trim();
            
            if (district) {
                if (data.project) {
                    const project = getProjectByValue(district, data.project);
                    if (project)
                        return locationTitle = project.name + ', ' + locationTitle;
                }
                
                if (data.ward) {
                    const ward = getWardByValue(district, data.ward);
                    if (ward)
                        locationTitle = (`${ward.pre || ''} ${ward.name}, ${locationTitle}`).trim();
                }
                
                if (data.street) {
                    const street = getStreetByValue(district, data.street);
                    if (street)
                        locationTitle = (`${street.pre || ''} ${street.name}, ${locationTitle}`).trim();
                }
            }
            
        }
    }
    
    return locationTitle;
};

const getOrderTitle = (data) => {
    
    let orderTitle = '';
    // '30-50m2-1-2-ty-2-phong-ngu-huong-dong-nam'
    
    if (data.area) {
        const area = getAreaByValue(data.area);
        if (area)
            orderTitle = orderTitle + " " + area.text;
    }
    
    if (data.price) {
        let formality = getFormalitySaleByValue(data.formality);
        if (!formality)
            formality = getFormalityBuyByValue(data.formality);
        
        if (formality) {
            const price = getPriceByValue(data.price, formality.priceLevelValue);
            if (price)
                orderTitle = orderTitle + " " + price.text;
        }
    }
    
    if (data.bedroomCount)
        orderTitle = orderTitle + " " + data.bedroomCount + " phong ngu";
    
    if (data.direction) {
        const direction = getDirectionsByValue(data.direction);
        if (direction)
            orderTitle = orderTitle + " huong " + direction.name.toString();
    }
    
    return orderTitle.trim();
};

const getDirectionsByValue = (value) => {
    if (StringService.isUndefinedOrNull(value)) {
        return null;
    }
    
    return selector.directionList.find(d => {
        return d.value.toString() === value.toString();
    });
};

const getPriceByValue = (value, priceLevelValue) => {
    if (StringService.isUndefinedOrNull(value) || (value < 0)) {
        return null;
    }
    
    if (value < 0) return null;
    
    return priceLevelValue.find(d => {
        return d.value === value;
    });
};

const getAreaByValue = (value) => {
    if (StringService.isUndefinedOrNull(value)) {
        return null;
    }
    
    if (value < 0) return null;
    
    return selector.areaListValue.find(d => {
        return d.value === value;
    });
};

const getFormalitySaleByValue = (value) => {
    return selector.cateList.find(c => {
        return c.id === value;
    });
};

const getFormalityBuyByValue = (value) => {
    return selector.cateListBuy.find(c => {
        return c.id === value;
    });
};

const getTypeByValue = (formality, value) => {
    if (StringService.isUndefinedOrNull(value)) {
        return null;
    }
    
    return formality.children.find(t => {
        return t.id.toString() === value.toString();
    });
};

const getCityByCode = (cd) => {
    return CityList.find(city => {
        return city.code === cd;
    });
};

const getDistrictByValue = (city, value) => {
    return city.district.find(d => {
        return d.id === value;
    });
};

const getProjectByValue = (district, value) => {
    return district.project.find(w => {
        return w._id.toString() === value;
    });
};

const getWardByValue = (district, value) => {
    return district.ward.find(w => {
        return w.id === value;
    });
};

const getStreetByValue = (district, value) => {
    return district.street.find(w => {
        return w.id === value;
    });
};

module.exports = {
    getPostType,
    getLocationTitle,
    getTitle,
    getOrderTitle,
    getCityByCode,
    getDistrictByValue,
    getFormalityBuyByValue,
    getTypeByValue
};