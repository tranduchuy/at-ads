module.exports = {
    KeyWordMatchType: {
        "Exact"  : 'Chính xác',
        "Phrase" : 'Cụm từ',
        "Broad"  : 'Rộng',
        " --"    : 'Không xác định'
    },
    Device : {
        'Computers'                                    : 'Máy tính',
        'Tablets with full browsers'                   : 'Máy tính bảng',
        'Mobile devices with full browsers'            : 'Điện thoại',
        'Other'                                        : 'Không xác định',
        'Devices streaming video content to TV screens': 'Đầu thu phát'
    },
    fiedlsArr: [
        'KeywordMatchType',
        'Device',
        'Date',
        'ClickType',
        'CriteriaId',
        'CriteriaParameters',
        'AdGroupId',
        'AdGroupName',
        'CampaignId',
        'CampaignName',
        'GclId',
        'LopRegionCriteriaId',
        'LopMostSpecificTargetId',
        'LopCityCriteriaId',
        'LopCountryCriteriaId'
    ],
    nameWillSaveIntoDb: {
        'Match type'                                        : 'keywordMatchType',
        'Device'                                            :'device',
        'Day'                                               : 'dateOfTakingReport',
        'Click type'                                        : 'clickType',
        'Keyword ID'                                        : 'keywordId',
        'Keyword / Placement'                               : 'keyword',
        'Ad group ID'                                       : 'adGroupId',
        'Ad group'                                          : 'adGroupName',
        'Campaign ID'                                       : 'campaignId',
        'Campaign'                                          : 'campaignName',
        'Google Click ID'                                   : 'gclId',
        'Region (Physical location)'                        : 'lopRegionCriteriaId',
        'Most specific location target (Physical location)' : 'lopMostSpecificTargetId',
        'City (Physical location)'                          : 'lopCityCriteriaId',
        'Country/Territory (Physical location)'             : 'lopCountryCriteriaId',
    }
};