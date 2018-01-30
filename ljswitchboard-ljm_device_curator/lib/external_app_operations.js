

    
var q = require('q');
var fs = require('fs');
var path = require('path');
var modbusMap = require('ljswitchboard-modbus_map').getConstants();
var async = require('async');
var lj_apps_win_registry_info = require('lj-apps-win-registry-info');
var driver_const = require('ljswitchboard-ljm_driver_constants');
var getLJAppsRegistryInfo = lj_apps_win_registry_info.getLJAppsRegistryInfo;
var ljAppNames = lj_apps_win_registry_info.ljAppNames;

var events = require('./device_events');

var DEBUG_EXTERNAL_APPLICATION_OPERATIONS = false;
var DEBUG_OPEN_APPLICATION_OPERATION = false;
var ENABLE_ERROR_OUTPUT = false;

function getLogger(bool) {
	return function logger() {
		if(bool) {
			console.log.apply(console, arguments);
		}
	};
}

var debugEAOps = getLogger(DEBUG_EXTERNAL_APPLICATION_OPERATIONS);
var debugOA = getLogger(DEBUG_OPEN_APPLICATION_OPERATION);
var errorLog = getLogger(ENABLE_ERROR_OUTPUT);


var appOpenConfigFiles = {
    'LJLogM': 'LJLogM_open.cfg',
    'LJStreamM': 'LJstreamM_open.cfg',
    'LJLogUD': 'LJlogUD_open.cfg',
    'LJStreamUD': 'LJstreamUD_open.cfg',
};

var ljAppsBasePath = 'C:\\Program Files (x86)\\LabJack\\Applications';
var appExeNames = {
    'LJLogM': 'LJLogM.exe',
    'LJStreamM': 'LJStreamM.exe',
    'LJLogUD': 'LJLogUD.exe',
    'LJStreamUD': 'LJStreamUD.exe',
};
var appExePaths = {};
Object.keys(appExeNames).forEach(function(appExeKey) {
    appExePaths[appExeKey] = path.join(ljAppsBasePath, appExeNames[appExeKey]);
});




/*
 * Most of the documentation on this feature of the T7
 * is available on the webpage:
 * https://labjack.com/support/datasheets/t7/sd-card
*/
function getExternalAppOperations(self) {
	var operationToRegisterNames = {
		'pwd': 'FILE_IO_DIR_CURRENT',
	};

    function createOpenDeviceInExtAppBundle(options) {
        var ctStr;
        if(options.ct) {
            if(options.ct === 'current') {
                ctStr = self.savedAttributes.connectionType;
            } else {
               ctStr = options.ct; 
            }
        } else {
            ctStr = self.savedAttributes.connectionType;
        }
        var ct = driver_const.connectionTypes[ctStr];

        var bundle = {
            'appName': options.appName,
            'appWorkingDir': '',
            'openConfigFilePath': '',
            'appExePath': appExePaths[options.appName],
            'deviceInfo': {
                'dt': self.savedAttributes.deviceType,
                'ct': ct,
                'id': undefined,
            },
            'ctName': driver_const.CONNECTION_TYPE_NAMES[ct],
            'availableConnections': [],
            'closeAndOpenDevice': true,

            'currentAppOpenCFG': '',
            'appExists': false,
            'registryInfo': {},
            'isError': false,
            'errorStep': '',
            'error': undefined
        };
        return bundle;
    }

    function getAvailableConnectionsAndDetermineSharability(bundle) {
        debugOA('in getAvailableConnectionsAndDetermineSharability');
        var defered = q.defer();
        self.cGetAvailableConnectionTypes()
        .then(function(res) {
            bundle.availableConnections = res.connections;
            defered.resolve(bundle);
        }, function(err) {
            // Not a valid case...
            defered.resolve(bundle);
        });
        return defered.promise;
    }
    function determineConnectionSharability(bundle) {
        
        var defered = q.defer();
        var connections = bundle.availableConnections;
        // If the user is requesting a not-found connection type we don't need to close/open the device.
        // aka default value should be True.
        // console.log('Desired CT', bundle.ctName);

        var desiredCTIsActiveCT = false;

        var isConnectable = true; 
        var deviceID = self.savedAttributes.serialNumber.toString();
        connections.forEach(function(connection) {
            if(connection.type === bundle.ctName) {
                isConnectable = connection.isConnectable;
                deviceID = connection.id;
            }
        });

        // save device identifier string.
        bundle.deviceInfo.id = deviceID;
        
        if(isConnectable) {
            bundle.closeAndOpenDevice = false;
        } else {
            bundle.closeAndOpenDevice = true;
        }

        defered.resolve(bundle);
        return defered.promise;
    }
    function getApplicationWorkingDirectories(bundle) {
        var defered = q.defer();

        getLJAppsRegistryInfo(ljAppNames, function(err, info) {
            bundle.registryInfo = info;
            var appName = bundle.appName;
            if(info[appName]) {
                bundle.appWorkingDir = info[appName].workdir;
                var cfgFilePath = path.join(bundle.appWorkingDir, appOpenConfigFiles[appName]);
                bundle.openConfigFilePath = cfgFilePath;
            } else {
                bundle.isError = true;
                bundle.errorStep = 'getApplicationWorkingDirectories';
            }
            defered.resolve(bundle);
        });

        return defered.promise;
    }
    function getOpenConfigFileData(bundle) {
        var defered = q.defer();
        
        var filePath = bundle.openConfigFilePath;
        debugOA('in getOpenConfigFileData:', filePath);

        fs.readFile(filePath, function(err, data) {
            if(err) {
                fs.readFile(filePath, function(err, data) {
                    if(err) {
                        fs.readFile(filePath, function(err, data) {
                            if(err) {
                                console.error('Error Reading File', err, filePath);
                                bundle.isError = true;
                                bundle.error = err;
                                bundle.errorStep = 'readOpenConfigFile';
                                defered.resolve(bundle);
                            } else {
                                bundle.currentAppOpenCFG = data.toString();
                                defered.resolve(bundle);
                            }
                        });
                    } else {
                        bundle.currentAppOpenCFG = data.toString();
                        defered.resolve(bundle);
                    }
                });
            } else {
                bundle.currentAppOpenCFG = data.toString();
                defered.resolve(bundle);
            }
        });

        return defered.promise;
    }

    function generateOpenDeviceText (deviceInfo) {
        var str = '[Main]\r\n';
        str += 'DeviceType=' + deviceInfo.dt + '\r\n';
        str += 'ConnectionType=' + deviceInfo.ct + '\r\n';
        str += 'Identifier=' + deviceInfo.id + '\r\n';
        return str;
    }

    function editOpenConfigFile(bundle) {
        var defered = q.defer();
        
        var filePath = bundle.openConfigFilePath;
        var data = generateOpenDeviceText(bundle.deviceInfo);
        debugOA('in editOpenConfigFile:', filePath, data);

        fs.writeFile(filePath, data, function(err) {
			if(err) {
				fs.writeFile(filePath, data, function(err) {
					if(err) {
						fs.writeFile(filePath, data, function(err) {
							if(err) {
								console.error('Error Writing File', err, filePath);
                                bundle.isError = true;
                                bundle.error = err;
                                bundle.errorStep = 'editOpenConfigFile';
								defered.resolve(bundle);
							} else {
								defered.resolve(bundle);
							}
						});
					} else {
						defered.resolve(bundle);
					}
				});
			} else {
				defered.resolve(bundle);
			}
		});

        return defered.promise;
    }
    function restoreOpenConfigFileData(bundle) {
        var defered = q.defer();
        
        var filePath = bundle.openConfigFilePath;
        var data = bundle.currentAppOpenCFG;
        debugOA('in restoreOpenConfigFileData:', filePath, data);

        fs.writeFile(filePath, data, function(err) {
            if(err) {
                fs.writeFile(filePath, data, function(err) {
                    if(err) {
                        fs.writeFile(filePath, data, function(err) {
                            if(err) {
                                console.error('Error Writing File', err, filePath);
                                bundle.isError = true;
                                bundle.error = err;
                                bundle.errorStep = 'restoreOpenConfigFileData';
                                defered.resolve(bundle);
                            } else {
                                defered.resolve(bundle);
                            }
                        });
                    } else {
                        defered.resolve(bundle);
                    }
                });
            } else {
                defered.resolve(bundle);
            }
        });

        return defered.promise;
    }
    function verifyAppexists(bundle) {
        var defered = q.defer();
        var filePath = bundle.appExePath;
        debugOA('in verifyAppexists',filePath);

        fs.access(filePath, fs.constants.F_OK, function(err) {
            if(err) {
                bundle.appExists = false;
                bundle.isError = true;
                bundle.error = 'App does not exist at path: '+filePath;
                bundle.errorStep = 'verifyAppexists';

            } else {
                bundle.appExists = true;
            }
            defered.resolve(bundle);
        });

        return defered.promise;
    }
    function suspendDeviceConnection(bundle) {
        var defered = q.defer();

        debugOA('in suspendDeviceConnection');

        if(bundle.closeAndOpenDevice) {
            var infoToCache = ['FIRMWARE_VERSION', 'DEVICE_NAME_DEFAULT', 'WIFI_VERSION'];
            var infoCache = {};
            infoToCache.forEach(function(key) {
                infoCache[key] = self.savedAttributes[key];
            });
            self.suspendDeviceConnection()
            .then(function() {
                self.savedAttributes.isShared = true;
                self.savedAttributes.sharedAppName = bundle.appName;
                infoToCache.forEach(function(key) {
                    self.savedAttributes[key] = infoCache[key];
                });
                self.emit(events.DEVICE_RELEASED, {
                    attrs: self.savedAttributes,
                    shared: true,
                    appName: bundle.appName,
                });
                // Also emit new saved attributes event.
                self.updateSavedAttributes()
                .then(function() {
                    defered.resolve(bundle);
                });
            }, function(err) {
                bundle.isError = true;
                bundle.error = err;
                bundle.errorStep = 'suspendDeviceConnection';
                defered.resolve(bundle);
            });
        } else {
            defered.resolve(bundle);
        }
        return defered.promise;
    }

    function openExternalApplication(bundle) {
        var defered = q.defer();
        debugOA('in openExternalApplication', bundle);


        var execFile = require('child_process').execFile;
        var child = execFile(bundle.appExePath, function(error, stdout, stderr) {
            debugOA('Finished executing external application');
            if(error) {
                console.log('ERROR!',error);
            }
            defered.resolve(bundle);
        });
        
        return defered.promise;
    }

    function resumeDeviceConnection(bundle) {
        var defered = q.defer();
        debugOA('in resumeDeviceConnection');

        if(bundle.closeAndOpenDevice) {
            self.resumeDeviceConnection()
            .then(function() {
                // console.log('Emitting device acquired event', bundle.appName);
                self.savedAttributes.isShared = false;
                self.savedAttributes.sharedAppName = bundle.appName;
                self.emit(events.DEVICE_ACQUIRED, {
                    attrs: self.savedAttributes,
                    shared: false,
                    appName: bundle.appName,
                });
                // Also emit new saved attributes event.
                self.updateSavedAttributes()
                .then(function() {
                    defered.resolve(bundle);
                });
            }, function(err) {
                bundle.isError = true;
                bundle.error = err;
                bundle.errorStep = 'resumeDeviceConnection';
                defered.resolve(bundle);
            });
        } else {
            defered.resolve(bundle);
        }
        return defered.promise;
    }

    function skipOnError(func) {
        return function checkForError(bundle) {
            if(bundle.isError) {
                var defered = q.defer();
                defered.resolve(bundle);
                return defered.promise;
            } else {
                return func(bundle);
            }
        };
    }
	this.openDeviceInExternalApplication = function(ljmApplicationName,ct) {
        var defered = q.defer();

        var connectionType = 'current';
        if(ct) {
            if(ct === 'current') {
                connectionType = ct;
            } else {
                try {
                    connectionType = driver_const.connectionTypes[ct];
                } catch(err) {
                    // Do nothing.
                }
            }
        }
        var options = {
            'appName': ljmApplicationName,
            'ct': connectionType,
        };
        var bundle = createOpenDeviceInExtAppBundle(options);

        function onSuccess(successBundle) {
            // debugOA('Success Bundle', successBundle);
            defered.resolve(successBundle);
        }
        function onError(errorBundle) {
            defered.reject(errorBundle);
        }
        getAvailableConnectionsAndDetermineSharability(bundle)
        .then(skipOnError(determineConnectionSharability))
        .then(skipOnError(getApplicationWorkingDirectories))
        .then(skipOnError(getOpenConfigFileData))
        .then(skipOnError(verifyAppexists))
        .then(skipOnError(editOpenConfigFile))
        .then(skipOnError(suspendDeviceConnection))
        .then(skipOnError(openExternalApplication))
        .then(skipOnError(resumeDeviceConnection))
        // .then(skipOnError(restoreOpenConfigFileData))
        .then(onSuccess, onError);

        return defered.promise;
	};
    this.openDeviceInLJLogM = function(ct) {
        return self.openDeviceInExternalApplication('LJLogM',ct);
    }
    this.openDeviceInLJStreamM = function(ct) {
        return self.openDeviceInExternalApplication('LJStreamM',ct);
    }
}

module.exports.get = getExternalAppOperations;