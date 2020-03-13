
var q = require('q');
var driver_const = require('ljswitchboard-ljm_driver_constants');
var data_parser = require('ljswitchboard-data_parser');
var modbus_map = require('ljswitchboard-modbus_map');
var constants = modbus_map.getConstants();
var ljmUtils;
function createMockDeviceScanner() {
	ljmUtils = require('./ljm_utils/ljm_utils');

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
		'HARDWARE_INSTALLED': function(deviceInfo, address) {
			if(deviceInfo.dt == 7) {
				return 15; // Indicating T7-Pro with all options installed
			} else {
				return 0;
			}
		},
		'DGT_INSTALLED_OPTIONS': 3, // Indicating TLH
		'ETHERNET_IP': getFakeIP,		// Indicate that the devie has a valid IP.
		'WIFI_IP': getFakeIP,		// Indicate that the devie has a valid IP.
		'WIFI_STATUS': function(deviceInfo, address) {
			return 2900;
		},
		'WIFI_RSSI': function(deviceInfo, address) {
			var rssi = 0;
			if(deviceInfo.WIFI_RSSI) {
				rssi = deviceInfo.WIFI_RSSI;
			} else {
				rssi = -30;
			}
			return rssi;
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
		res = data_parser.parseResult(address, defaultVal, deviceInfo.dt);
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
	var nextHandle = -1;
	var createDeviceData = function(deviceInfo) {
		var deviceType = deviceInfo.deviceType;
		var connectionType = deviceInfo.connectionType;

		var data = {};
		var dt = driver_const.deviceTypes[deviceType];
		var dtANY = driver_const.LJM_DT_ANY;
		var ct = driver_const.connectionTypes[connectionType];
		var ctANY = driver_const.LJM_CT_ANY;
		var ctTCP = driver_const.LJM_CT_TCP;
		var ctETH = driver_const.LJM_CT_ETHERNET;
		var ctWIFI = driver_const.LJM_CT_WIFI;

		var ethScanPort = driver_const.LJM_ETH_UDP_PORT;
		var wifiScanPort = driver_const.LJM_WIFI_UDP_PORT;
		var port = 0;
		var serialNumber;
		var ipAddress;
		if(dt == dtANY) {
			dt = driver_const.LJM_DT_T7;
		}
		if(ct == ctANY) {
			ct = driver_const.LJM_CT_USB;
			port = 0;
		}
		if(ct == ctTCP) {
			ct = driver_const.LJM_CT_ETHERNET;
			port = ethScanPort;
		}
		if(ct == ctETH) {
			port = ethScanPort;
		}
		if(ct == ctWIFI) {
			port = wifiScanPort;
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
		
		data.dt = dt;
		data.deviceType = dt;
		data.serialNumber = serialNumber;
		data.connectionType = ct;
		data.ipAddress = ipAddress;
		data.isMockDevice = true;
		data.handle = nextHandle;
		data.port = port;
		nextHandle -= 1;
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
		var devicesToScan = [];
		self.devices.forEach(function(device) {
			// console.log('Adding mock devices', device);
			devicesToScan.push(device);
		});
		self.currentDevices.forEach(function(cDevice) {
			var d = cDevice.savedAttributes;
			// console.log('Adding already connected devices...', d.serialNumber);
			devicesToScan.push({
				'dt': d.deviceType,
				'deviceType': d.deviceType,
				'serialNumber': d.serialNumber,
				'connectionType': d.connectionType,
				'ipAddress': d.ipAddress,
				'isMockDevice': d.isMockDevice,
				'handle': d.handle,
				'port': d.port,
			});
		});
		devicesToScan.forEach(function(device, i) {
			var addDevice = false;
			var dtANY = driver_const.LJM_DT_ANY;
			var scanDT = driver_const.deviceTypes[deviceType];
			var currentDT = driver_const.deviceTypes[device.deviceType];
			var ctANY = driver_const.LJM_CT_ANY;
			var scanCT = driver_const.connectionTypes[connectionType];
			var scanCTMedium = driver_const.CONNECTION_MEDIUM[scanCT];
			var currentCT = driver_const.connectionTypes[device.connectionType];
			var ctUDP = driver_const.LJM_CT_UDP;
			if(scanDT == dtANY) {
				// If we are scanning for ANY device type
				addDevice = true;
			} else if(scanDT == currentDT) {
				// If we are scanning for a particular device type
				addDevice = true;
			} else if (scanDT == driver_const.LJM_DT_TSERIES) {
				if (currentDT == driver_const.LJM_DT_T4) {
					addDevice = true;
				}
				if (currentDT == driver_const.LJM_DT_T5) {
					addDevice = true;
				}
				if (currentDT == driver_const.LJM_DT_T7) {
					addDevice = true;
				}
				if (currentDT == driver_const.LJM_DT_T8) {
					addDevice = true;
				}
			}

			// If the device should be added, check its connection type.
			if(addDevice) {
				// Verify that the device has an appropriate connection type.
				addDevice = false;
				if(scanCT == ctANY) {
					addDevice = true;
				} else if(scanCTMedium == currentCT) {
					addDevice = true;
				} else if((scanCT == driver_const.LJM_CT_TCP) || (scanCT == ctUDP)) {
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

				// // Create curated device object.
				// var curatedDevice = new device_curator.device(true);

				// var deviceInfo = {};
				// if(currentDT === 7) {
				// 	deviceInfo = {
				// 		'serialNumber': 47001000,
				// 		'DEVICE_NAME_DEFAULT': 'Mock T7',
				// 		'HARDWARE_INSTALLED': 15,
				// 		'ipAddress': '192.168.1.101',
				// 		'ETHERNET_IP': '192.168.1.101',
				// 	};
				// } else {
				// 	deviceInfo = {
				// 		'serialNumber': 47001000,
				// 		'DEVICE_NAME_DEFAULT': 'Mock Digit',
				// 		'HARDWARE_INSTALLED': 15,
				// 		'ipAddress': '192.168.1.101',
				// 		'ETHERNET_IP': '192.168.1.101',
				// 	};
				// }
				// curatedDevice.configureMockDevice(deviceInfo)
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


	/* Stubbed functions... */
	this.inspectMockDevices = function() {
		console.log('in inspectMockDevices!');
		console.log('Num Current Devices', self.currentDevices.length);
		console.log('Num Mock Devices', self.devices);
	};
	this.currentDevices = [];
	this.updateCurrentDevices = function(currentDevices) {
		if(currentDevices) {
			self.currentDevices = currentDevices;
		} else {
			self.currentDevices = [];
		}
	};
	function getProductType(deviceInfo) {
		if(deviceInfo.dt === 7) {
			return deviceInfo.HARDWARE_INSTALLED.productType;
		} else if(deviceInfo.dt === 4) {
			// return deviceInfo.HARDWARE_INSTALLED.productType;
			return 'T4';
		} else if(deviceInfo.dt === 5) {
			// return deviceInfo.HARDWARE_INSTALLED.productType;
			return 'T5';
		} else if(deviceInfo.dt === 8) {
			// return deviceInfo.HARDWARE_INSTALLED.productType;
			return 'T8';
		} else if(deviceInfo.dt === 200) {
			return deviceInfo.DGT_INSTALLED_OPTIONS.productType;
		} else {
			console.log('Failed to get product type');
			return deviceInfo.deviceTypeName;
		}
	}
	function getModelType(deviceInfo) {
		var pt = deviceInfo.deviceTypeName;
		var sc = '';
		if(deviceInfo.dt === 7) {
			// pt = deviceInfo.HARDWARE_INSTALLED.productType;
			pt = deviceInfo.deviceTypeName;
			sc = deviceInfo.HARDWARE_INSTALLED.subclass;
		} else if(deviceInfo.dt === 4) {
			// pt = deviceInfo.HARDWARE_INSTALLED.productType;
			// sc = deviceInfo.HARDWARE_INSTALLED.subclass;
			pt = 'T4';
			sc = '';
		} else if(deviceInfo.dt === 5) {
			// pt = deviceInfo.HARDWARE_INSTALLED.productType;
			// sc = deviceInfo.HARDWARE_INSTALLED.subclass;
			pt = 'T5';
			sc = '';
		} else if(deviceInfo.dt === 8) {
			// pt = deviceInfo.HARDWARE_INSTALLED.productType;
			// sc = deviceInfo.HARDWARE_INSTALLED.subclass;
			pt = 'T8';
			sc = '';
		} else if(deviceInfo.dt === 200) {
			pt = deviceInfo.deviceTypeName;
			sc = deviceInfo.DGT_INSTALLED_OPTIONS.subclass;
		} else {
			console.log('Failed to get model type');
		}
		return pt + sc;
	}
	this.getDeviceInfo = function(handle, requiredInfo, cb) {
		var sn = 0;
		var device;
		var foundDevice = self.devices.some(function(mockDevice) {
			if(mockDevice.handle === handle) {
				sn = mockDevice.serialNumber;
				device = mockDevice;
				return true;
			} else {
				return false;
			}
		});

		// Support already connected devices...
		if(!foundDevice) {
			foundDevice = self.currentDevices.some(function(currentDevice) {
				if(currentDevice.savedAttributes.handle === handle) {
					sn = currentDevice.savedAttributes.serialNumber;
					device = currentDevice.savedAttributes;
					device.dt = device.deviceType;
					return true;
				} else {
					return false;
				}
			});
		}

		var data = {};
		if(foundDevice) {
			// self.getMockDeviceData(sn, requiredInfo)
			requiredInfo.forEach(function(address) {
				var res = getFakeResult(device, address);
				data[res.name] = res;
			});
			data.dt = device.dt;
			data.deviceType = device.deviceType;
			data.ct = device.connectionType;
			data.connectionType = device.connectionType;
			data.serialNumber = device.serialNumber;	
			data.isMockDevice = true;

			var dt = device.dt;
			data.dt = dt;
			data.deviceType = dt;
			data.deviceTypeStr = driver_const.DRIVER_DEVICE_TYPE_NAMES[dt];
			data.deviceTypeString = driver_const.DRIVER_DEVICE_TYPE_NAMES[dt];
			data.deviceTypeName = driver_const.DEVICE_TYPE_NAMES[dt];

			var ct = device.connectionType;
			data.handleConnectionType = ct;
			data.handleConnectionTypeStr = driver_const.DRIVER_CONNECTION_TYPE_NAMES[ct];
			data.handleConnectionTypeName = driver_const.CONNECTION_TYPE_NAMES[ct];
			
			var liveCT = driver_const.CONNECTION_MEDIUM[ct];
			data.ct = liveCT;
			data.connectionType = liveCT;
			data.connectionTypeStr = driver_const.DRIVER_CONNECTION_TYPE_NAMES[liveCT];
			data.connectionTypeName = driver_const.CONNECTION_TYPE_NAMES[liveCT];

			// deviceInfo.serialNumber = handleInfo.SerialNumber;
			// deviceInfo.ip = parseIPAddress(handleInfo.IPAddress);
			data.ip = device.ip;
			if(typeof(data.ip) === 'undefined') {
				data.ip = device.ipAddress;
			}
			data.port = device.port;

			// deviceInfo.port = handleInfo.Port;
			// deviceInfo.maxBytesPerMB = handleInfo.MaxBytesPerMB;	

			data.acquiredRequiredData = true;
			data.productType = getProductType(data);
			data.modelType = getModelType(data);
		} else {
			// The mock device wasn't found.  We should try getting a real device...
			console.log('Finding a real device...')
			ljmUtils.getDeviceInfo( handle, requiredInfo, cb);
		}
		cb(data);
	};

	this.verifyDeviceConnection = function(dt, ct, id, cb) {
		var data = {
			isVerified: true,
		};
		cb(data);
	};

	this.openAll = function(dt, ct, onErr, onSuccess) {
		var foundDevices = [];
		// console.log('dt, ct', dt, ct);
		addMockDevices(foundDevices, dt, ct)
		.then(function(devices) {
			var handles = [];
			devices.forEach(function(device) {
				handles.push(device.handle);
			});
			onSuccess({
				'handles': handles,
			});
		});
		/* Needs to return a data structure that matches the LJM openAll function. */
	};
}

exports.create = createMockDeviceScanner;