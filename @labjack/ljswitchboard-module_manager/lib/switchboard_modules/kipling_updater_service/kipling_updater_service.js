
/* jshint undef: true, unused: true, undef: true */
/* global global, console, MODULE_CHROME, TASK_LOADER, gns, process */
/* global UPDATE_K3_WINDOW_VERSION_NUMBER_STR */
/* exported activeModule */


console.log('in kipling_updater_service.js');

var q = global.require('q');
var io_manager = global[gns].io_manager;
var io_interface = io_manager.io_interface();
var driver = io_interface.getDriverController();
var semver = require('semver_min');

function createKiplingUpdaterService() {
	console.log('Available tasks', Object.keys(TASK_LOADER.tasks));
	var tab_notification_manager = TASK_LOADER.tasks.tab_notification_manager;
	var update_manager = TASK_LOADER.tasks.update_manager;
	var update_manager_events = update_manager.eventList;
	var update_manager_vm = update_manager.vm;

	this.cachedVersionData = undefined;
	this.currentVersionData = undefined;

	this.getCachedLJMVersions = function() {
		return update_manager_vm.getCachedLJMVersions();
	};
	this.getCachedKiplingVersions = function() {
		return update_manager_vm.getCachedKiplingVersions();
	};

	var getOS = function() {
		var os ={
			'darwin': 'mac',
			'win32': 'win'
		}[process.platform];
		if(typeof(os) === 'undefined') {
			var bitType = {
				'x64': '64',
				'ia32': '32',
				'arm': 'arm'
			}[process.arch];

			os = 'linux' + bitType;
		}
		return os;
	};

	this.getLatestVersion = function(appType) {
		var latestVersion = {
			'key': 'default',
			'type': 'default',
			'upgradeLink': 'https://labjack.com',
			'version': '0.0.0'
		};

		if(appType === 'ljm') {
			latestVersion.version = '0.0';
		}

		if(self.cachedVersionData) {
			var osKey = 'current_' + getOS();
			if(self.cachedVersionData[appType][osKey]) {
				var upgrades = self.cachedVersionData[appType][osKey];
				upgrades.forEach(function(upgrade) {
					var version = upgrade.version;
					var selectedVersion = latestVersion.version;
					if(semver.valid(version)) {
						if(semver.gt(version, selectedVersion)) {
							latestVersion = upgrade;
						}
					} else {
						version = parseFloat(version);
						selectedVersion = parseFloat(selectedVersion);
						if(version > selectedVersion) {
							latestVersion = upgrade;
						}
					}
				});
			} else {
				console.warn(
					'Could not find ' + appType +' update obj',
					self.cachedVersionData[appType]
				);
			}
		}
		return latestVersion;
	};
	this.getLatestKiplingVersion = function() {
		return self.getLatestVersion('kipling');
	};
	this.getLatestLJMVersion = function() {
		return self.getLatestVersion('ljm');
	};
	this.checkKiplingIsOld = function() {
		var isOld = false;
		if(self.currentVersionData) {
			if(self.currentVersionData.kipling_data) {
				if(self.currentVersionData.kipling_data.data) {
					var currentVersion = self.currentVersionData.kipling_data.data;

					var latestVersion = self.getLatestKiplingVersion().version;

					if(semver.gt(latestVersion, currentVersion)) {
						isOld = true;
					}
				}
			}
		}
		return isOld;
	};
	this.checkLJMIsOld = function() {
		var isOld = false;
		if(self.currentVersionData) {
			if(self.currentVersionData.ljm_data) {
				if(self.currentVersionData.ljm_data.LJM_LIBRARY_VERSION) {
					var currentVersion = self.currentVersionData.ljm_data.LJM_LIBRARY_VERSION;
					currentVersion = parseFloat(currentVersion);

					var latestVersionStr = self.getLatestLJMVersion().version;
					var latestVersion = parseFloat(latestVersionStr);

					if(latestVersion > currentVersion) {
						isOld = true;
					}
				}
			}
		}
		return isOld;
	};
	this.generateDeviceMessage = function(cachedDevice) {
		var str = JSON.stringify(cachedDevice);
		return str;
	};
	this.refreshKiplingUpdaterModuleStatus = function() {
		var messages = [];
		if(self.cachedVersionData) {
			if(self.checkKiplingIsOld()) {
				messages.push('New Kipling version available.');
			}
			if(self.checkLJMIsOld()) {
				messages.push('New LJM version available.');
			}
			console.log(
				'kipling_updater_service data',
				{
					'isK3Old': self.checkKiplingIsOld(),
					'isLJMOld': self.checkLJMIsOld()
			});
		}

		// console.info('Messages for device_updater_fw tab', messages);
		tab_notification_manager.setNotifications(
			'settings',
			messages
		);
	};
	this.updateKiplingWindowTitle = function() {
		try {
			// Update Window title name with version number & update availability.
			var msg = self.currentVersionData.versions.kipling.data;
			if(self.checkKiplingIsOld() || self.checkLJMIsOld()) {
				msg += ' (Updates Available)';
			}
			
			UPDATE_K3_WINDOW_VERSION_NUMBER_STR(msg)
		} catch(err) {

		}
	};
	this.updatedVersionData = function(versionData) {
		try {
			console.log('in kipling_updater_service updatedVersionData', versionData, self.currentVersionData);
			self.cachedVersionData = versionData;
			self.refreshKiplingUpdaterModuleStatus();
			self.updateKiplingWindowTitle();
		} catch(err) {
			console.error('Error in kipling_updater_service: updatedVersionData', err);
		}
	};

	var toTitleCase = function (str) {
	    return str.replace(/\w\S*/g, function(txt) {
	    	return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	    });
	};

	var replacementOverrides = {
		'io_manager': 'IO Manager',
	};
	var dataOrder = [
    	'Kipling',
    	'Splash Screen',
    	'Core',
    	'Module Manager',
    	'Static Files',
    	'IO Manager',
    ];
    var librarySorter = function(a, b) {
    	var defaultVal = 100;

    	var indexA = dataOrder.indexOf(a.name);
    	if(indexA < 0) {
    		indexA = defaultVal;
    	}

    	var indexB = dataOrder.indexOf(b.name);
    	if(indexB < 0) {
    		indexB = defaultVal;
    	}

    	if (indexA > indexB) {
			return 1;
		}
		if (indexA < indexB) {
			return -1;
		}
		// a must be equal to b
		return 0;
    };
    this.getProgramInfo = function() {
    	var data = {
			'info': {},
			'packages': [],
			'versions': {},
			'ljm_data': {},
			'kipling_data': {},
			'modbus_map_data': {},
			'modbus_map_version': '',
		};

		data.info.extractionFolderName = {
			'name': 'Extracted Data Folder name',
			'data': package_loader.getExtractionPath(),
		};

		data.versions.persistentDataVersion = {
			'name': 'Persistent Data',
			'data': process.env.npm_package_persistentDataVersion,
		};

		data.versions.baseVersionData = {
			'name': 'Splash Screen',
			'data': process.env.npm_package_version,
		};

		var managedPackages = package_loader.getDependencyData();
		var packageKeys = Object.keys(managedPackages);
		packageKeys.forEach(function(key) {
			var humanName = key.split('ljswitchboard-').join('');
			humanName = humanName.split('-').join(' ');
			humanName = humanName.split('_').join(' ');

			humanName = toTitleCase(humanName);

			if(replacementOverrides[key]) {
				humanName = replacementOverrides[key];
			}

			if(humanName === 'Kipling') {
				data.kipling_data = {
					'name': humanName,
					'data': managedPackages[key].version,
				};
			}
			data.versions[key] = {
				'name': humanName,
				'data': managedPackages[key].version,
			};
		});

		// console.log(JSON.stringify(data, null, 2));
		var versionKeys = Object.keys(data.versions);
		data.packages = versionKeys.map(function(versionKey) {
			return data.versions[versionKey];
		});

		// Sort the packages list
		data.packages.sort(librarySorter);

		return data;
    };

    var requiredLJMInfo = [
    	{'func': 'readLibrary', 'attr': 'LJM_LIBRARY_VERSION', 'formatFunc': function(val) {
    		return val.toFixed(4);
    	}},
    	{'func': 'readLibraryS', 'attr': 'LJM_MODBUS_MAP_CONSTANTS_FILE'},
    	{'func': 'readLibraryS', 'attr': 'LJM_ERROR_CONSTANTS_FILE'},
    ];
    this.populateLJMInfo = function(data) {
    	var defered = q.defer();

    	async.eachSeries(
    		requiredLJMInfo,
    		function(reqInfo, callback) {
    			var func = reqInfo.func;
    			var attr = reqInfo.attr;
    			var fmatFunc = reqInfo.formatFunc;

    			if(driver[func]) {
    				driver[func](attr)
    				.then(function readSuccess(ljmData) {
    					if(typeof(fmatFunc) === 'function') {
    						data.ljm_data[attr] = fmatFunc(ljmData);
    					} else {
    						data.ljm_data[attr] = ljmData;
    					}
    					callback();
    				}, function readError(ljmErr) {
    					data.ljm_data[attr] = 'Error: ' + ljmErr.toString();
    					callback();
    				});
    			} else {
    				console.error('Driver function does not exist', func);
    				callback();
    			}
    		},
    		function(err) {
    			if(err) {
    				defered.resolve(data);
    			} else {
	    			defered.resolve(data);
	    		}
    		});
    	return defered.promise;
    };

    this.populateModbusMapInfo = function(data) {
    	var defered = q.defer();
    	var headerInfo = {};
    	try {
	    	var ljmHeaderRef = modbus_map.origConstants.header;
	    	headerInfo = JSON.parse(JSON.stringify(ljmHeaderRef));
	    } catch(err) {
	    	headerInfo = {
	    		'filename': '',
	    		'version': '',
	    		'support_url': 'htt-p://labjack.com',
	    	};
	    }
	    data.modbus_map_data = [
	    	{'name': 'File Name', 'data': headerInfo.filename},
	    	{'name': 'Version', 'data': headerInfo.version},
	    	{'name': 'Support URL', 'data': headerInfo.support_url},
	    ];
	    data.modbus_map_version = headerInfo.version;

    	defered.resolve(data);
    	return defered.promise;
    };
    this.saveVersionInfo = function(data) {
    	var defered = q.defer();
    	// console.log("We have current version:", data);
    	var kiplingVersion = data.kipling_data.data;
    	UPDATE_K3_WINDOW_VERSION_NUMBER_STR(kiplingVersion);

    	self.currentVersionData = data;
    	defered.resolve(data);
    	return defered.promise;
    };

	this.initializeVersionData = function() {
		var defered = q.defer();

		var pageData = self.getProgramInfo();

        self.populateLJMInfo(pageData)
        .then(self.populateModbusMapInfo)
        .then(self.saveVersionInfo)
        .then(defered.resolve);
		return defered.promise;
	};

	var self = this;

	/* Attach to events */

	// Event that gets fired when new version data is available.
	update_manager_vm.on(
		update_manager_events.UPDATED_VERSION_DATA,
		self.updatedVersionData
	);
}

var kus;
var self = this;

this.startTask = function(bundle) {
	console.log('Starting kipling_version_manager task');
	var defered = q.defer();
	try {
		kus = new createKiplingUpdaterService();
		self.kus = kus;
		kus.initializeVersionData()
		.then(function() {
			console.log('Initialized Kipling\'s kipling updater service');
			defered.resolve(bundle);
		});
	} catch(err) {
		console.error('Failed to initialize Kipling\'s kipling updater service', err);
		defered.resolve(bundle);
	}
	return defered.promise;
};

this.kus = kus;

this.getProgramInfo = function() {
	var defered = q.defer();

	var data = JSON.parse(JSON.stringify(kus.currentVersionData));

	var isLJMOld = kus.checkLJMIsOld();
	var availableLJMVersion = kus.getLatestLJMVersion();

	var isKiplingOld = kus.checkKiplingIsOld();
	var availableKiplingVersion = kus.getLatestKiplingVersion();

	var availableUpdates = isLJMOld || isKiplingOld;
	var updates = [];

	if(isLJMOld) {
		updates.push('LJM Library');
	}
	if(isKiplingOld) {
		updates.push('Kipling');
	}

	var updateText = 'None';
	if(updates.length === 1) {
		updateText = updates[0];
	} else if(updates.length === 2) {
		updateText = updates[0] + ' and ' + updates[1];
	}
	
	var pannelType = 'panel-success';
	if(availableUpdates) {
		pannelType = 'panel-danger';
	}

	data.programUpdates = {
		'availableUpdates': availableUpdates,
		'updateText': updateText,
		'pannelType': pannelType,

		'isLJMOld': isLJMOld,
		'availableLJMVersion': availableLJMVersion,

		'isKiplingOld': isKiplingOld,
		'availableKiplingVersion': availableKiplingVersion,
	};

	defered.resolve(data);
	return defered.promise;
};

