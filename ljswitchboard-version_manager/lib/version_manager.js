/**
 * version_manager.js for LabJack Switchboard.  Provides Kipling with the ability
 * to query for various versions of LabJack software versions, firmeware
 * versions, and drivers
 *
 * @author Chris Johnson (LabJack, 2014)
**/

// nodejs requires:
// var child_process = require('child_process');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

// 3rd party npm library requires:
var q = require('q');
var fetch = require('node-fetch');
var async = require('async');
var path = require('path');

var cheerio = require('cheerio');
var semver = require('./semver_min');


var eventList = {
    'ERROR_PARSING_PAGE_DATA': 'ERROR_PARSING_PAGE_DATA',
    'WARNING': 'WARNING',
    'ERROR': 'ERROR',
};

var version_manager_pkg_info = require('../package.json');

function labjackVersionManager() {
    this.getVersionManagerVersion = function() {
        var version = 0.000;
        if(version_manager_pkg_info.version) {
            version = version_manager_pkg_info.version;
        } else {
            console.log('pkg info', version_manager_pkg_info);
        }
        return version;
    }
    this.kiplingUpdateLinks = {
        "current_win":      "https://s3.amazonaws.com/ljrob/win32/kipling/kipling_win.zip",
        "beta_win":         "https://s3.amazonaws.com/ljrob/win32/kipling/beta/kipling_beta_win.zip",
        "test_win":         "https://s3.amazonaws.com/ljrob/win32/kipling/test/kipling_test_win.zip",

        "current_mac":      "https://s3.amazonaws.com/ljrob/mac/kipling/kipling_mac.zip",
        "beta_mac":         "https://s3.amazonaws.com/ljrob/mac/kipling/beta/kipling_beta_mac.zip",
        "test_mac":         "https://s3.amazonaws.com/ljrob/mac/kipling/test/kipling_test_mac.zip",

        "current_linux32":  "https://s3.amazonaws.com/ljrob/linux32/kipling/kipling_lin32.zip",
        "beta_linux32":     "https://s3.amazonaws.com/ljrob/linux32/kipling/beta/kipling_beta_lin32.zip",
        "test_linux32":     "https://s3.amazonaws.com/ljrob/linux32/kipling/test/kipling_test_lin32.zip",

        "current_linux64":  "https://s3.amazonaws.com/ljrob/linux64/kipling/kipling_lin64.zip",
        "beta_linux64":     "https://s3.amazonaws.com/ljrob/linux64/kipling/beta/kipling_beta_lin64.zip",
        "test_linux64":     "https://s3.amazonaws.com/ljrob/linux64/kipling/test/kipling_test_lin64.zip"
    };

    // define dict object with various urls in it
    this.urlDict = {
        "kipling_old": {
            "type":"kipling",
            "upgradeReference": "https://old3.labjack.com/support/software/installers/ljm",
            "platformDependent": true,
            "types": ['current','beta','test'],
            "urls":[
                {"url": "http://files.labjack.com/versions/ljrob/win32/kipling/current.txt", "type": "current_win"},
                {"url": "http://files.labjack.com/versions/ljrob/mac/kipling/current.txt", "type": "current_mac"},
                {"url": "http://files.labjack.com/versions/ljrob/linux32/kipling/current.txt", "type": "current_linux32"},
                {"url": "http://files.labjack.com/versions/ljrob/linux64/kipling/current.txt", "type": "current_linux64"},

                // {"url": "http://files.labjack.com/versions/ljrob/win32/kipling/current.txt", "type": "test_win"},
                // {"url": "http://files.labjack.com/versions/ljrob/mac/kipling/current.txt", "type": "test_mac"},
                // {"url": "http://files.labjack.com/versions/ljrob/linux32/kipling/current.txt", "type": "test_linux32"},
                // {"url": "http://files.labjack.com/versions/ljrob/linux64/kipling/current.txt", "type": "test_linux64"},

                {"url": "http://files.labjack.com/versions/ljrob/win32/kipling/beta.txt", "type": "beta_win"},
                {"url": "http://files.labjack.com/versions/ljrob/mac/kipling/beta.txt", "type": "beta_mac"},
                {"url": "http://files.labjack.com/versions/ljrob/linux32/kipling/beta.txt", "type": "beta_linux32"},
                {"url": "http://files.labjack.com/versions/ljrob/linux64/kipling/beta.txt", "type": "beta_linux64"},

                // {"url": "http://files.labjack.com/versions/ljrob/win32/kipling/beta.txt", "type": "test_win"},
                // {"url": "http://files.labjack.com/versions/ljrob/mac/kipling/beta.txt", "type": "test_mac"},
                // {"url": "http://files.labjack.com/versions/ljrob/linux32/kipling/beta.txt", "type": "test_linux32"},
                // {"url": "http://files.labjack.com/versions/ljrob/linux64/kipling/beta.txt", "type": "test_linux64"},

                {"url": "http://files.labjack.com/versions/ljrob/win32/kipling/test.txt", "type": "test_win"},
                {"url": "http://files.labjack.com/versions/ljrob/mac/kipling/test.txt", "type": "test_mac"},
                {"url": "http://files.labjack.com/versions/ljrob/linux32/kipling/test.txt", "type": "test_linux32"},
                {"url": "http://files.labjack.com/versions/ljrob/linux64/kipling/test.txt", "type": "test_linux64"}
            ]
        },
        // Re-define the Kipling tag to point to new downloads page
        "kipling": {
            "type":"kiplingDownloadsPage",
            "upgradeReference": "https://old3.labjack.com/support/software/installers/ljm",
            "platformDependent": true,
            "types": ['current'],
            "urls":[
                {"url": "https://old3.labjack.com/support/software/installers/ljm", "type": "current_win"},
                {"url": "https://old3.labjack.com/support/software/installers/ljm", "type": "current_mac"},
                {"url": "https://old3.labjack.com/support/software/installers/ljm", "type": "current_linux32"},
                {"url": "https://old3.labjack.com/support/software/installers/ljm", "type": "current_linux64"}
            ]
        },
        "ljm": {
            "type":"ljmDownloadsPage",
            "upgradeReference": "https://old3.labjack.com/support/software/installers/ljm",
            "platformDependent": true,
            "types": ['current'],
            "urls":[
                {"url": "https://old3.labjack.com/support/software/installers/ljm", "type": "current_win"},
                {"url": "https://old3.labjack.com/support/software/installers/ljm", "type": "current_mac"},
                {"url": "https://old3.labjack.com/support/software/installers/ljm", "type": "current_linux32"},
                {"url": "https://old3.labjack.com/support/software/installers/ljm", "type": "current_linux64"}
            ]
        },
        "t7": {
            "type":"t7FirmwarePage",
            "upgradeReference": "https://old3.labjack.com/support/firmware/t7",
            "platformDependent": false,
            "urls":[
                {"url": "https://old3.labjack.com/support/firmware/t7", "type": "organizer-current"},
                {"url": "https://old3.labjack.com/support/firmware/t7", "type": "current"},
                {"url": "https://old3.labjack.com/support/firmware/t7/beta", "type": "beta"},
                // {"url": "https://labjack.com/support/firmware/t7", "type": "all"},
            ],
        },
        "t4": {
            "type":"t4FirmwarePage",
            "upgradeReference": "https://old3.labjack.com/support/firmware/t4",
            "platformDependent": false,
            "urls":[
                // {"url": "https://labjack.com/sites/default/files/organized/special_firmware/T4/alpha_fw/t4_alpha_versions.json", "type": "static-t4-alpha-organizer"},
                {"url": "https://old3.labjack.com/support/firmware/t4", "type": "organizer-current"},
                {"url": "https://old3.labjack.com/support/firmware/t4", "type": "current"},
                // {"url": "https://labjack.com/support/firmware/t4/beta", "type": "beta"},
                // {"url": "https://labjack.com/support/firmware/t7", "type": "all"},
            ],
        },
        "digit": {
            "type":"digitFirmwarePage",
            "upgradeReference": "https://old3.labjack.com/support/firmware/digit",
            "platformDependent": false,
            "urls":[
                {"url": "https://old3.labjack.com/support/firmware/digit", "type": "current"},
                {"url": "https://old3.labjack.com/support/firmware/digit/beta", "type": "beta"},
                {"url": "https://old3.labjack.com/support/firmware/digit/old", "type": "old"},
            ]
        }
    };


    this.innerAdvancedPageParser = function(options, retData) {
        var url = options.url;              // Page URL to use for caching
        var pageType = options.pageType;    // Either 'software' or 'firmware'
        var releaseType = options.releaseType;  // Either 'stable' or 'beta'
        var platformType = options.platformType; // either mac, win, linux32, or linux64
        var programName = options.programName;  // A program name to look for

        var $;
        if(self.cachedDoms.has(url)) {
            $ = self.cachedDoms.get(url);
        } else {
            try {
                $ = cheerio.load(options.pageData);
            } catch(err) {
                console.log('Error loading page (cheerio)...', err);
            }
            self.cachedDoms.set(url, $);
        }

        var isValid = true;

        var currentNode;
        if(pageType === 'software') {
            currentNode = $('.node-software-platform');
            isValid = (currentNode.length >= 0);

            if(isValid) {
                var platformSelector = {
                    'win': '.platform-windows',
                    'mac': '.platform-macos',
                    'linux32': '.platform-linux-32-bit',
                    'linux64': '.platform-linux-64-bit',
                }[platformType];
                currentNode = currentNode.find(platformSelector);
                isValid = (currentNode.length >= 0);
            }

            // Get the parent element
            if(isValid) {
                currentNode = currentNode.parent();
                isValid = (currentNode.length >= 0);
            }

            // Limit by group
            if(isValid) {
                var groupSelector = {
                    'beta': '.group-beta',
                    'stable': '.group-stable',
                }[releaseType];
                currentNode = currentNode.find(groupSelector);
                isValid = (currentNode.length >= 0);
            }

            // Parse out actual file data
            if(isValid) {
                var fileSearchStr = '.file a';
                var descriptionSearchStr = {
                    'stable': '.field-name-field-stable-components li',
                    'beta': '.field-name-field-beta-components li',
                }[releaseType];
                retData.upgradeLink = currentNode.find(fileSearchStr).attr('href');
                var fileDescription = currentNode.find(descriptionSearchStr);

                var versionInfo = {};
                fileDescription.each(function(index, element) {
                    try {
                        var versionStr = $(element).text();
                        var splitStr = versionStr.split(' - Version: ');
                        var programName = splitStr[0];
                        var safeProgramName = programName.split(' ').join('_').toLowerCase();
                        var versionStr = splitStr[1];
                        versionInfo[safeProgramName] = versionStr;
                    } catch(err) {
                        console.log('error in each', err);
                        // Error getting contained versions
                    }
                });

                if(versionInfo[programName]) {
                    retData.version = versionInfo[programName];
                    retData.isValid = true;
                }
            }
        } else if(pageType === 'firmware') {
            currentNode = $('.node-firmware-section');
            isValid = (currentNode.length >= 0);

             // Limit by group
            if(isValid) {
                var groupSelector = {
                    'beta': '.group-beta',
                    'stable': '.group-stable',
                }[releaseType];
                currentNode = currentNode.find(groupSelector);
                isValid = (currentNode.length >= 0);
            }
            // Parse out actual file data
            if(isValid) {
                var fileSearchStr = '.file a';

                retData.upgradeLink = currentNode.find(fileSearchStr).attr('href');

                var fileName = path.basename(retData.upgradeLink);
                var version = (parseFloat(fileName.split('_')[1])/10000).toFixed(4);
                retData.version = version;
                retData.isValid = true;
            }
        }

        return retData;
    };
    this.advancedPageParser = function(options) {
        var runParser = true;

        var keys = Object.keys(options);
        var requiredKeys = ['url', 'pageData', 'pageType'];
        requiredKeys.forEach(function(key) {
            if(keys.indexOf(key) < 0) {
                runParser = false;
                console.error('Not running parser, missing key', key);
            }
        });
        var retData = {
            'isValid': false,
            'upgradeLink': '',
            'version': '',
        };
        if(runParser) {
            try {
                return self.innerAdvancedPageParser(options, retData);
            } catch(err) {
                console.log('Error...', err);
                return retData;
            }
        } else {
            return retData;
        }
    };
    this.strategies = {
        kipling: function(listingArray, pageData, urlInfo, name) {
            listingArray.push({
                "upgradeLink":self.kiplingUpdateLinks[urlInfo.type],
                "version":pageData,
                "type":urlInfo.type,
                "key":urlInfo.type + '-' + pageData
            });
            return;
        },
        ljm_wrapper: function(listingArray, pageData, urlInfo, name) {
            listingArray.push({
                "upgradeLink":"",
                "version":pageData,
                "type":urlInfo.type,
                "key":urlInfo.type + '-' + pageData
            });
            return;
        },
        kiplingDownloadsPage: function(listingArray, pageData, urlInfo, name) {
            var platform = urlInfo.type.split('_')[1];
            var parsedData = self.advancedPageParser({
                'url': urlInfo.url,
                'pageData': pageData,
                'pageType': 'software',
                'platformType': platform,
                'releaseType': 'stable',
                'programName': 'kipling',
            });

            // console.log('Data:', parsedData, parsedData.version);

            if(parsedData.isValid) {
                listingArray.push({
                    'upgradeLink': parsedData.upgradeLink,
                    'version': parsedData.version,
                    'type': urlInfo.type,
                    'key': urlInfo.type + '-' + parsedData.version,
                });
            } else {
                // console.error('Failed to get latest Kipling version', name, platform);
                self.emit(eventList.ERROR_PARSING_PAGE_DATA, {
                    'urlInfo': urlInfo,
                    'name': name,
                });
            }
            return;
        },
        ljmDownloadsPage: function(listingArray, pageData, urlInfo, name) {
            var platform = urlInfo.type.split('_')[1];
            var parsedData = self.advancedPageParser({
                'url': urlInfo.url,
                'pageData': pageData,
                'pageType': 'software',
                'platformType': platform,
                'releaseType': 'stable',
                'programName': 'ljm_library',
            });

            // console.log('Data:', parsedData, parsedData.version);

            if(parsedData.isValid) {
                listingArray.push({
                    'upgradeLink': parsedData.upgradeLink,
                    'version': parsedData.version,
                    'type': urlInfo.type,
                    'key': urlInfo.type + '-' + parsedData.version,
                });
            } else {
                // console.error('Failed to get latest LJM version', name, platform);
                self.emit(eventList.ERROR_PARSING_PAGE_DATA, {
                    'urlInfo': urlInfo,
                    'name': name,
                });
            }
            return;
        },
        t4FirmwarePage: function(listingArray, pageData, urlInfo, name) {
            if(urlInfo.type === 'organizer-current') {
                var parsedData = self.advancedPageParser({
                    'url': urlInfo.url,
                    'pageData': pageData,
                    'pageType': 'firmware',
                    'releaseType': 'stable',
                });

                if(parsedData.isValid) {
                    listingArray.push({
                        'upgradeLink': parsedData.upgradeLink,
                        'version': parsedData.version,
                        'type': urlInfo.type,
                        'key': urlInfo.type + '-' + parsedData.version,
                        'isValid': true,
                    });
                } else {
                    // OLD T7 CODE...
                    // Insert a defined reference to the 1.0146 firmware version
                    // to define it as the "default current version" just incase
                    // website parsing breaks.
                    // listingArray.push({
                    //     'upgradeLink': 'https://labjack.com/sites/default/files/firmware/T4firmware_010146_2015-01-19.bin',
                    //     'version': '1.0146',
                    //     'type': urlInfo.type,
                    //     'key': urlInfo.type + '-' + parsedData.version,
                    //     'isValid': false,
                    // });
                }
                // console.log('!!! T4 organizer-current'.green, listingArray);
            } else {
                // var FIRMWARE_LINK_REGEX = /<a.*href\=\"http.*T4firmware\_([\d\-]+)\_([\d\-]+)\.bin".*>.*<\/a>/g;
                // var match = FIRMWARE_LINK_REGEX.exec(pageData);

                var $ = cheerio.load(pageData);

                var linkElements = $('a');
                linkElements.each(function(i, linkElement){
                    var ele = $(linkElement);
                    var targetURL = ele.attr('href');
                    var FIRMWARE_FILE_REGEX = /http.*T4firmware\_([\d\-]+).*\.bin/g;
                    var isValidFWLink = FIRMWARE_FILE_REGEX.test(targetURL);
                    if(isValidFWLink) {
                        var fileName = path.basename(targetURL);
                        // console.log('Ele....', fileName);
                        // console.log('Adding...', targetURL, targetURL.length);
                        // var targetURL = match[0].replace(/href\=\"/g, '');
                        // targetURL = targetURL.replace(/\"/g, '');
                        var version = (parseFloat(fileName.split('_')[1])/10000).toFixed(4);
                        listingArray.push({
                            "upgradeLink":targetURL,
                            "version":version,
                            "type":urlInfo.type,
                            "key":urlInfo.type + '-' + version
                        });
                    } else {
                        // console.log('Invalid URL', targetURL, targetURL.length);
                    }
                    // console.log('T7 FW Versions', version);
                    // console.log('Type....', urlInfo.type);
                    // console.log('targetURL', targetURL);
                    // console.log('fileName', fileName);
                });
            }
            return;
        },
        /**
         * Example T7 fw file name: T7firmware_010100_2014-05-12.bin
         * Example T7 fw file download link:
         * https://labjack.com/sites/default/files/2014/05/T7firmware_010100_2014-05-12.bin
        **/
        t7FirmwarePage: function(listingArray, pageData, urlInfo, name) {
            if(urlInfo.type === 'organizer-current') {
                var parsedData = self.advancedPageParser({
                    'url': urlInfo.url,
                    'pageData': pageData,
                    'pageType': 'firmware',
                    'releaseType': 'stable',
                });

                if(parsedData.isValid) {
                    listingArray.push({
                        'upgradeLink': parsedData.upgradeLink,
                        'version': parsedData.version,
                        'type': urlInfo.type,
                        'key': urlInfo.type + '-' + parsedData.version,
                        'isValid': true,
                    });
                } else {
                    // Insert a defined reference to the 1.0146 firmware version
                    // to define it as the "default current version" just incase
                    // website parsing breaks.
                    listingArray.push({
                        'upgradeLink': 'https://labjack.com/sites/default/files/firmware/T7firmware_010146_2015-01-19.bin',
                        'version': '1.0146',
                        'type': urlInfo.type,
                        'key': urlInfo.type + '-' + parsedData.version,
                        'isValid': false,
                    });
                }
                // console.log('!!! T7 organizer-current'.green, listingArray.length);
            } else {
                // var FIRMWARE_LINK_REGEX = /<a.*href\=\"http.*T7firmware\_([\d\-]+)\_([\d\-]+)\.bin".*>.*<\/a>/g;
                // var match = FIRMWARE_LINK_REGEX.exec(pageData);
                var $ = cheerio.load(pageData);

                var linkElements = $('a');
                linkElements.each(function(i, linkElement){
                    var ele = $(linkElement);
                    var targetURL = ele.attr('href');
                    var FIRMWARE_FILE_REGEX = /http.*T7firmware\_([\d\-]+).*\.bin/g;
                    var isValidFWLink = FIRMWARE_FILE_REGEX.test(targetURL);
                    if(isValidFWLink) {
                        var fileName = path.basename(targetURL);
                        // console.log('Ele....', fileName);
                        // console.log('Adding...', targetURL, targetURL.length);
                        // var targetURL = match[0].replace(/href\=\"/g, '');
                        // targetURL = targetURL.replace(/\"/g, '');
                        var version = (parseFloat(fileName.split('_')[1])/10000).toFixed(4);
                        listingArray.push({
                            "upgradeLink":targetURL,
                            "version":version,
                            "type":urlInfo.type,
                            "key":urlInfo.type + '-' + version
                        });
                    } else {
                        // console.log('Invalid URL', targetURL, targetURL.length);
                    }
                    // console.log('T7 FW Versions', version);
                    // console.log('Type....', urlInfo.type);
                    // console.log('targetURL', targetURL);
                    // console.log('fileName', fileName);
                });
            }
            return;
        },
        /**T7firmware_010100_2014-05-12.bin
         * Example digit fw file name: DigitFW_007416_01232013.bin
         * Example digit fw file download link:
         * https://labjack.com/sites/default/files/2013/01/DigitFW_007416_01232013.bin
        **/
        digitFirmwarePage: function(listingArray, pageData, urlInfo, name) {
            // var FIRMWARE_LINK_REGEX = /href=\".*DigitFW\_([\d\_]+).bin\"(?=\s)/g;
            var FIRMWARE_LINK_REGEX = /<a href\=\"http.*DigitFW\_([\d\-]+)\_([\d\-]+)\.bin".*>.*<\/a>/g;
            var match = FIRMWARE_LINK_REGEX.exec(pageData);
            while (match !== null) {
                var $ = cheerio.load(match[0]);
                var linkElements = $('a');

                linkElements.each(function(i, linkElement){
                    var ele = $(linkElement);
                    // console.log('ele', ele);
                    var targetURL = ele.attr('href');
                    var fileName = path.basename(targetURL);

                    var version = parseFloat(fileName.split('_')[1]/10000).toFixed(4);
                    // console.log('targetURL', targetURL);
                    // console.log('version', version);
                    // console.log('type', urlInfo.type);
                    listingArray.push({
                        "upgradeLink":targetURL,
                        "version":version,
                        "type":urlInfo.type,
                        "key":urlInfo.type + '-' + version
                    });
                });
                match = FIRMWARE_LINK_REGEX.exec(pageData);
            }
            return;
        },
    };
    this.cachedDoms = new Map();
    this.pageCache = new Map();
    this.infoCache = {};
    this.dataCache = {};
    this.isDataComplete = false;
    this.isError = false;
    this.errorInfo = null;


    /**
     * Function that prints out all urls to console.log
    **/
    this.pBuf = function() {
        console.log('Num Pages Cached',self.pageCache.size);
        self.pageCache.forEach(function(val,key){
            console.log('Cached URLs',key);
        });
    };
    this.buildQuery = function(savedData, strategy, urlInfo, name) {
        var dataQuery = function(callback) {
            var url = urlInfo.url;
            // Check to see if the page has been cached, if it is don't query
            // for it
            if(!self.pageCache.has(url)) {
                // Perform request to get pageData/body
                fetch(url, { timeout: 20000 })
                    .then(function (res) {
                        if (res.ok) {
                            return res.text();
                        }

                        if (res.status >= 400) {
                            const err = {
                                "num": -1,
                                "str": res.statusText,
                                "quit": true,
                                "code": res.status,
                                "url": url
                            };
                            self.reportError(err);
                            // callback(err);
                            return res.statusText;
                        }

                        var message = '';
                        var err = null;
                        if (error) {
                            // console.log('!!! request page ERROR!!!', error);
                            // Report a TCP Level error likely means computer is not
                            // connected to the internet.
                            if (error.code === 'ENOTFOUND') {
                                message = "TCP Error, computer not connected to network: ";
                            } else if(error.code === 'ETIMEDOUT') {
                                message = "TCP Error, no internet connection: ";
                            } else {
                                message = "Unknown TCP Error: ";
                            }
                            err = {
                                "num": -1,
                                "str": message + error.toString(),
                                "quit": true,
                                "code": error.code,
                                "url": url
                            };
                            self.reportError(err);
                            callback(err);
                        } else if (error.status != 200) {
                            // Report a http error, likely is 404, page not found.
                            message = "Got Code: ";
                            message += error.status.toString();
                            message += "; loading: " + url;
                            message += "; name: " + name;
                            message += "; type: " + urlInfo.type;
                            err = {
                                "num": response.statusCode,
                                "str": message,
                                "quit": false,
                                "url": url
                            };
                            self.reportWarning(err);
                            callback();
                        }
                    })
                    .then(function (body) {
                        self.pageCache.set(url, body);
                        try {
                            strategy(savedData, body, urlInfo, name);
                        } catch(innerErr) {
                            console.error('Error calling strategy...', innerErr, name);
                        }
                        callback();
                    })
                    .catch(function (error) {
                        console.error('fetch error', error);
                        callback(error);
                    });
            } else {
                // get pageData/body from cache
                var pageData = self.pageCache.get(url);
                strategy(savedData, pageData, urlInfo, name);
                callback();
            }
        };
        return dataQuery;
    };
    this.saveTempData = function(name, rawInfos) {
        var systemType = self.getLabjackSystemType();
        var platformDependent = self.urlDict[name].platformDependent;

        var organizer = null;
        var infos = [];
        var numCurrent = 0;
        rawInfos.forEach(function(info) {
            if(info.type.indexOf('organizer') >= 0) {
                organizer = info;
            } else {
                if(info.type.indexOf('current') >= 0) {
                    numCurrent += 1;
                }
                infos.push(info);
            }
        });

        if(organizer) {
            if((numCurrent == 1) && (organizer.isValid == false)) {
                console.log('Defaulting to the current-version');
                infos.forEach(function(info) {
                    if(info.type.indexOf('current') >= 0) {
                        organizer = info;
                    }
                });
            } else if(organizer.isValid == false) {
                console.log('!! Using default fw version as current');
            }
            // Determine versioning scheme, is the version a number?
            if(semver.valid(organizer.version)) {
                // The version follows semver.
                organizer.eq = function(baseVersion, checkVersion) {
                    return semver.eq(baseVersion, checkVersion);
                };
                organizer.gt = function(baseVersion, checkVersion) {
                    return semver.gt(baseVersion, checkVersion);
                };
            } else {
                // The version should be parsed as a number.
                var orgVersionNum = parseFloat(organizer.version);
                if(isNaN(orgVersionNum)) {
                    orgVersionNum = 0;
                }
                organizer.versionNum = orgVersionNum;
                organizer.eq = function(baseVersion, checkVersion) {
                    return baseVersion == checkVersion;
                };
                organizer.gt = function(baseVersion, checkVersion) {
                    return baseVersion > checkVersion;
                };
            }

            // Function to determine the actual type of a given version.
            organizer.getType = function(checkVersion) {
                var orgType = 'beta';
                // console.log('Organizer Version', this.version);
                // console.log('Given Version', checkVersion);
                if(this.eq(this.version, checkVersion)) {
                    orgType = 'current';
                }
                if(this.gt(this.version, checkVersion)) {
                    orgType = 'old';
                }
                return orgType;
            };
        }

        // console.log(' - name:',name);
        // console.log(' - is dependent:',platformDependent);
        // console.log(' - systemType:',systemType);
        // console.log(' - organizer', organizer);
        // // console.log(' - infos', infos);
        // console.log('');

        self.infoCache[name] = {};
        self.dataCache[name] = {};
        infos.forEach(function(info) {
            // Check to see if the type needs to be altered with the organizer.
            if(organizer) {
                info.type = organizer.getType(info.version);
                info.key = info.type + '-' + info.version;
            }

            // Initialize the infoCache array if it is empty
            if (typeof(self.infoCache[name][info.type]) === 'undefined') {
                self.infoCache[name][info.type] = [];
            }
            var data = {
                upgradeLink: info.upgradeLink,
                version: info.version,
                type: info.type,
                key: info.key
            };

            // Determine if the node should be inserted into the array.  Check
            // if that version has already been found.
            var addToCache = true;
            self.infoCache[name][info.type].forEach(function(cachedInfo) {
                if(cachedInfo.version === info.version) {
                    addToCache = false;
                }
            });

            // If the node should be added, add it.
            if(addToCache) {
                self.infoCache[name][info.type].push(data);
                if (platformDependent) {
                    var isCurSys = info.type.search(systemType) > 0;
                    var curType = info.type.split('_'+systemType)[0];
                    if(isCurSys) {
                        // console.log('Current Type',info.type)
                        if (typeof(self.dataCache[name][curType]) === 'undefined') {
                            self.dataCache[name][curType] = [];
                        }
                        self.dataCache[name][curType].push(data);
                    }

                } else {
                    if (typeof(self.dataCache[name][info.type]) === 'undefined') {
                        self.dataCache[name][info.type] = [];
                    }
                    self.dataCache[name][info.type].push(data);
                }
            }
        });
    };
    this.queryForVersions = function(name) {
        var defered = q.defer();
        var info = self.urlDict[name];
        var queriedData = [];

        if(typeof(info) !== 'undefined') {
            // Get the stratigy function
            var strategyType = info.type;
            var strategy = self.strategies[strategyType];

            if(typeof(strategy) !== 'undefined') {
                // build an array of querys that need to be made to collect data
                var prefetchQuerys = [];
                var prefetchDict = new Map();
                var querys  = [];

                // Make an effort to minimize the number of requests
                info.urls.map(function(urlInfo) {
                    var url = urlInfo.url;
                    var query = self.buildQuery(queriedData, strategy, urlInfo, name);
                    if (!prefetchDict.has(url)) {
                        prefetchDict.set(url,query);
                    } else {
                        querys.push(query);
                    }
                });

                // Move dict querys into the array
                prefetchDict.forEach(function(query){
                    prefetchQuerys.push(query);
                });

                // function to asynchronously execute the list of prefetchQuerys
                var execPrefetchQuerys = function() {
                    async.eachSeries(prefetchQuerys,
                        function(query, callback) {
                            query(callback);
                        }, function(err) {
                            if(err) {
                                if(err.quit) {
                                    defered.reject(err);
                                } else {
                                    execRemainder();
                                }
                            } else {
                                execRemainder();
                            }
                        });
                };

                // function to asynchronously execute the list of remainder
                var execRemainder = function() {
                    async.eachSeries(querys,
                        function(query, callback) {
                            query(callback);
                        }, function(err) {
                            if(err) {
                                if(err.quit) {
                                    defered.reject(err);
                                } else {
                                    if (queriedData.length > 0) {
                                        defered.resolve(queriedData);
                                    } else {
                                        defered.reject(err);
                                    }
                                }
                            } else {
                                self.saveTempData(name,queriedData);
                                defered.resolve(queriedData);
                            }
                        });
                };

                // execute prefetchQuerys
                execPrefetchQuerys();
                var numQuerys = prefetchQuerys.length + querys.length;
                // console.log('Num Querys:', numQuerys, 'Num Cached', prefetchQuerys.length);
            } else {
                // if the strategies object is undefined report an error
                defered.reject('invalid strategy');
            }
        } else {
            // if the info object is undefined report an error
            defered.reject('invalid type');
        }
        return defered.promise;
    };


    this.getKiplingVersions = function() {
        var defered = q.defer();
        self.queryForVersions('kipling')
        .then(defered.resolve,defered.reject);
        return defered.promise;
    };
    this.getLJMVersions = function() {
        var defered = q.defer();
        self.queryForVersions('ljm')
        .then(defered.resolve,defered.reject);
        return defered.promise;
    };
    this.getLJMWrapperVersions = function() {
        var defered = q.defer();
        self.queryForVersions('ljm_wrapper')
        .then(defered.resolve,defered.reject);
        return defered.promise;
    };
    /**
     * Function that querys & parses labjack.com/support/firmware/t7, /beta, and
     *  /old for different versions of T7 firmware & appropriate links.
     *
     * @return {[type]} [description]
    **/
    this.getT7FirmwareVersions = function() {
        var defered = q.defer();
        self.queryForVersions('t7')
        .then(defered.resolve,defered.reject);
        return defered.promise;
    };
    this.getT4FirmwareVersions = function() {
        var defered = q.defer();
        self.queryForVersions('t4')
        .then(defered.resolve,defered.reject);
        return defered.promise;
    };
    this.getDigitFirmwareVersions = function() {
        var defered = q.defer();
        self.queryForVersions('digit')
        .then(defered.resolve,defered.reject);
        return defered.promise;
    };
    this.getAllVersions = function() {
        // Re-set constants
        self.infoCache = {};
        self.dataCache = {};
        self.infoCache.warning = false;
        self.infoCache.warnings = [];
        self.isDataComplete = false;
        self.isError = false;
        self.infoCache.isError = false;
        self.infoCache.errors = [];
        var errorFunc = function(err) {
            var errDefered = q.defer();
            if (err) {
                if(err.quit) {
                    self.isError = true;
                    self.errorInfo = err;
                    defered.reject(err);
                    errDefered.reject();
                } else {
                    errDefered.resolve();
                }
                // console.error('Error Querying LabJack Versions',err);
            }
            return errDefered.promise;
        };
        var defered = q.defer();
        self.getLJMVersions()
        .then(self.getKiplingVersions, errorFunc)
        // .then(self.getLJMWrapperVersions, errorFunc)
        .then(self.getT7FirmwareVersions, errorFunc)
        .then(self.getT4FirmwareVersions, errorFunc)
        .then(self.getDigitFirmwareVersions, errorFunc)
        .then(function() {
            self.isDataComplete = true;
            defered.resolve(self.infoCache);
        }, errorFunc);
        return defered.promise;
    };
    this.clearPageCache = function() {
        self.pageCache.clear();
        self.cachedDoms.clear();
    };
    this.getStatus = function() {
        return self.isDataComplete;
    };
    this.isIssue = function() {
        if(self.isDataComplete) {
            return self.infoCache.warning || self.infoCache.isError;
        } else {
            return true;
        }
    };
    this.reportWarning = function(data) {
        self.infoCache.warning = true;
        self.infoCache.warnings.push(data);
        self.emit(eventList.WARNING, {
            'type': 'warning',
            'data': data
        });
    };
    this.reportError = function(data) {
        self.infoCache.isError = true;
        self.infoCache.errors.push(data);
        self.emit(eventList.WARNING, {
            'type': 'error',
            'data': data
        });
        console.warn(JSON.stringify(data, null, 2));
    };
    this.getIssue = function() {
        var issue;
        if(self.isIssue()) {
            if(self.infoCache.isError) {
                issue = {"type": "error","data":self.infoCache.errors};
            } else {
                issue = {"type": "warning","data":self.infoCache.warnings};
            }
        } else {
            issue = {"type": "none","data":null};
        }
        return issue;
    };
    this.waitForData = function() {
        var defered = q.defer();
        var checkInterval = 100;
        var iteration = 0;
        var maxCheck = 100;

        // Define a function that can delays & re-calls itself until it errors
        // out or resolves to the defered q object.
        var isComplete = function() {
            return !(self.isDataComplete || self.isError);
        };
        var finishFunc = function() {
            // console.log('version_manager.js - Num Iterations',iteration);
            if(self.isError) {
                defered.reject(self.errorInfo);
            } else {
                defered.resolve(self.infoCache);
            }
        };
        var waitFunc = function() {
            if(isComplete()) {
                if (iteration < maxCheck) {
                    iteration += 1;
                    setTimeout(waitFunc,checkInterval);
                } else {
                    defered.reject('Max Retries Exceeded');
                }
            } else {
                finishFunc();
            }
        };

        // if the data isn't complete then
        if(isComplete()) {
            setTimeout(waitFunc,checkInterval);
        } else {
            finishFunc();
        }
        return defered.promise;
    };

    this.getLabjackSystemType = function() {
        var ljSystemType = '';
        var ljPlatformClass = {
            'ia32': '32',
            'x64': '64',
            'arm': 'arm'
        }[process.arch];
        var ljPlatform = {
            'linux': 'linux',
            'linux2': 'linux',
            'sunos': 'linux',
            'solaris': 'linux',
            'freebsd': 'linux',
            'openbsd': 'linux',
            'darwin': 'mac',
            'mac': 'mac',
            'win32': 'win',
        }[process.platform];
        if(typeof(ljPlatform) !== 'undefined') {
            if(ljPlatform === 'linux') {
                ljSystemType = ljPlatform + ljPlatformClass;
            } else {
                ljSystemType = ljPlatform;
            }

        } else {
            console.error('Running Kipling on Un-supported System Platform');
        }
        return ljSystemType;
    };
    this.getInfoCache = function() {
        return JSON.parse(JSON.stringify(self.infoCache));
    };

    var populateMissingKeys = function(obj, requiredKeys) {
        var keys = Object.keys(obj);
        requiredKeys.forEach(function(requiredKey) {
            if(typeof(obj[requiredKey]) === 'undefined') {
                obj[requiredKey] = [];
            }
        });
    };
    this.getCachedT7Versions = function() {
        var t7Data = {};
        if(typeof(self.infoCache.t7) !== 'undefined') {
            t7Data = JSON.parse(JSON.stringify(self.infoCache.t7));
            // populateMissingKeys(t7Data, ['beta', 'current', 'old']);
            t7Data.isValid = true;
        } else {
            t7Data.current = [];
            t7Data.beta = [];
            t7Data.old = [];
            t7Data.isValid = false;
        }
        return t7Data;
    };

    this.getCachedT4Versions = function() {
        var t4Data = {};
        if(typeof(self.infoCache.t4) !== 'undefined') {
            t4Data = JSON.parse(JSON.stringify(self.infoCache.t4));
            // populateMissingKeys(t4Data, ['beta', 'current', 'old']);
            t4Data.isValid = true;
        } else {
            t4Data.current = [];
            t4Data.beta = [];
            t4Data.old = [];
            t4Data.isValid = false;
        }
        return t4Data;
    };
    this.getCachedDigitVersions = function() {
        var digitData = {};
        if(typeof(self.infoCache.t4) !== 'undefined') {
            digitData = JSON.parse(JSON.stringify(self.infoCache.digit));
            // populateMissingKeys(t4Data, ['beta', 'current', 'old']);
            digitData.isValid = true;
        } else {
            digitData.current = [];
            digitData.beta = [];
            digitData.old = [];
            digitData.isValid = false;
        }
        return digitData;
    };

    this.getCachedLJMVersions = function() {
        var ljmData = {};
        if(typeof(self.infoCache.ljm) !== 'undefined') {
            ljmData = JSON.parse(JSON.stringify(self.infoCache.ljm));
            ljmData.isValid = true;
        } else {
            ljmData.current_win = [];
            ljmData.current_mac = [];
            ljmData.current_linux32 = [];
            ljmData.current_linux64 = [];
            ljmData.isValid = false;
        }
        return ljmData;
    };
    this.getCachedKiplingVersions = function() {
        var kiplingData = {};
        if(typeof(self.infoCache.kipling) !== 'undefined') {
            kiplingData = JSON.parse(JSON.stringify(self.infoCache.kipling));
            kiplingData.isValid = true;
        } else {
            kiplingData.current_win = [];
            kiplingData.current_mac = [];
            kiplingData.current_linux32 = [];
            kiplingData.current_linux64 = [];
            kiplingData.isValid = false;
        }
        return kiplingData;
    };
    var isDefined = function(ele) {
        if(typeof(ele) !== 'undefined') {
            return true;
        } else {
            return false;
        }
    };

    var self = this;
}
util.inherits(labjackVersionManager, EventEmitter);
var LABJACK_VERSION_MANAGER = new labjackVersionManager();

// LABJACK_VERSION_MANAGER.getAllVersions();
// LABJACK_VERSION_MANAGER.waitForData()
// .then(function(data) {
//  console.log('LVM dataCache:',LABJACK_VERSION_MANAGER.dataCache);
//  console.log('LJM current versions',LABJACK_VERSION_MANAGER.dataCache.kipling);
//  if(LABJACK_VERSION_MANAGER.isIssue()) {
//      var issue =LABJACK_VERSION_MANAGER.getIssue();
//      console.warn('LVM Warming',issue);
//  }
// },function(err) {
//  if(LABJACK_VERSION_MANAGER.isIssue()) {
//      var issue =LABJACK_VERSION_MANAGER.getIssue();
//      console.error('LVM Error',issue);
//  }
// });

exports.lvm = LABJACK_VERSION_MANAGER;
exports.initialize = function() {
    var defered = q.defer();

    LABJACK_VERSION_MANAGER.getAllVersions();
    LABJACK_VERSION_MANAGER.waitForData()
    .then(function(data) {
        // console.log('LVM dataCache:',LABJACK_VERSION_MANAGER.dataCache);
        // console.log('LJM current versions',LABJACK_VERSION_MANAGER.dataCache.kipling);
        if(LABJACK_VERSION_MANAGER.isIssue()) {
            var issue =LABJACK_VERSION_MANAGER.getIssue();
            console.warn('LVM Warming',issue);
        }
        defered.resolve(data);
    }, function(err) {
        if(LABJACK_VERSION_MANAGER.isIssue()) {
            var issue =LABJACK_VERSION_MANAGER.getIssue();
            console.error('LVM Error',issue);
            defered.reject(issue);
        } else {
            defered.reject();
        }
    });

    return defered.promise;
};
exports.getAllVersions = LABJACK_VERSION_MANAGER.getAllVersions;

// For Testing....
// var LVM = LABJACK_VERSION_MANAGER;

// LVM.getLJMVersions()
// .then(LVM.getKiplingVersions)
// .then(LVM.getLJMWrapperVersions)
// .then(LVM.getT7FirmwareVersions)
// .then(LVM.getDigitFirmwareVersions)

// .then(LVM.getKiplingVersions)
// .then(LVM.getLJMVersions)
// .then(LVM.getLJMWrapperVersions)
// .then(LVM.getT7FirmwareVersions)
// .then(LVM.getDigitFirmwareVersions)
// LVM.getAllVersions()


/*
var vm = require('./helper_scripts/version_manager')


var formatPath = function(newPath) {
    newPath = newPath.replace(/\(/g,'\\(');
    newPath = newPath.replace(/\)/g,'\\)');
    // newPath = '"' + newPath + '"';
    return newPath;
};
var execStr = 'bash ';
execStr += '/Users/chrisjohnson/Downloads/kipling_test_mac(2)/Kipling.app/Contents/Resources/update_scripts/mac_reboot.sh ';
execStr += '/Applications/Kiplingv3 '
execStr += '/Users/chrisjohnson/Downloads/kipling_test_mac(2)/ '
execStr += 'Kipling.app '
execStr += '/Users/chrisjohnson/Downloads/kipling_test_mac(2)/Kipling.app/Contents/Resources/update_scripts'
child_process.exec(formatPath(execStr));

Script Arguments 1:
/Applications/Kiplingv3
Script Arguments 2:
/Users/chrisjohnson/Downloads/kipling_test_mac(2)/
Script Arguments 3:
Kipling.app
Script Arguments 4:
/Users/chrisjohnson/Downloads/kipling_test_mac(2)/Kipling.app/Contents/Resources/update_scripts


LABJACK_VERSION_MANAGER.beginFileUpgrade({
    'extractedFolder':'/Users/chrisjohnson/git/Kiplingv3/ModuleDevelopment/ljswitchboard/deploy/'
});

LABJACK_VERSION_MANAGER.executeProcess('"J:\\Users\\Chris_2\\Dropbox\\LabJack-Shared\\Kipling Updater\\win_reboot.bat"')

extractedFolder
LABJACK_VERSION_MANAGER.beginFileUpgrade({'extractedFolder':'J:\\Users\\Chris_2\\Dropbox\\LabJack-Shared\\Kipling Updater\\'});

 */
