
var q = require('q');
var async = require('async');
var ljm = require('labjack-nodejs');
var lj_t7_upgrader = require('./labjack_t7_upgrade');
var driver_const = ljm.driver_const;

// Break out various buffer constants to make them easier to use
// for buffer manipulation.
var ARCH_INT_NUM_BYTES = driver_const.ARCH_INT_NUM_BYTES;
var ARCH_DOUBLE_NUM_BYTES = driver_const.ARCH_DOUBLE_NUM_BYTES;
var ARCH_POINTER_SIZE = driver_const.ARCH_POINTER_SIZE;

var ljmMockDevice;
var use_mock_device = true;

function device(useMockDevice) {
	var ljmDevice;
	this.isMockDevice = false;
	if(useMockDevice) {
		ljmMockDevice = require('./mocks/device_mock');
		ljmDevice = new ljmMockDevice.device();
		this.isMockDevice = true;
	} else {
		ljmDevice = new ljm.device();
	}
	this.getDevice = function() {
		return ljmDevice;
	};

	var constants = ljm.driver_const;
	var modbusMap = ljm.modbusMap.getConstants();

	this.savedAttributes = {};

	var privateOpen = function(openParameters) {
		var defered = q.defer();
		ljmDevice.open(
			openParameters.deviceType,
			openParameters.connectionType,
			openParameters.identifier,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	var customAttributes = {
		'BOOTLOADER_VERSION': null,
		'DEVICE_NAME_DEFAULT': null,
		'FIRMWARE_VERSION': null,
	};
	var deviceCustomAttributes = {
		'7': {
			'WIFI_VERSION': null,
			'HARDWARE_INSTALLED': function(res, isErr, errData) {
				// Deconstruct the HARDWARE_INSTALLED bitmask
				var highResADC = (res & 0x1) > 0;
				var wifi = (res & 0x2) > 0;
				var rtc = (res & 0x3) > 0;
				var sdCard = (res & 0x4) > 0;

				self.savedAttributes.subclass = '';
				self.savedAttributes.isPro = false;
				if(highResADC && wifi && rtc) {
					self.savedAttributes.subclass = '-Pro';
					self.savedAttributes.isPro = true;
				}
				var dc = self.savedAttributes.deviceClass;
				var sc = self.savedAttributes.subclass;
				self.savedAttributes.productType = dc + sc;
				return {
					'highResADC': highResADC,
					'wifi': wifi,
					'rtc': rtc,
					'sdCard': sdCard,
					'res': res
				};
			},
		},
		'200': {
			'DGT_INSTALLED_OPTIONS': function(res, isErr, errData) {
				self.savedAttributes.subclass = '';
				if(res === 2) {
					self.savedAttributes.subclass = '-TL';
					
				} else if (res === 3) {
					self.savedAttributes.subclass = '-TLH';
				}
				var dc = self.savedAttributes.deviceClass;
				var sc = self.savedAttributes.subclass;
				self.savedAttributes.productType = dc + sc;
			},
			'DGT_BATTERY_INSTALL_DATE':null
		}
	};
	var saveCustomAttributes = function(addresses, dt, formatters) {
		var defered = q.defer();
		self.readMultiple(addresses)
		.then(function(results) {
			results.forEach(function(res) {
				var hasFormatter = false;
				if(formatters[res.address]) {
					hasFormatter = true;
				}
				var info = modbusMap.getAddressInfo(res.address);
				// to get IF-STRING, info.typeString
				if(hasFormatter) {
					var output;
					if(res.isErr) {
						var argA;
						if(info.typeString === 'STRING') {
							argA = '';
						} else {
							argA = 0;
						}
						output = formatters[res.address](argA, res.isErr, res.data);
					} else {
						output = formatters[res.address](res.data, res.isErr);
					}
					self.savedAttributes[res.address] = output;
				} else {
					if(res.isErr) {
						if(info.typeString === 'STRING') {
							self.savedAttributes[res.address] = '';
						} else {
							self.savedAttributes[res.address] = 0;
						}
					} else {
						self.savedAttributes[res.address] = res.data;
					}
				}
			});
			defered.resolve(self.savedAttributes);
		}, function(err) {
			defered.resolve(self.savedAttributes);
		});
		return defered.promise;
	};
	var saveAndLoadAttributes = function(openParameters) {
		var saveAndLoad = function() {
			var defered = q.defer();
			self.savedAttributes = {};

			self.getHandleInfo()
			.then(function(info) {
				var infoKeys = Object.keys(info);
				infoKeys.forEach(function(key) {
					self.savedAttributes[key] = info[key];
				});
				self.savedAttributes.openParameters = openParameters;

				var dt = self.savedAttributes.deviceType;
				var ct = self.savedAttributes.connectionType;
				var dts = constants.DRIVER_DEVICE_TYPE_NAMES[dt];
				var deviceClass = constants.DEVICE_TYPE_NAMES[dt];
				var cts = constants.DRIVER_CONNECTION_TYPE_NAMES[ct];
				var connectionTypeName = constants.CONNECTION_TYPE_NAMES[ct];
				self.savedAttributes.deviceTypeString = dts;
				self.savedAttributes.deviceClass = deviceClass;
				self.savedAttributes.connectionTypeString = cts;
				self.savedAttributes.connectionTypeName = connectionTypeName;


				var ids = null;
				if(cts === 'LJM_ctUSB') {
					ids = self.savedAttributes.serialNumber.toString();
				} else {
					ids = self.savedAttributes.ipAddress;
				}
				self.savedAttributes.identifierString = ids;

				// Get and save device specific attributes
				var otherAttributeKeys = [];
				var customAttributeKeys = Object.keys(customAttributes);
				var devCustKeys;
				var formatters = {};
				customAttributeKeys.forEach(function(key) {
					formatters[key] = customAttributes[key];
				});
				if(deviceCustomAttributes[dt]) {
					devCustKeys = Object.keys(deviceCustomAttributes[dt]);
					otherAttributeKeys = customAttributeKeys.concat(devCustKeys);
					devCustKeys.forEach(function(key) {
						formatters[key] = deviceCustomAttributes[dt][key];
					});
				}
				saveCustomAttributes(otherAttributeKeys, dt, formatters)
				.then(defered.resolve);
			}, defered.reject);
			return defered.promise;
		};
		return saveAndLoad;
	};
	this.open = function(deviceType, connectionType, identifier) {
		var defered = q.defer();
		
		var openParameters = {
			'deviceType': deviceType,
			'connectionType': connectionType,
			'identifier': identifier
		};

		privateOpen(openParameters)
		.then(saveAndLoadAttributes(openParameters), function(err) {
			var innerDefered = q.defer();
			// console.log("device_curator.js - Open Failed", err);
			innerDefered.reject(err);
			return innerDefered.promise;
		})
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	this.getHandleInfo = function() {
		var defered = q.defer();
		ljmDevice.getHandleInfo(defered.reject, defered.resolve);
		return defered.promise;
	};
	this.getDeviceAttributes = function() {
		var defered = q.defer();
		defered.resolve(self.savedAttributes);
		return defered.promise;
	};
	this.readRaw = function(data) {
		var defered = q.defer();
		ljmDevice.readRaw(
			data,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.read = function(address) {
		var defered = q.defer();
		ljmDevice.read(
			address,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	/**
	 * Performs several single reads to get individual error codes.
	**/
	this.readMultiple = function(addresses) {
		var defered = q.defer();
		var results = [];
		var performRead = function(address, callback) {
			self.qRead(address)
			.then(function(res) {
				results.push({'address': address, 'isErr': false, 'data': res});
				callback();
			}, function(err) {
				results.push({'address': address, 'isErr': true, 'data': err});
				callback();
			});
		};
		var finishRead = function(err) {
			defered.resolve(results);
		};
		async.each(
			addresses,
			performRead, 
			finishRead
		);
		return defered.promise;
	};

	/**
	 * Performs several reads in a single packet.
	**/
	this.readMany = function(addresses) {
		var defered = q.defer();
		ljmDevice.readMany(
			addresses,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.writeRaw = function(data) {
		var defered = q.defer();
		ljmDevice.writeRaw(
			data,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.write = function(address, value) {
		var defered = q.defer();
		ljmDevice.write(
			address,
			value,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.writeMany = function(addresses, values) {
		var defered = q.defer();
		ljmDevice.writeMany(
			addresses,
			values,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.rwMany = function(addresses, directions, numValues, values) {
		var defered = q.defer();
		ljmDevice.rwMany(
			addresses,
			directions,
			numValues,
			values,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.readUINT64 = function(type) {
		var defered = q.defer();
		ljmDevice.readUINT64(
			type,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.streamStart = function(scansPerRead, scanList, scanRate) {
		var defered = q.defer();
		ljmDevice.streamStart(
			scansPerRead,
			scanList,
			scanRate,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	/**
	 * The goal of this function is to transpose & pull out information, and 
	 * calculate a timestamp for each stream data point given that the buffer
	 * object that gets populated by the streamRead function as "rawData"
	 * in the format:
	 *     [x1, y1, x2, y2, ... ]
	 * to:
	 *     [[timeStamp, x1, y1], [timeStamp, x2, y2], ... ]
	 * and save that new javascript object to the data object as "data".
	 * 
	 * This format was chosen because the created "data_buffer.js" file in 
	 * Kipling and the "flot" graphing program prefer data to be organized in
	 * similar ways to this.  It also cut down on the number of loops required
	 * to parse the data into one full pass-through of the data.
	**/
	var parseStreamData = function(data) {
		var defered = q.defer();
		
		var numValues = data.numVals;
		var numAddresses = data.numAddresses;
		var numResults = data.scansPerRead;

		data.data = [];
		data.autoRecoveryDetected = false;
		var i, j = 0;

		// Initialize variables to build a timestamp.
		var time = data.time;
		var timeIncrement = data.timeIncrement;

		// Initialize variables to control a data pointer.
		var pointerIncrement = ARCH_DOUBLE_NUM_BYTES;
		var pointer = 0;

		// Read and save data from the strea data (dta.rawData) buffer object.
		for (i = 0; i < numResults; i++) {
			var dataStore = [];
			dataStore.push(time);
			time += timeIncrement;
			for (j = 0; j < numAddresses; j++) {
				var val = data.rawData.readDoubleLE(pointer);
				if(val == -9999) {
					data.autoRecoveryDetected = true;
				}
				dataStore.push(val);
				pointer += pointerIncrement;
			}
			data.data.push(dataStore);
		}
		data.rawData = null;
		delete data.rawData;

		defered.resolve(data);
		return defered.promise;
	};
	this.streamRead = function() {
		var defered = q.defer();
		ljmDevice.streamRead( 
			defered.reject,
			function(data) {
				try {
					parseStreamData(data)
					.then(defered.resolve, defered.reject);
				} catch(err) {
					defered.reject('Error parsing stream data');
				}
			}
		);
		return defered.promise;
	};
	this.streamReadRaw = function() {
		var defered = q.defer();
		ljmDevice.streamRead(
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.streamStop = function() {
		var defered = q.defer();
		ljmDevice.streamStop(
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.close = function() {
		var defered = q.defer();
		ljmDevice.close(
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};

	/**
	 * Begin _DEFAULT safe functions
	**/
	this.qRead = function(address) {
		return self.retryFlashError('qRead', address);
	};
	this.qReadMany = function(addresses) {
		return self.retryFlashError('qReadMany', addresses);
	};
	this.qWrite = function(address, value) {
		return self.retryFlashError('qWrite', address, value);
	};
	this.qWriteMany = function(addresses, values) {
		return self.retryFlashError('qWriteMany', addresses, values);
	};
	this.qrwMany = function(addresses, directions, numValues, values) {
		return self.retryFlashError('qrwMany', addresses, directions, numValues, values);
	};
	this.qReadUINT64 = function(type) {
		return self.retryFlashError('qReadUINT64', type);
	};
	this.retryFlashError = function(cmdType, arg0, arg1, arg2, arg3, arg4) {
		var rqControlDeferred = q.defer();
        var device = self;
        var numRetries = 0;
        var ioNumRetry = 50;
        var ioDelay = 100;

        // Associate functions to the functions that should be re-tried
        // on flash error.
        var type={
            'qRead':'read',
            'qReadMany':'readMany',
            'qWrite':'write',
            'qWriteMany':'writeMany',
            'qrwMany':'rwMany',
            'qReadUINT64':'readUINT64',
            'qReadFlash':'readFlash'
        }[cmdType];
        var supportedFunctions = [
            'qRead',
            'qReadMany',
            'qWrite',
            'qWriteMany',
            'qrwMany',
            'qReadUINT64',
            // 'readFlash'
        ];
        var control = function() {
            // console.log('in dRead.read');
            var ioDeferred = q.defer();
            device[type](arg0,arg1,arg2,arg3)
            .then(function(result){
                // console.log('Read Succeded',result);
                ioDeferred.resolve({isErr: false, val:result});
            }, function(err) {
                // console.log('Read Failed',err);
                ioDeferred.reject({isErr: true, val:err});
            });
            return ioDeferred.promise;
        };
        var delayAndRead = function() {
            var iotimerDeferred = q.defer();
            var innerControl = function() {
                // console.log('in dRead.read');
                var innerIODeferred = q.defer();
                device[type](arg0,arg1,arg2,arg3)
                .then(function(result){
                    // console.log('Read Succeded',result);
                    innerIODeferred.resolve({isErr: false, val:result});
                }, function(err) {
                    // console.log('Read Failed',err);
                    innerIODeferred.reject({isErr: true, val:err});
                });
                return innerIODeferred.promise;
            };
            var qDelayErr = function() {
                var eTimerDeferred = q.defer();
                eTimerDeferred.resolve('read-timeout occured');
                return eTimerDeferred.promise;
            };
            var qDelay = function() {
                // console.log('in dRead.qDelay');
                var timerDeferred = q.defer();
                if(numRetries < ioNumRetry) {
                    // console.log('Re-trying');
                    setTimeout(timerDeferred.resolve,1000);
                } else {
                    timerDeferred.reject();
                }
                return timerDeferred.promise;
            };
            // console.log('in delayAndRead');
            if(arg4) {
                console.log('Attempting to Recover from 2358 Error');
                console.log('Function Arguments',type,arg0,arg1,arg2,arg3);
            }
            qDelay()
            .then(innerControl,qDelayErr)
            .then(function(res){
                if(!res.isErr) {
                    iotimerDeferred.resolve(res.val);
                } else {
                    iotimerDeferred.reject(res.val);
                }
            },delayAndRead)
            .then(iotimerDeferred.resolve,iotimerDeferred.reject);
            return iotimerDeferred.promise;
        };


        if(supportedFunctions.indexOf(cmdType) >= 0) {
            control()
            .then(function(res) {
                // success case for calling function
                rqControlDeferred.resolve(res.val);
            },function(res) {
                // error case for calling function
                var innerDeferred = q.defer();
                if(res.val == 2358) {
                    delayAndRead()
                    .then(innerDeferred.resolve,innerDeferred.reject);
                } else {
                    innerDeferred.resolve(res.val);
                }
                return innerDeferred.promise;
            })
            .then(function(res) {
                // console.log('Read-Really-Finished',arg0,res);
                rqControlDeferred.resolve(res);
            },function(err) {
                console.error('DC rqControl',err);
                rqControlDeferred.reject(err);
            });
        } else {
            console.log(cmdType,type,supportedFunctions.indexOf(type));
            throw 'device_controller.rqControl Error!';
        }
        return rqControlDeferred.promise;
	};

	/**
	 * Begin T7 specific functions:
	**/
	var UpgradeProgressListener = function (percentListener, stepListener) {
		this.previousPercent = 0;
		// Function gets updated and has a percentage value.
        this.updatePercentage = function (value, callback) {
        	var newVal = Math.floor(parseFloat(value.toFixed(1)));
        	if(newVal !== self.previousPercent) {
        		if (callback !== undefined) {
	            	percentListener(newVal)
	            	.then(callback);
	            }
	            self.previousPercent = newVal;
        	}
        };

        // Function gets updated during various steps of the update procedure.
        // Text: 1. "", "", ""
        this.updateStepName = function (value, callback) {
            if (callback !== undefined) {
                stepListener(value)
            	.then(callback);
            }
        };
        var self = this;
    };
    var getDeviceTypeMessage = function(dt) {
    	return "Function not supported for deviceType: " + dt.toString();
    };
	this.updateFirmware = function(firmwareFileLocation, percentListener, stepListener) {
		var dt = self.savedAttributes.deviceType;
		var percentListenerObj;
		var stepListenerObj;
		var defaultListener = function(value) {
			var defered = q.defer();
			defered.resolve();
			return defered.promise;
		};
		if(percentListener) {
			percentListenerObj = percentListener;
		} else {
			percentListenerObj = defaultListener;
		}
		if(stepListener) {
			stepListenerObj = stepListener;
		} else {
			stepListenerObj = defaultListener;
		}
		var defered = q.defer();
		if(dt === 7) {
			var progressListener = new UpgradeProgressListener(
				percentListenerObj, 
				stepListenerObj
			);
			lj_t7_upgrader.updateFirmware(
				self,
				ljmDevice,
				firmwareFileLocation,
				self.savedAttributes.connectionTypeString,
				progressListener
			).then(function(results){
				ljmDevice.handle = results.getDevice().handle;
				defered.resolve(results);
			}, defered.reject);
		} else {
			defered.reject(getDeviceTypeMessage(dt));
		}
		return defered.promise;
	};

	/**
	 * Digit Specific functions:
	**/
	this.digitRead = function(address) {
		var dt = self.savedAttributes.deviceType;
		var defered = q.defer();
		if(dt === 200) {
			var calibrateVal = function(res) {
				defered.resolve(res);
			};
			self.read(address)
			.then(calibrateVal, defered.reject);
		} else {
			defered.reject(getDeviceTypeMessage(dt));
		}
		return defered.promise;
	};
	this.readHumidity = function() {
		return self.digitRead('DGT_HUMIDITY_RAW');
	};

	var self = this;
}

exports.device = device;