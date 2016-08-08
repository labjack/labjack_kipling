
/* jshint undef: true, unused: true, undef: true */
/* global global, console, MODULE_CHROME, TASK_LOADER */
/* exported activeModule */


console.log('in device_updater_service.js');

var q = global.require('q');

function createDeviceUpdaterService() {
	// console.log('Available tasks', Object.keys(TASK_LOADER.tasks));
	var tab_notification_manager = TASK_LOADER.tasks.tab_notification_manager;
	var update_manager = TASK_LOADER.tasks.update_manager;
	var update_manager_events = update_manager.eventList;
	var update_manager_vm = update_manager.vm;

	this.cachedDeviceArray = undefined;
	this.cachedVersionData = undefined;

	this.getCachedT7Versions = function() {
		return update_manager_vm.getCachedT7Versions();
	};
	this.getCachedT4Versions = function() {
		return update_manager_vm.getCachedT7Versions();
	};
	
	var supportedDevices = [
		't7',
		't4',
		// 'digit',
	];
	this.getLatestCurrentFwForDevice = function(deviceType) {
		var currentFW = 0;

		if(supportedDevices.indexOf(deviceType) >= 0) {
			if(self.cachedVersionData[deviceType]) {
				if(self.cachedVersionData[deviceType].current) {
					var currentFirmwares = self.cachedVersionData[deviceType].current;
					currentFirmwares.forEach(function(currentFirmware) {
						var versionStr = currentFirmware.version;
						var versionNum = parseFloat(versionStr, 10);
						if(versionNum > currentFW) {
							currentFW = versionNum;
						}
					});
				}
			}
		}
		return currentFW;
	};

	this.checkDeviceFWIsOld = function(cachedDevice) {
		// Get the lower-case version of the deviceTypeName attribute.
		var isOld = false;
		var deviceTypeName = cachedDevice.deviceTypeName.toLowerCase();
		var firmwareVersion = cachedDevice.FIRMWARE_VERSION;
		var latestVersion = self.getLatestCurrentFwForDevice(deviceTypeName);

		if(latestVersion > firmwareVersion) {
			isOld = true;
		}
		return isOld;
	};
	this.generateDeviceMessage = function(cachedDevice) {
		var str = JSON.stringify(cachedDevice);
		return str;
	};
	this.refreshDeviceUpdaterModuleStatus = function() {
		var messages = [];
		if(self.cachedDeviceArray) {
			if(self.cachedVersionData) {
				self.cachedDeviceArray.forEach(function(cachedDevice) {
					if(self.checkDeviceFWIsOld(cachedDevice)) {
						messages.push(self.generateDeviceMessage(cachedDevice));
					}
				});
			}
		}

		// console.info('Messages for device_updater_fw tab', messages);
		tab_notification_manager.setNotifications(
			'device_updater_fw',
			messages
		);
	};
	this.updatedVersionData = function(versionData) {
		try {
			console.log('in device_updater_service updatedVersionData', versionData);
			self.cachedVersionData = versionData;
			self.refreshDeviceUpdaterModuleStatus();
		} catch(err) {
			console.error('Error in device_updater_service: updatedVersionData', err);
		}
	};
	/**
	 * Create & add device-listing updated event
	 */
	this.updatedDeviceList = function(deviceArray) {
		try {
			console.log('in device_updater_service, deviceListUpdated', deviceArray);
			self.cachedDeviceArray = deviceArray;
			self.refreshDeviceUpdaterModuleStatus();
		} catch(err) {
			console.error('Error in device_updater_service: updatedDeviceList', err);
		}
	};

	var self = this;

	// Attach to events
	MODULE_CHROME.on(
		MODULE_CHROME.eventList.DEVICE_LIST_UPDATED,
		self.updatedDeviceList
	);
	update_manager_vm.on(
		update_manager_events.UPDATED_VERSION_DATA,
		self.updatedVersionData
	);
}

var deviceUpdaterService;
var self = this;

this.startTask = function(bundle) {
	console.log('Starting device_updater_service task');
	var defered = q.defer();
	try {
		deviceUpdaterService = new createDeviceUpdaterService();
		self.deviceUpdaterService = deviceUpdaterService;
	} catch(err) {
		console.error('Failed to initialize Kipling\'s device updater service', err);
	}
	defered.resolve(bundle);
	return defered.promise;
};

this.deviceUpdaterService = deviceUpdaterService;

