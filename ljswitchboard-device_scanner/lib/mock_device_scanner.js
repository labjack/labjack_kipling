
var q = require('q');
var driver_const = require('ljswitchboard-ljm_driver_constants');
var data_parser = require('ljswitchboard-data_parser');
var modbus_map = require('ljswitchboard-modbus_map');
var constants = modbus_map.getConstants();

function createMockDeviceScanner() {
	var self = this;
	this.devices = [];

	var getFakeIP = function(deviceInfo, address) {
		var ip = 0;
		var sn = deviceInfo.serialNumber;
		var ct;
		var dt = deviceInfo.deviceType;
		if(address === 'ETHERNET_IP') {
			ct = driver_const.LJM_CT_ETHERNET;
		} else if(address === 'WIFI_IP') {
			ct = driver_const.LJM_CT_WIFI;
		}
		ip = getDeviceIPAddress(dt, ct, sn);
		return ip;
	};
	var defaultFakeResults = {
		'DEVICE_NAME_DEFAULT': function(deviceInfo, address) {
			return 'Device: ' + deviceInfo.serialNumber.toString();
		},
		'HARDWARE_INSTALLED': 15, // Indicating T7-Pro with all options installed
		'DGT_INSTALLED_OPTIONS': 3, // Indicating TLH
		'ETHERNET_IP': getFakeIP,		// Indicate that the devie has a valid IP.
		'WIFI_IP': getFakeIP,		// Indicate that the devie has a valid IP.
		'WIFI_STATUS': function(deviceInfo, address) {
			return 2900;
		},
		'WIFI_RSSI': function(deviceInfo, address) {
			return -30;
		},
		'FIRMWARE_VERSION': function(deviceInfo, address) {
			return 1.5000;
		},
	};
	var getFakeResult = function(deviceInfo, address) {
		var defaultVal = 0;
		var fakeResult = defaultFakeResults[address];
		var info = constants.getAddressInfo(address);
		if(typeof(fakeResult) === 'function') {
			defaultVal =fakeResult(deviceInfo, address);
		} else if(fakeResult) {
			defaultVal = fakeResult;
		} else {
			defaultVal = 0;
		}
		var res = {
			'register': address,
			'name': info.data.name,
			'address': info.data.address,
			'val': defaultVal
		};
		return res;
	};
	var getSerialNumberOffset = function(dt) {
		var dts = driver_const.DRIVER_DEVICE_TYPE_NAMES[dt];
		var baseSN = 0;
		if(driver_const.serialNumberOffsets) {
			if(driver_const.serialNumberOffsets[dts]) {
				baseSN = driver_const.serialNumberOffsets[dts];
			}
		}
		return baseSN;
	};
	var getDeviceSerialNumber = function(deviceType) {
		var serialNumber = 0;
		var dt = driver_const.deviceTypes[deviceType];
		var baseSN = getSerialNumberOffset(dt);
		
		serialNumber = baseSN + self.devices.length;
		return serialNumber;
	};
	var getDeviceIPAddress = function(dt, connectionType, sn) {
		// From: http://www.aboutmyip.com/AboutMyXApp/IP2Integer.jsp?ipAddress=192.168.1.2
		var ipOffset = 3232235778;
		var baseSN = getSerialNumberOffset(dt);
		var snDifference = sn - baseSN;
		if(snDifference < 0) {
			baseSN = 0;
			snDifference = sn - baseSN;
		}
		if(snDifference > 10000) {
			baseSN = 0;
			snDifference = sn - baseSN;
		}
		var ipNum = 0;
		if(connectionType == driver_const.LJM_CT_ETHERNET) {
			ipNum = ipOffset + snDifference;
		}
		if(connectionType == driver_const.LJM_CT_WIFI) {
			ipNum = ipOffset + snDifference + 1;
		}
		return  ipNum;
	};
	var createDeviceData = function(deviceInfo) {
		var deviceType = deviceInfo.deviceType;
		var connectionType = deviceInfo.connectionType;

		var data = {};
		var dt = driver_const.deviceTypes[deviceType];
		var dtANY = driver_const.LJM_DT_ANY;
		var ct = driver_const.connectionTypes[connectionType];
		var ctANY = driver_const.LJM_CT_ANY;
		var ctTCP = driver_const.LJM_CT_TCP;

		var serialNumber;
		var ipAddress;
		if(dt == dtANY) {
			dt = driver_const.LJM_DT_T7;
		}
		if(ct == ctANY) {
			ct = driver_const.LJM_CT_USB;
		}
		if(ct == ctTCP) {
			ct = driver_const.LJM_CT_ETHERNET;
		}

		if(deviceInfo.serialNumber) {
			serialNumber = deviceInfo.serialNumber;
		} else {
			serialNumber = getDeviceSerialNumber(dt);
		}

		if(deviceInfo.ipAddress) {
			ipAddress = deviceInfo.ipAddress;
		} else {
			ipAddress = getDeviceIPAddress(dt, ct, serialNumber);
		}
		

		data.deviceType = dt;
		data.serialNumber = serialNumber;
		data.connectionType = ct;
		data.ipAddress = ipAddress;
		data.isMockDevice = true;
		return data;
	};
	// Required device info keys:
	// deviceType, connectionType
	var addDeviceSync = function(deviceInfo) {
		self.devices.push(createDeviceData(deviceInfo));
	};
	this.addDevice = function(deviceInfo) {
		var defered = q.defer();
		addDeviceSync(deviceInfo);
		defered.resolve();
		return defered.promise;
	};
	this.addDevices = function(devices) {
		var defered = q.defer();
		if(Array.isArray(devices)) {
			devices.forEach(addDeviceSync);
			defered.resolve();
		} else {
			defered.resolve();
		}
		return defered.promise;
	};
	this.getMockDeviceData = function(serialNumber, addresses) {
		var defered = q.defer();
		var data = {};
		self.devices.forEach(function(device) {
			if(device.serialNumber == serialNumber) {
				addresses.forEach(function(address) {
					data[address] = getFakeResult(device, address).val;
				});
			}
		});
		defered.resolve(data);
		return defered.promise;
	};
	this.clearDevices = function() {
		var defered = q.defer();
		self.devices = [];
		defered.resolve();
		return defered.promise;
	};

	var addMockDevices = function(foundDevices, deviceType, connectionType) {
		var defered = q.defer();
		self.devices.forEach(function(device, i) {
			var addDevice = false;
			var dtANY = driver_const.LJM_DT_ANY;
			var scanDT = driver_const.deviceTypes[deviceType];
			var currentDT = driver_const.deviceTypes[device.deviceType];
			var ctANY = driver_const.LJM_CT_ANY;
			var scanCT = driver_const.connectionTypes[connectionType];
			var currentCT = driver_const.connectionTypes[device.connectionType];
			if(scanDT == dtANY) {
				// If we are scanning for ANY device type
				addDevice = true;
			} else if(scanDT == currentDT) {
				// If we are scanning for a particular device type
				addDevice = true;
			}

			// If the device should be added, check its connection type.
			if(addDevice) {
				// Verify that the device has an appropriate connection type.
				addDevice = false;
				if(scanCT == ctANY) {
					addDevice = true;
				} else if(scanCT == currentCT) {
					addDevice = true;
				} else if(scanCT == driver_const.LJM_CT_TCP) {
					if(currentCT == driver_const.LJM_CT_ETHERNET) {
						addDevice = true;
					}
					if(currentCT == driver_const.LJM_CT_WIFI) {
						addDevice = true;
					}
				}
			}

			// If the device should be added, add it to the foundDevices list
			if(addDevice) {
				// Convert the IP address value into a string
				if(!isNaN(device.ipAddress)) {
					device.ipAddress = data_parser.parseResult(
						'ETHERNET_IP', device.ipAddress
					).str;
				}
				foundDevices.push(device);
			}
		});
		defered.resolve(foundDevices);
		return defered.promise;
	};

	var getAddMockDeviceData = function(addresses) {
		var addMockDeviceData = function(foundDevices) {
			var defered = q.defer();
			var i, j;
			for(i = 0; i < foundDevices.length; i++) {
				foundDevices[i].data = [];
				foundDevices[i].registers = [];
				foundDevices[i].addresses = [];
				foundDevices[i].names = [];
				foundDevices[i].values = [];
				
				var foundDevice = foundDevices[i];

				for(j = 0; j < addresses.length; j++) {
					var address = addresses[j];
					var result = getFakeResult(foundDevice, address);
					foundDevices[i].data.push(result);
					foundDevices[i].registers.push(result.register);
					foundDevices[i].addresses.push(result.address);
					foundDevices[i].names.push(result.name);
					foundDevices[i].values.push(result.val);
				}
			}
			defered.resolve(foundDevices);
			return defered.promise;
		};
		return addMockDeviceData;
	};

	this.listAllExtended = function(scanRequest) {
		var defered = q.defer();
		var foundDevices = [];
		var deviceType = scanRequest.deviceType;
		var connectionType = scanRequest.connectionType;
		var addresses = scanRequest.addresses;

		addMockDevices(foundDevices, deviceType, connectionType)
		.then(getAddMockDeviceData(addresses))
		.then(defered.resolve);
		return defered.promise;
	};
	this.listAll = function(scanRequest) {
		var defered = q.defer();
		var foundDevices = [];
		var deviceType = scanRequest.deviceType;
		var connectionType = scanRequest.connectionType;

		addMockDevices(foundDevices, deviceType, connectionType)
		.then(defered.resolve);
		return defered.promise;
	};
}

exports.createMockDeviceScanner = createMockDeviceScanner;