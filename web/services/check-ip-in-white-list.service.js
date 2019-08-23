const log4js = require('log4js');
const logger = log4js.getLogger('Services');

const checkIpsInWhiteList = (ips, ipsInWhiteList) => {
    logger.info('CheckIpInWhiteListService::checkIpsInWhiteList::is called', {ips, ipsInWhiteList});
    if(ipsInWhiteList.length === 0)
    {
        return {status: true, ipsConflict: []};
    }

    let ipsConflict = [];

    ips.forEach(ip => {
        ipsInWhiteList.forEach(ipInWhiteList => {
            if(ip === ipInWhiteList)
            {
                ipsConflict.push(ip);
            }
            else
            {
                const splitIp = ip.split('.');
                const slideIpClassD = splitIp.slice(0,3);
                const slideIpClassC = splitIp.slice(0,2);
                const ipClassD = slideIpClassD.join('.') + ".0/24";
                const ipClassC = slideIpClassC.join('.') + ".0.0/16";

                if(ipClassD === ipInWhiteList)
                {
                    ipsConflict.push(ip);
                }
                else
                {
                   if(ipClassC === ipInWhiteList) 
                   {
                        ipsConflict.push(ip);
                   }
                }
            }
        });  
    });

    logger.info('CheckIpInWhiteListService::checkIpsInWhiteList::success', {ips, ipsInWhiteList, ipsConflict});
    return ipsConflict.length > 0 ? { status: false, ipsConflict } : { status: true, ipsConflict }; 
}

const checkWhiteListIpsExistsInBlackList = (ipsInBlackList, ipsInWhiteList) => {
    logger.info('CheckIpInWhiteListService::checkIpsWhiteListExistsInBlackList::is called', {ipsInBlackList, ipsInWhiteList});
    if(ipsInBlackList.length === 0)
    {
        return {status: true, ipsConflict: []};
    }

    let ipsConflict = [];

    ipsInBlackList.forEach(ip => {
        ipsInWhiteList.forEach(ipInWhiteList => {
            if(ip === ipInWhiteList)
            {
                ipsConflict.push(ipInWhiteList);
            }
            else
            {
                const splitIp = ip.split('.');
                const slideIpClassD = splitIp.slice(0,3);
                const slideIpClassC = splitIp.slice(0,2);
                const ipClassD = slideIpClassD.join('.') + ".0/24";
                const ipClassC = slideIpClassC.join('.') + ".0.0/16";

                if(ipClassD === ipInWhiteList)
                {
                    const convertIpClassD = slideIpClassD.join('.') + ".*";
                    ipsConflict.push(convertIpClassD);
                }
                else
                {
                   if(ipClassC === ipInWhiteList) 
                   {
                        const convertIpClassC = slideIpClassC.join('.') + ".*.*";
                        ipsConflict.push(convertIpClassC);
                   }
                }
            }
        });  
    });

    logger.info('CheckIpInWhiteListService::checkIpsInWhiteList::success', {ipsInBlackList, ipsInWhiteList, ipsConflict});
    return ipsConflict.length > 0 ? { status: false, ipsConflict } : { status: true, ipsConflict }; 
};

module.exports = {
    checkIpsInWhiteList,
    checkWhiteListIpsExistsInBlackList
}