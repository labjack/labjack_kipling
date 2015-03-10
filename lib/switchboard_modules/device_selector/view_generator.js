
/* jshint undef: true, unused: false, undef: true */
/* global global, require, $, console */

// console.log('in device_selector view_generator.js');

var package_loader;
var q;
var gns;
var static_files;
try {
	package_loader = global.require.main.require('ljswitchboard-package_loader');
	q = global.require.main.require('q');
	gns = package_loader.getNameSpace();
	static_files = global.require('ljswitchboard-static_files');
} catch(err) {
	package_loader = require.main.require('ljswitchboard-package_loader');
	q = require.main.require('q');
	gns = package_loader.getNameSpace();
	static_files = require('ljswitchboard-static_files');
}

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var handlebars = require('handlebars');
var path = require('path');


var createDeviceSelectorViewGenerator = function() {
	var self = this;
	this.debug = false;
	this.moduleData = undefined;
	this.deviceListingTemplate = undefined;
	this.wifiImageTemplate = undefined;
	this.connectionButtonLogic = undefined;
	this.appendPageLogicToScanResults = undefined;
	this.scanResultsCache = undefined;
	this.onConnect = undefined;
	this.onDisconnect = undefined;
	this.slideDuration = 200;

	this.eventList = {
		REFRESH_DEVICES: 'REFRESH_DEVICES',
		OPEN_DEVICE: 'OPEN_DEVICE',
		DEVICE_OPENED: 'DEVICE_OPENED',
		DEVICE_FAILED_TO_OPEN: 'DEVICE_FAILED_TO_OPEN',
		DEVICE_CLOSED: 'DEVICE_CLOSED',
		DEVICE_FAILED_TO_CLOSE: 'DEVICE_FAILED_TO_CLOSE',
	};

	var pageControlElementsList = [
		{'id': '#device_scan_status', 'name': 'device_scan_status'},
		{'id': '#device_scan_results', 'name': 'device_scan_results'},
		{
			'id': '#refresh_devices_button',
			'name': 'refresh_devices_button',
			'type': 'button',
			'eventName': 'click',
			'func': function(clickEvent) {
				self.emit(
					self.eventList.REFRESH_DEVICES,
					clickEvent.data
				);
			}
		}
	];
	var elements = {};
	this.pageElements = elements;
	this.deviceControlElements = {};

	var getSlideUpElement = function(ele) {
		var slideUp = function() {
			var defered = q.defer();
			ele.slideUp(self.slideDuration, defered.resolve);
			return defered.promise;
		};
		return slideUp;
	};
	var getSlideDownElement = function(ele) {
		var slideDown = function() {
			var defered = q.defer();
			ele.slideDown(self.slideDuration, defered.resolve);
			return defered.promise;
		};
		return slideDown;
	};
	var getEmptyElement = function(ele) {
		var emptyElement = function() {
			var defered = q.defer();
			ele.empty();
			defered.resolve();
			return defered.promise;
		};
		return emptyElement;
	};
	var getFillElement = function(ele) {
		var fillElement = function(data) {
			var defered = q.defer();
			ele.empty();
			ele.ready(function() {
				defered.resolve(data);
			});
			ele.append($(data));
			// defered.resolve();
			return defered.promise;
		};
		return fillElement;
	};
	this.cachePageControlElements = function(moduleData) {
		self.moduleData = moduleData;
		var modulePath = moduleData.path;
		var connectionButtonLogicPath = path.join(
			modulePath,
			'connection_button_logic.js'
		);
		self.connectionButtonLogic = require(connectionButtonLogicPath);
		self.appendPageLogicToScanResults = self.connectionButtonLogic.appendPageLogicToScanResults;

		self.deviceListingTemplate = handlebars.compile(
			moduleData.htmlFiles.found_devices
		);
		self.wifiImageTemplate = handlebars.compile(
			moduleData.htmlFiles.wifi_image
		);
		pageControlElementsList.forEach(function(element){
			var ele = $(element.id);
			elements[element.name] = {
				'ref': ele,
				'slideUp': getSlideUpElement(ele),
				'slideDown': getSlideDownElement(ele),
				'empty': getEmptyElement(ele),
				'fill': getFillElement(ele),
			};
			if(element.type) {
				if(element.eventName) {
					if(element.func) {
						ele.on(element.eventName, element, element.func);
					}
				}
			}
		});
	};
	this.saveDeviceControlFunctions = function(onConnect, onDisconnect) {
		self.onConnect = onConnect;
		self.onDisconnect = onDisconnect;
	};

	this.displayScanInProgress = function() {
		return elements.device_scan_results.slideUp()
		.then(elements.device_scan_status.slideDown);
	};
	this.displayScanResultsPageData = function(renderedData) {
		return elements.device_scan_results.fill(renderedData)
		.then(elements.device_scan_status.slideUp)
		.then(elements.device_scan_results.slideDown);
	};

	var handleOnConnectResult = function(results) {
		var defered = q.defer();

		var data;
		var key;
		var elements;

		var onConnectResult = results[0];
		if(onConnectResult.state === "rejected") {
			// Device opened successfully.
			if(self.debug) {
				console.log('Open Error', onConnectResult.reason);
			}
			data = onConnectResult.reason;
			key = getDeviceControlKey(data.device);
			elements = self.deviceControlElements[key];

			// Re-attach connect button listeners
			attachConnectListeners(data.device);
			elements.connectButtonsHolder.slideDown()
			.then(function() {
				self.emit(self.eventList.DEVICE_FAILED_TO_OPEN, data);
				defered.resolve(results);
			});
		} else {
			// Device opened successfully.
			if(self.debug) {
				console.log('Open Success', onConnectResult.value);
			}
			data = onConnectResult.value;
			key = getDeviceControlKey(data.device);
			elements = self.deviceControlElements[key];

			// Attach to disconnect button listener
			attachDisconnectListener(data.device);
			elements.disconnectButtonHolder.slideDown()
			.then(function() {
				self.emit(self.eventList.DEVICE_OPENED, data);
				defered.resolve(results);
			});
		}
		return defered.promise;
	};
	var openDeviceListener = function(eventData) {
		if(self.debug) {
			console.log('Open button clicked', eventData.data);
		}
		// Remove remaining open button listners
		removeConnectListeners(eventData.data.device);

		var key = getDeviceControlKey(eventData.data.device);
		var promises = [];
		promises.push(self.onConnect(eventData.data));
		promises.push(
			self.deviceControlElements[key].connectButtonsHolder.slideUp()
		);
		
		// Wait for both tasks to finish
		q.allSettled(promises)
		.then(handleOnConnectResult);
	};
	var handleOnDisconnectResult = function(results) {
		var defered = q.defer();

		var data;
		var key;
		var elements;

		var onConnectResult = results[0];
		if(onConnectResult.state === "rejected") {
			// Device opened successfully.
			if(self.debug) {
				console.log('Close Error', onConnectResult.reason);
			}
			data = onConnectResult.reason;
			key = getDeviceControlKey(data.device);
			elements = self.deviceControlElements[key];

			// Re-attach connect button listeners
			attachDisconnectListener(data.device);
			elements.disconnectButtonHolder.slideDown()
			.then(function() {
				self.emit(self.eventList.DEVICE_FAILED_TO_CLOSE, data);
				defered.resolve(results);
			});
		} else {
			// Device opened successfully.
			if(self.debug) {
				console.log('Close Success', onConnectResult.value);
			}
			data = onConnectResult.value;
			key = getDeviceControlKey(data.device);
			elements = self.deviceControlElements[key];

			// Attach to disconnect button listener
			attachConnectListeners(data.device);
			elements.connectButtonsHolder.slideDown()
			.then(function() {
				self.emit(self.eventList.DEVICE_CLOSED, data);
				defered.resolve(results);
			});
		}
		return defered.promise;
	};
	var closeDeviceListener = function(eventData) {
		if(self.debug) {
			console.log('Disconnect button clicked', eventData.data);
		}

		var key = getDeviceControlKey(eventData.data.device);
		var promises = [];
		promises.push(self.onDisconnect(eventData.data));
		promises.push(
			self.deviceControlElements[key].disconnectButtonHolder.slideUp()
		);
		
		// Wait for both tasks to finish
		q.allSettled(promises)
		.then(handleOnDisconnectResult);
	};
	var attachClickListener = function(ele, device, connectionType) {
		var clickData = {
			'device': device,
			'connectionType': connectionType,
		};
		ele.one('click', clickData, openDeviceListener);
		/*
		ele.attr('disabled',true); // Disables the button

		// a jquery trick of:
		$( "#foo" ).on( "click", function( event ) {
			alert( "This will be displayed only once." );
			$( this ).off( event );
		});
		may be useful.
		api.jquery.com/one/
		*/
	};

	var attachConnectListeners = function(device) {
		var key = getDeviceControlKey(device);
		device.connectionTypes.forEach(function(connectionType) {
			var ctKey = connectionType.name;
			attachClickListener(
				self.deviceControlElements[key][ctKey].ele,
				device,
				connectionType
			);
		});
	};
	var removeConnectListeners = function(device) {
		var key = getDeviceControlKey(device);
		device.connectionTypes.forEach(function(connectionType) {
			var ctKey = connectionType.name;
			self.deviceControlElements[key][ctKey].ele.off('click');
		});
	};
	var attachDisconnectListener = function(device) {
		if(self.debug) {
			console.log('Attaching disconnect listener');
		}
		var key = getDeviceControlKey(device);
		var element = self.deviceControlElements[key].disconnectButton.ele;
		element.one('click', {'device': device}, closeDeviceListener);
	};
	var removeDisconnectListener = function(device) {
		var key = getDeviceControlKey(device);
		var element = self.deviceControlElements[key].disconnectButton.ele;
		element.off('click');
	};

	var createConnectButtonSelector = function(device, connectionType) {
		var selector = '';
		var dt = device.deviceTypeName.toString();
		dt = '.DEVICE_TYPE_' + dt;
		var sn = device.serialNumber.toString();
		sn = '.SERIAL_NUMBER_' + sn;
		var ct = connectionType.name.toString();
		ct = '.CONNECTION_TYPE_' + ct;

		selector = dt + ' ' + sn + ' ' + ct;
		return selector;
	};
	var createConnectionButtonsHolderSelector = function(device) {
		var selector = '';
		var dt = device.deviceTypeName.toString();
		dt = '.DEVICE_TYPE_' + dt;
		var sn = device.serialNumber.toString();
		sn = '.SERIAL_NUMBER_' + sn;
		var ctHolder = '.connect_buttons_class';

		selector = dt + ' ' + sn + ' ' + ctHolder;
		return selector;
	};
	var createDisconnectButtonSelector = function(device) {
		var selector = '';
		var dt = device.deviceTypeName.toString();
		dt = '.DEVICE_TYPE_' + dt;
		var sn = device.serialNumber.toString();
		sn = '.SERIAL_NUMBER_' + sn;
		var ctHolder = '.disconnect-button';

		selector = dt + ' ' + sn + ' ' + ctHolder;
		return selector;
	};
	var createDisconnectButtonHolderSelector = function(device) {
		var selector = '';
		var dt = device.deviceTypeName.toString();
		dt = '.DEVICE_TYPE_' + dt;
		var sn = device.serialNumber.toString();
		sn = '.SERIAL_NUMBER_' + sn;
		var ctHolder = '.disconnect_buttons_class';

		selector = dt + ' ' + sn + ' ' + ctHolder;
		return selector;
	};
	var getDeviceControlKey = function(device) {
		var dt = device.deviceTypeName.toString();
		var sn = device.serialNumber.toString();
		return [dt,sn].join('_');
	};
	this.cacheDeviceControlElements = function(scanResults) {
		var defered = q.defer();
		// Clear previous elements cache TODO: Disconnect from listeners
		self.deviceControlElements = {};

		if(self.debug) {
			console.log('Caching Device Control Elements');
		}
		// console.log('numDeviceTypes', scanResults.length);
		scanResults.forEach(function(deviceType) {
			// console.log('Data:', Object.keys(deviceType));
			deviceType.devices.forEach(function(device) {
				// console.log('Device Data', device);
				var key = getDeviceControlKey(device);
				self.deviceControlElements[key] = {};

				var cbhSelector = createConnectionButtonsHolderSelector(device);
				var cbhEle = $(cbhSelector);
				var dbhSelector = createDisconnectButtonHolderSelector(device);
				var dbhEle = $(dbhSelector);
				var dbSelector = createDisconnectButtonSelector(device);
				var dbEle = $(dbSelector);

				self.deviceControlElements[key] = {
					'connectButtonsHolder': {
						'id': cbhSelector,
						'ele': cbhEle,
						'slideUp': getSlideUpElement(cbhEle),
						'slideDown': getSlideDownElement(cbhEle),
					},
					'disconnectButtonHolder': {
						'id': dbhSelector,
						'ele': dbhEle,
						'slideUp': getSlideUpElement(dbhEle),
						'slideDown': getSlideDownElement(dbhEle),
					},
					'disconnectButton': {
						'id': dbSelector,
						'ele': dbEle,
						'slideUp': getSlideUpElement(dbEle),
						'slideDown': getSlideDownElement(dbEle),
					},
				};

				// Establish connection type listeners
				device.connectionTypes.forEach(function(connectionType) {
					var selector = createConnectButtonSelector(
						device,
						connectionType
					);
					var ctKey = connectionType.name;
					var ele = $(selector);
					self.deviceControlElements[key][ctKey] = {
						'id': selector,
						'ele': ele
					};
				});
				
				if(!device.isActive) {
					// Attach connect button listeners
					attachConnectListeners(device);
				} else {
					// Attach disconnect button listeners
					attachDisconnectListener(device);
				}
			});
		});
		defered.resolve(scanResults);
		return defered.promise;
	};

	
	var innerDisplayScanResults = function(scanResults) {
		console.log('Displaying Scan Results', scanResults);

		var defered = q.defer();
		var data = '';
		try {
			if(scanResults.length === 0) {
				if(self.moduleData.htmlFiles.no_devices_found) {
					data = self.moduleData.htmlFiles.no_devices_found;
				}
				self.displayScanResultsPageData(data);
				defered.resolve(scanResults);
			} else {
				if(self.debug) {
					console.log('Displaying Data', scanResults.length);
				}
				// Display Data
				data += '<p>Found ';
				data += scanResults.length.toString();
				data += ' devices</p>';
				if(self.deviceListingTemplate) {
					data = self.deviceListingTemplate({
						'device_types': scanResults,
						'staticFiles': static_files.getDir(),
					});
				}
				self.displayScanResultsPageData(data)
				.then(function() {
					defered.resolve(scanResults);
				});
			}
		} catch(err) {
			data = '';
			data += '<p>Error Displaying Scan Results: ';
			data += JSON.stringify(err);
			data += '</p>';
			console.error('error displaying scan results');
			self.displayScanResultsPageData(data);
			defered.resolve(scanResults);
		}
		return defered.promise;
	};
	this.displayScanResults = function(scanResults) {
		self.scanResultsCache = scanResults;
		return self.appendPageLogicToScanResults(
			scanResults,
			self.wifiImageTemplate
		)
		.then(innerDisplayScanResults)
		.then(self.cacheDeviceControlElements);
	};

	this.test = function() {
		self.displayScanResultsPageData('<p>Scan Finished!</p>');
	};
	// var self = this;
};
util.inherits(createDeviceSelectorViewGenerator, EventEmitter);

