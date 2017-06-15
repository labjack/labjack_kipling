

    
var q = require('q');
var fs = require('fs');
var path = require('path');
var modbusMap = require('ljswitchboard-modbus_map').getConstants();
var async = require('async');
var lj_apps_win_registry_info = require('lj-apps-win-registry-info');
var getLJAppsRegistryInfo = lj_apps_win_registry_info.getLJAppsRegistryInfo;
var ljAppNames = lj_apps_win_registry_info.ljAppNames;

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
        var bundle = {
            'appName': options.appName,
            'appWorkingDir': '',
            'openConfigFilePath': '',
            'appExePath': appExePaths[options.appName],
            'deviceInfo': {
                'dt': self.savedAttributes.openParameters.deviceType,
                'ct': self.savedAttributes.openParameters.connectionType,
                'id': self.savedAttributes.openParameters.identifier,
            },
            'registryInfo': {},
            'isError': false,
            'errorStep': '',
            'error': undefined
        };
        return bundle;
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
								console.error('Error Reading File', err, filePath);
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

    function suspendDeviceConnection(bundle) {
        var defered = q.defer();

        debugOA('in suspendDeviceConnection');
        self.suspendDeviceConnection()
        .then(function() {
            defered.resolve(bundle);
        }, function(err) {
            bundle.isError = true;
            bundle.error = err;
            bundle.errorStep = 'suspendDeviceConnection';
            defered.resolve(bundle);
        });
        return defered.promise;
    }

    function openExternalApplication(bundle) {
        var defered = q.defer();
        debugOA('in openExternalApplication', bundle);


        var execFile = require('child_process').execFile;
        var child = execFile(bundle.appExePath, function(error, stdout, stderr) {
            debugOA('Finished executing external application');
            defered.resolve(bundle);
        })
        
        return defered.promise;
    }

    function resumeDeviceConnection(bundle) {
        var defered = q.defer();
        debugOA('in resumeDeviceConnection');
        self.resumeDeviceConnection()
        .then(function() {
            defered.resolve(bundle);
        }, function(err) {
            bundle.isError = true;
            bundle.error = err;
            bundle.errorStep = 'resumeDeviceConnection';
            defered.resolve(bundle);
        });
        return defered.promise;
    }

	this.openDeviceInExternalApplication = function(ljmApplicationName) {
        var defered = q.defer();

        var options = {
            'appName': ljmApplicationName,
        };
        var bundle = createOpenDeviceInExtAppBundle(options);

        function onSuccess(successBundle) {
            // debugOA('Success Bundle', successBundle);
            defered.resolve(successBundle);
        }
        function onError(errorBundle) {
            defered.reject(errorBundle);
        }
        getApplicationWorkingDirectories(bundle)
        .then(editOpenConfigFile)
        .then(suspendDeviceConnection)
        .then(openExternalApplication)
        .then(resumeDeviceConnection)
        .then(onSuccess, onError);

        return defered.promise;
	};
    this.openDeviceInLJLogM = function() {
        return self.openDeviceInExternalApplication('LJLogM');
    }
    this.openDeviceInLJStreamM = function() {
        return self.openDeviceInExternalApplication('LJStreamM');
    }
}

module.exports.get = getExternalAppOperations;