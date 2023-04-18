/**
 * version_manager.js for LabJack Switchboard.  Provides Kipling with the ability
 * to query for various versions of LabJack software versions, firmeware
 * versions, and drivers
 *
 * @author Jimmy Brant (LabJack, 2022)
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
const { defer } = require('q');

const UPGRADE_LINK = "https://files.labjack.com/firmware/T8/"


class labjackVersionManager extends EventEmitter {
    constructor() {

        // You gotta super the inherited class to use this.
        super();

        this.cachedDoms = new Map();
        this.pageCache = new Map();
        this.infoCache = {};
        this.dataCache = {};
        this.isDataComplete = false;
        this.isError = false;
        this.errorInfo = null;

        this.getVersionManagerVersion = function () {
            var version = 0.000;
            if (version_manager_pkg_info.version) {
                version = version_manager_pkg_info.version;
            } else {
                console.log('pkg info', version_manager_pkg_info);
            }
            return version;
        };

        // define dict object with various urls in it
    this.urlDict = {
        "theGoldStandard": {
            "type":"justATestBro",
            "upgradeReference": "https://www.dontworryaboutit.com",
            "platformDependent": false,
            "urls":[
                // {"url": "https://files.labjack.com/firmware/T8/", "type": "organizer-current"},
                // {"url": "https://files.labjack.com/firmware/T8/release", "type": "current"},
                // {"url": "https://files.labjack.com/firmware/T8/beta/current", "type": "beta-current"},
                {"url": "https://files.labjack.com/firmware/T8/release", "type": "organizer-current"},
                {"url": "https://files.labjack.com/firmware/T8/beta/current", "type": "organizer-current"},
                {"url": "https://files.labjack.com/firmware/T8/beta", "type": "beta"},
                {"url": "https://files.labjack.com/firmware/T8/", "type": "old"},
            ],
        },
        "t8": {
            "type":"t8FirmwarePage",
            "upgradeReference": "https://files.labjack.com/firmware/T8/",
            "platformDependent": false,
            "urls":[
                // {"url": "https://files.labjack.com/firmware/T8/", "type": "organizer-current"},
                {"url": "https://files.labjack.com/firmware/T8/", "type": "current"},
            ],
        },
        "t7": {
            "type":"t7FirmwarePage",
            "upgradeReference": "https://files.labjack.com/firmware/T7/",
            "platformDependent": false,
            "urls":[
                // {"url": "https://old3.labjack.com/support/firmware/t7", "type": "organizer-current"},
                {"url": "https://files.labjack.com/firmware/T7/", "type": "current"},
                {"url": "https://files.labjack.com/firmware/T7/Beta/", "type": "beta"},
                {"url": "https://files.labjack.com/firmware/T7/Old/", "type": "old"},
                // {"url": "https://old3.labjack.com/support/firmware/t7", "type": "all"},
            ],
        },
        "t4": {
            "type":"t4FirmwarePage",
            "upgradeReference": "https://files.labjack.com/firmware/T4/",
            "platformDependent": false,
            "urls":[
                // {"url": "https://old3.labjack.com/sites/default/files/organized/special_firmware/T4/alpha_fw/t4_alpha_versions.json", "type": "static-t4-alpha-organizer"},
                // {"url": "https://old3.labjack.com/support/firmware/t4", "type": "organizer-current"},
                {"url": "https://files.labjack.com/firmware/T4/Current/", "type": "current"},
                {"url": "https://files.labjack.com/firmware/T4/Beta/", "type": "beta"},
                {"url": "https://files.labjack.com/firmware/T4/Old/", "type": "old"},
                // {"url": "https://old3.labjack.com/support/firmware/t7", "type": "all"},
            ],
        },

    };

        this.strategies = {
            t8FirmwarePage: function(listingArray, pageData, urlInfo, name) {
                var $ = cheerio.load(pageData);
                var linkElements = $('a');
                linkElements.each(function(i, linkElement){
                    var ele = $(linkElement);
                    var targetURL = ele.attr('href');
                    var FIRMWARE_FILE_REGEX = /T8firmware\_([\d\-]+).*\.bin/g;
                    var isValidFWLink = FIRMWARE_FILE_REGEX.test(targetURL);
                    if(isValidFWLink) {
                        var fileName = path.basename(targetURL);
                        var targetFileURL = new URL(fileName, urlInfo.url).href; // Combine filename with base url to give a downloadable link
                        var splitFileName = fileName.split(/[_.]/);
                        var version = (parseFloat(splitFileName[1])/10000).toFixed(4);
                        var date = splitFileName[2];

                        listingArray.push({
                            "upgradeLink":targetFileURL,
                            "version":version,
                            "date":date,
                            "type":urlInfo.type,
                            "key":urlInfo.type + '-' + version
                        });
                    } else {
                        // there are lots of invalid URLs on file.labjack.com/fimrware/T8 page
                        // for now I will supress these warnings
                        // console.warn("Invalid URL for T8 firmware", targetURL, targetURL.length)
                    }
                });
                return;
            },
            t7FirmwarePage: function(listingArray, pageData, urlInfo, name) {
                var $ = cheerio.load(pageData);
                var linkElements = $('a');
                linkElements.each(function(i, linkElement){
                    var ele = $(linkElement);
                    var targetURL = ele.attr('href');
                    var FIRMWARE_FILE_REGEX = /T7firmware\_([\d\-]+).*\.bin/g;
                    var isValidFWLink = FIRMWARE_FILE_REGEX.test(targetURL);
                    if(isValidFWLink) {
                        var fileName = path.basename(targetURL);
                        var targetFileURL = new URL(fileName, urlInfo.url).href; // Combine filename with base url to give a downloadable link
                        var splitFileName = fileName.split(/[_.]/);
                        var version = (parseFloat(splitFileName[1])/10000).toFixed(4);
                        var date = splitFileName[2];

                        listingArray.push({
                            "upgradeLink":targetFileURL,
                            "version":version,
                            "date":date,
                            "type":urlInfo.type,
                            "key":urlInfo.type + '-' + version
                        });
                    } else {
                        // there are lots of invalid URLs on file.labjack.com/fimrware/T7 page
                        // for now I will supress these warnings
                        // console.warn("Invalid URL for T7 firmware", targetURL, targetURL.length)
                    }
                });
                return;
            },
            t4FirmwarePage: function(listingArray, pageData, urlInfo, name){
                var $ = cheerio.load(pageData);
                var linkElements = $('a');
                linkElements.each(function(i, linkElement){
                    var ele = $(linkElement);
                    var targetURL = ele.attr('href');
                    var FIRMWARE_FILE_REGEX = /T4firmware\_([\d\-]+).*\.bin/g;
                    var isValidFWLink = FIRMWARE_FILE_REGEX.test(targetURL);
                    if(isValidFWLink) {
                        var fileName = path.basename(targetURL);
                        var targetFileURL = new URL(fileName, urlInfo.url).href; // Combine filename with base url to give a downloadable link
                        var splitFileName = fileName.split(/[_.]/);
                        var version = (parseFloat(splitFileName[1])/10000).toFixed(4);
                        var date = splitFileName[2];

                        listingArray.push({
                            "upgradeLink":targetFileURL,
                            "version":version,
                            "date":date,
                            "type":urlInfo.type,
                            "key":urlInfo.type + '-' + version
                        });
                    } else {
                        // there are lots of invalid URLs on file.labjack.com/fimrware/T7 page
                        // for now I will supress these warnings
                        // console.warn("Invalid URL for T7 firmware", targetURL, targetURL.length)
                    }
                });
                return;
            }
        };

        this.buildQuery = function(savedData, strategy, urlInfo, name) {
            var dataQuery = function(callback) {
                var url = urlInfo.url
                let response = fetch(url, { timeout: 20000 })
                    .then(function (res) {
                        if (res.ok) {
                            return res.text();
                        }

                        var message = '';
                        var err = null;
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
                        console.error('fetch error', error, 'url:', url);
                        callback(error);
                    });

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

            // if(organizer) {
            //     console.error("Organizer current info found");
            // }

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
                if(typeof(self.infoCache[name][info.type]) == 'undefined') {
                    self.infoCache[name][info.type] = [];
                }
                var data = {
                    upgradeLink: info.upgradeLink,
                    version: info.version,
                    type: info.type,
                    key: info.key
                };

                // Determine if the node should be inserted into the array. Check
                // if that version has already been found.
                var addToCache = true;
                self.infoCache[name][info.type].forEach(function(cachedInfo) {
                    if(cachedInfo.version === info.version) {
                        addToCache = false
                    }
                }); 

                // If the ndoe should be added, add it.
                if(addToCache) {
                    self.infoCache[name][info.type].push(data);
                    if(platformDependent) {
                        var isCurSys = info.type.search(systemType) > 0;
                        var curType = info.type.split('_' + systemType)[0]
                        if(isCurSys) {
                            if(typeof(self.dataCache[name][curType]) === 'undefined') {
                                self.dataCache[name][curType] = [];
                            }
                            self.dataCache[name][curType].push(data);
                        }
                    } else {
                        if(typeof(self.dataCache[name][info.type]) === 'undefined') {
                            self.dataCache[name][info.type] = [];
                        }
                        self.dataCache[name][info.type].push(data);
                    }
                }
            });
        };

        this.queryForVersions = function(name){
            var defered = q.defer();
            var info = self.urlDict[name]; // info is the url dict with files.labjack.com links
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
                        var url = urlInfo.url
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
                    }

                    execPrefetchQuerys();
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

        /**
         * UPDATE THIS -------------------
         * Function that querys & parses labjack.com/support/firmware/t7, /beta, and
         *  /old for different versions of T7 firmware & appropriate links.
         *
         * @return {[type]} [description]
        **/
        this.getT8FirmwareVersions = function() {
            var defered = q.defer();
            self.queryForVersions('t8')
            .then(defered.resolve,defered.reject);
            return defered.promise;
        };
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
                if(err) {
                    if(err.quit) {
                        self.isError = true;
                        self.errorInfo = err;
                        defered.reject(err);
                        errDefered.reject();
                    } else {
                        errDefered.resolve();
                    }
                    console.error('Error Querying LabJack cersion', err);
                }
                return errDefered.promise;
            };
            var defered = q.defer();

            // start getting all versions
            self.getKiplingVersions()
            .then(self.getT8FirmwareVersions, errorFunc)
            .then(self.getT7FirmwareVersions, errorFunc)
            .then(self.getT4FirmwareVersions, errorFunc)
            .then(function(){
                self.isDataComplete = true;
                defered.resolve(self.infoCache)
            }, errorFunc);
            return defered.promise;
        };

        this.clearPageCache = function() {
            self.pageCache.clear();
            self.cachedDoms.clear();
        }

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
                if(self.isError) {
                    defered.reject(self.errorInfo);
                } else {
                    defered.resolve(self.infoCache)
                }
            };
            var waitFunc = function() {
                if(isComplete()) {
                    if(iteration < maxCheck) {
                        iteration += 1;
                        setTimeout(waitFunc, checkInterval);
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

        this.getInfoCache = function() {
            return JSON.parse(JSON.stringify(self.infoCache));
        };

        this.getCachedT8Versions = function() {
            var t8Data = {};
            if(typeof(self.infoCache.t8) !== 'undefined') {
                t8Data = JSON.parse(JSON.stringify(self.infoCache.t8));
                // populateMissingKeys(t8Data, ['beta', 'current', 'old']);
                t8Data.isValid = true;
            } else {
                t8Data.current = [];
                t8Data.beta = [];
                t8Data.old = [];
                t8Data.isValid = false;
            }
            return t8Data;
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
        }

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

        this.isIssue = function() {
            if(self.isDataComplete) {
                return self.infoCache.warning || self.infoCache.isError;
            } else {
                return true
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
    
        var self = this;
    }
}

var LABJACK_VERSION_MANAGER = new labjackVersionManager();

exports.lvm = LABJACK_VERSION_MANAGER;
exports.initalize = function() {
    var defered = q.defer();

    LABJACK_VERSION_MANAGER.getAllVersions();
    LABJACK_VERSION_MANAGER.waitForData()
    .then(function(data) {
        if(LABJACK_VERSION_MANAGER.isIssue()) {
            var issue = LABJACK_VERSION_MANAGER.getIssue();
            console.error('LVM Warning', issue);
        } 
        defered.resolve(data);
    }, function(err) {
        if(LABJACK_VERSION_MANAGER.isIssue()) {
            var issue = LABJACK_VERSION_MANAGER.getIssue();
            console.error('LVM Error', issue, "Error: ", err);
            defered.reject(issue);
        } else {
            defered.reject();
        }
    });

    return defered.promise;
}

exports.getAllVersions = LABJACK_VERSION_MANAGER.getAllVersions;

// For Testing....
// var LVM = LABJACK_VERSION_MANAGER;

// LVM.getT8FirmwareVersions()
// .then(LVM.getT7FirmwareVersions())
// .then(console.log("Info cache:", LVM.getInfoCache()))

// function testThisBitch() {
//     var defered = q.defer();

//     LABJACK_VERSION_MANAGER.getAllVersions();
//     LABJACK_VERSION_MANAGER.waitForData()
//     .then(function(data) {
//         console.log('LVM dataCache:',LABJACK_VERSION_MANAGER.dataCache);
//         if(LABJACK_VERSION_MANAGER.isIssue()) {
//             var issue = LABJACK_VERSION_MANAGER.getIssue();
//             console.error('LVM Warning', issue);
//         } 
//         defered.resolve(data);
//     }, function(err) {
//         if(LABJACK_VERSION_MANAGER.isIssue()) {
//             var issue = LABJACK_VERSION_MANAGER.getIssue();
//             console.error('LVM Error', issue, "Error: ", err);
//             defered.reject(issue);
//         } else {
//             defered.reject();
//         }
//     });

//     return defered.promise;
// }



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