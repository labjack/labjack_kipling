var q = require('q');
var fs = require('fs');
var path = require('path');
var modbusMap = require('ljswitchboard-modbus_map').getConstants();
var async = require('async');
var lj_apps_win_registry_info = require('lj-apps-win-registry-info');
var driver_const = require('ljswitchboard-ljm_driver_constants');
var getLJAppsRegistryInfo = lj_apps_win_registry_info.getLJAppsRegistryInfo;
var ljAppNames = lj_apps_win_registry_info.ljAppNames;
var ljm_ffi_req = require('ljm-ffi');
var ljm_ffi = ljm_ffi_req.load();
var net = require('net');

var DEBUG_MANUAL_IP_CHECKING = false;

function getLogger(bool) {
	return function logger() {
		if(bool) {
			console.log.apply(console, arguments);
		}
	};
}

var debugMIC = getLogger(DEBUG_MANUAL_IP_CHECKING);

function getAvailableConnectionsOperations(self) {
	/**
	 * Available Connection Types:
	 */
	function checkForUSBConnectivity(bundle) {
		var defered = q.defer();
		var connectionStatus = {
			'type': 'USB',
			'isConnectable': false,	// Can another process als use this connection?
			'isConnected': false,	// Is this the currently active connection?
			'isAvailable': false,	// Is this an available connection type?
			'id': undefined,
		}
		var isConnected = false;
		// Determine whether or not the current connection type is USB.
		if(self.savedAttributes.connectionTypeName === 'USB') {
			connectionStatus.isConnected = true; // This is the currently active connection.
		}

		if(connectionStatus.isConnected) {
			connectionStatus.isConnectable = false; // USB devices, only 1 active connection.
			connectionStatus.isAvailable = true;	// This device is available via USB.
			connectionStatus.id = self.savedAttributes.serialNumber.toString();
			bundle.connections.push(connectionStatus);
			defered.resolve(bundle);
		} else {
			// ljm_ffi
			var id = self.savedAttributes.serialNumber.toString();
			connectionStatus.id = self.savedAttributes.serialNumber.toString();
			var dt = self.savedAttributes.deviceTypeName;
			var ct = 'USB';
			function closeFinished(data) {
				defered.resolve(bundle);
			}
			function openFinished(data) {
				if(data.ljmError === 0) {
					connectionStatus.isConnectable = true;
					connectionStatus.isAvailable = true;
					bundle.connections.push(connectionStatus);
					ljm_ffi.LJM_Close.async(data.handle, closeFinished);
				} else {
					// connectionStatus.isConnectable = false;
					// connectionStatus.isAvailable = false;
					// bundle.connections.push(connectionStatus);
					defered.resolve(bundle);
				}
			}
			ljm_ffi.LJM_OpenS.async(dt, ct, id, 0, openFinished);
		}
		return defered.promise;	
	}
	function isIPConnectable(ip) {
		var defered = q.defer();
		var socket = new net.Socket();
		var results = [];
		var closed = false;
		var connectionnTimedOut = false;
		function handleTimeout() {
			debugMIC('in handleTimeout');
			connectionnTimedOut = true;
			setImmediate(processClose);
		}
		var timeout = setTimeout(handleTimeout, 2000);
		function processClose() {
			closed = true;
			var isConnectable = true;
			if(results.indexOf('error') >= 0) {
				isConnectable = false;
			}
			if(connectionnTimedOut) {
				isConnectable = false;
			} else {
				clearTimeout(timeout);
			}
			socket.destroy();
			socket.unref();
			defered.resolve(isConnectable);
		}
		socket.on('connect', function(data) {
			debugMIC('in connect');
			results.push('connect');
			setImmediate(function() {
				socket.end();
			});
		});
		socket.on('close', function(data) {
			debugMIC('in close');
			results.push('close');
			if(!closed) {
				setImmediate(processClose);
			}
			// debugMIC('closing socket');
		})
		socket.on('error', function(data) {
			debugMIC('in error');
			results.push('error');
			// console.log('error', data);
		})
		socket.on('end', function(data) {
			debugMIC('in end');
			results.push('end');
			if(!closed) {
				setImmediate(processClose);
			}
			// console.log('Disconnected from device.');
		});

		socket.connect({port:502, host:ip});
		return defered.promise;
	}
	function checkForEthernetConnectivity(bundle) {
		var defered = q.defer();
		var connectionStatus = {
			'type': 'Ethernet',
			'isConnectable': false,	// Can another process als use this connection?
			'isConnected': false,	// Is this the currently active connection?
			'isAvailable': false,	// Is this an available connection type?
			'id': undefined,
		}
		var isConnected = false;
		// Determine whether or not the current connection type is Ethernet.
		if(self.savedAttributes.connectionTypeName === 'Ethernet') {
			connectionStatus.isConnected = true; // This is the currently active connection.
		}

		if(connectionStatus.isConnected) {
			connectionStatus.id = self.savedAttributes.ipAddress;
			isIPConnectable(self.savedAttributes.ipAddress)
			.then(function(isConnectable) {
				connectionStatus.isConnectable = isConnectable;	// Ethernet devices, 2 active connections, aka we need to check.
				connectionStatus.isAvailable = true;			// This device is available via Ethernet.
				bundle.connections.push(connectionStatus);
				defered.resolve(bundle);
			});

			// Interesting state.  This open/close command breaks LJM.
			// var dt = self.savedAttributes.deviceTypeName;
			// var ct = 'Ethernet';
			// var id = self.savedAttributes.ipAddress;

			// function closeFinished(data) {
			// 	defered.resolve(bundle);
			// }
			// function openFinished(data) {
			// 	if(data.ljmError === 0) {
			// 		connectionStatus.isConnectable = true;
			// 		connectionStatus.isAvailable = true;
			// 		bundle.connections.push(connectionStatus);
			// 		ljm_ffi.LJM_Close.async(data.handle, closeFinished);
			// 	} else {
			// 		connectionStatus.isConnectable = false;
			// 		connectionStatus.isAvailable = true;
			// 		bundle.connections.push(connectionStatus);
			// 		defered.resolve(bundle);
			// 	}
			// }

			// ljm_ffi.LJM_OpenS.async(dt, ct, id, 0, openFinished);
		} else {
			self.cRead('ETHERNET_IP')
			.then(function(cachedEthIPRes) {
				if(cachedEthIPRes.isReal) {
					var id = cachedEthIPRes.val;
					connectionStatus.id = cachedEthIPRes.val;
					isIPConnectable(id)
					.then(function(isConnectable) {
						connectionStatus.isConnectable = isConnectable;	// Ethernet devices, 2 active connections, aka we need to check.
						connectionStatus.isAvailable = true;			// This device is available via Ethernet.
						bundle.connections.push(connectionStatus);
						defered.resolve(bundle);
					});
					// var dt = self.savedAttributes.deviceTypeName;
					// var ct = 'Ethernet';
					// function closeFinished(data) {
					// 	defered.resolve(bundle);
					// }
					// function openFinished(data) {
					// 	if(data.ljmError === 0) {
					// 		connectionStatus.isConnectable = true;
					// 		connectionStatus.isAvailable = true;
					// 		bundle.connections.push(connectionStatus);
					// 		ljm_ffi.LJM_Close.async(data.handle, closeFinished);
					// 	} else {
					// 		connectionStatus.isConnectable = false;
					// 		connectionStatus.isAvailable = true;
					// 		bundle.connections.push(connectionStatus);
					// 		defered.resolve(bundle);
					// 	}
					// }

					// ljm_ffi.LJM_OpenS.async(dt, ct, id, 0, openFinished);
				} else {
					defered.resolve(bundle);
				}
			}, function(err) {
				defered.resolve(bundle);
			});
		}
		return defered.promise;
	}
	function checkForWiFiConnectivity(bundle) {
		var defered = q.defer();
		var connectionStatus = {
			'type': 'WiFi',
			'isConnectable': false,	// Can another process als use this connection?
			'isConnected': false,	// Is this the currently active connection?
			'isAvailable': false,	// Is this an available connection type?
			'id': undefined,
		}
		var isConnected = false;
		// Determine whether or not the current connection type is WiFi.
		if(self.savedAttributes.connectionTypeName === 'WiFi') {
			connectionStatus.isConnected = true; // This is the currently active connection.
		}

		if(connectionStatus.isConnected) {
			// connectionStatus.isConnectable = false; // WiFi devices, 1 active connection.
			// connectionStatus.isAvailable = true;	// This device is available via WiFi.
			// connectionStatus.id = self.savedAttributes.ipAddress;
			// bundle.connections.push(connectionStatus);
			// defered.resolve(bundle);
			connectionStatus.id = self.savedAttributes.ipAddress;
			isIPConnectable(self.savedAttributes.ipAddress)
			.then(function(isConnectable) {
				connectionStatus.isConnectable = isConnectable;	// WiFi devices, 1 active connections (maybe more in the future), aka we need to check.
				connectionStatus.isAvailable = true;			// This device is available via WiFi.
				bundle.connections.push(connectionStatus);
				defered.resolve(bundle);
			});
		} else {
			self.cReadMany(['WIFI_STATUS','WIFI_IP'])
			.then(function(cachedResults) {
				var WIFI_STATUS,WIFI_IP;
				cachedResults.forEach(function(result) {
					if(result.name === 'WIFI_STATUS') {
						WIFI_STATUS = result;
					} else if(result.name === 'WIFI_IP') {
						WIFI_IP = result;
					}
				});
				if(WIFI_STATUS.isConnected) {
					var id = WIFI_IP.val;
					connectionStatus.id = WIFI_IP.val;
					isIPConnectable(id)
					.then(function(isConnectable) {
						connectionStatus.isConnectable = isConnectable;
						connectionStatus.isAvailable = true;
						bundle.connections.push(connectionStatus);
						defered.resolve(bundle);
					});
					// var dt = self.savedAttributes.deviceTypeName;
					// var ct = 'WiFi';
					// function closeFinished(data) {
					// 	defered.resolve(bundle);
					// }
					// function openFinished(data) {
					// 	if(data.ljmError === 0) {
					// 		connectionStatus.isConnectable = true;
					// 		connectionStatus.isAvailable = true;
					// 		bundle.connections.push(connectionStatus);
					// 		ljm_ffi.LJM_Close.async(data.handle, closeFinished);
					// 	} else {
					// 		connectionStatus.isConnectable = false;
					// 		connectionStatus.isAvailable = true;
					// 		bundle.connections.push(connectionStatus);
					// 		defered.resolve(bundle);
					// 	}
					// }
					// ljm_ffi.LJM_OpenS.async(dt, ct, id, 0, openFinished);
				} else {
					defered.resolve(bundle);
				}
			}, function(err) {
				defered.resolve(bundle);
			});
		}
		return defered.promise;
	}

	this.getAvailableConnectionTypes = function() {
		var defered = q.defer();
		var productType = self.savedAttributes.productType;
		var bundle = {
			'connections': [],
		}
		function finishFunc(res) {
			cachedAvailableConnectionTypes.connectionsRes = res;
			cachedAvailableConnectionTypes.queryTime = new Date();
			cachedAvailableConnectionTypes.cached = true;
			defered.resolve(res);
		}
		if(productType === 'T4') {
			checkForUSBConnectivity(bundle)
			.then(checkForEthernetConnectivity)
			.then(finishFunc);
		} else if(productType === 'T7') {
			checkForUSBConnectivity(bundle)
			.then(checkForEthernetConnectivity)
			.then(finishFunc);
		} else if(productType === 'T7-Pro') {
			checkForUSBConnectivity(bundle)
			.then(checkForEthernetConnectivity)
			.then(checkForWiFiConnectivity)
			.then(finishFunc);
		} else {
			checkForUSBConnectivity(bundle)
			.then(finishFunc);
		}

		return defered.promise;
	};
	/* This is the cached version of the get available connection types function */
	var cachedAvailableConnectionTypes = {
		connectionsRes: [],
		queryTime: new Date(),
		cached: false,
	};
	this.cGetAvailableConnectionTypes = function() {
		if(cachedAvailableConnectionTypes.cached) {
			var curTime = new Date();
			var fiveMin = 1000*60*5; // 1k ms, 60 sec/min, 5min
			if(curTime - cachedAvailableConnectionTypes.queryTime > fiveMin) {
				return self.getAvailableConnectionTypes();
			} else {
				var defered = q.defer();
				defered.resolve(cachedAvailableConnectionTypes.connectionsRes);
				return defered.promise;
			}
		} else {
			return self.getAvailableConnectionTypes();
		}
	}
}

module.exports.get = getAvailableConnectionsOperations;