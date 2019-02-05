
/* jshint undef: true, unused: false, undef: true */
/* global global, require, $, console, MODULE_CHROME */

// console.log('in device_selector view_generator.js');

var package_loader;
var q;
var gns;
var static_files;
var driver_const;
try {
	package_loader = global.require.main.require('ljswitchboard-package_loader');
	q = global.require.main.require('q');
	gns = package_loader.getNameSpace();
	static_files = global.require('ljswitchboard-static_files');
	driver_const = global.require('ljswitchboard-ljm_driver_constants');
} catch(err) {
	package_loader = require.main.require('ljswitchboard-package_loader');
	q = require.main.require('q');
	gns = package_loader.getNameSpace();
	static_files = require('ljswitchboard-static_files');
	driver_const = require('ljswitchboard-ljm_driver_constants');
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
	this.scanningForDevicesTemplate = undefined;
	this.directOpeningDeviceTemplate = undefined;
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
		DIRECT_OPEN_DEVICE: 'DIRECT_OPEN_DEVICE',
		TOGGLE_ADVANCED_SCAN_OPTIONS: 'TOGGLE_ADVANCED_SCAN_OPTIONS',
		TOGGLE_DIRECT_CONNECT_OPTIONS: 'TOGGLE_DIRECT_CONNECT_OPTIONS',
	};

	var pageControlElementsList = [
		{'id': '#device_scan_status', 'name': 'device_scan_status'},
		{'id': '#device_scan_results', 'name': 'device_scan_results'},
		{'id': '#ethernet_tcp_scan_option', 'name': 'ethernet_tcp_scan_option'},
		{'id': '#wifi_tcp_scan_option', 'name': 'wifi_tcp_scan_option'},
		{'id': '.advanced-scan-option', 'name': 'advanced_scan_options'},
		{'id': '.direct-connect-options-page-data', 'name': 'direct_connect_options_page_data'},
		{'id': '#device_type_input', 'name': 'device_type_input'},
		{'id': '#connection_type_input', 'name': 'connection_type_input'},
		{'id': '#identifier_input', 'name': 'identifier_input'},
		{
			'id': '#refresh_devices_button',
			'name': 'refresh_devices_button',
			'type': 'button',
			'eventName': 'click',
			'func': function refreshDevicesBtn(clickEvent) {
				self.emit(
					self.eventList.REFRESH_DEVICES,
					clickEvent.data
				);
			}
		},
		{
			'id': '#attempt_direct_connect_btn',
			'name': 'attempt_direct_connect_btn',
			'type': 'button',
			'eventName': 'click',
			'func': function attemptDirectConnect(clickEvent) {
				var openParams = {
					dt: self.pageElements.device_type_input.ref.val(),
					ct: self.pageElements.connection_type_input.ref.val(),
					id: self.pageElements.identifier_input.ref.val(),
				};
				clickEvent.data.openParams = openParams;
				self.emit(
					self.eventList.DIRECT_OPEN_DEVICE,
					clickEvent.data
				);
			}
		},
		{
			'id': '.device-type-dropdown .menuOption',
			'name': 'direct_connect_dt_btn',
			'type': 'button',
			'eventName': 'click',
			'func': function directConnectEasyDT(clickEvent) {
				// console.log('in direct_connect_dt_btn clk handler',clickEvent.data, clickEvent.currentTarget.innerText);
				var txt = clickEvent.currentTarget.innerText;
				self.pageElements.device_type_input.ref.val(txt);

			}
		},
		{
			'id': '.connection-type-dropdown .menuOption',
			'name': 'direct_connect_ct_btn',
			'type': 'button',
			'eventName': 'click',
			'func': function directConnectEasyCT(clickEvent) {
				// console.log('in direct_connect_ct_btn clk handler',clickEvent.data, clickEvent.currentTarget.innerText);
				var txt = clickEvent.currentTarget.innerText;
				self.pageElements.connection_type_input.ref.val(txt);

			}
		},
		{
			'id': '.identifier-dropdown .menuOption',
			'name': 'direct_connect_id_btn',
			'type': 'button',
			'eventName': 'click',
			'func': function directConnectEasyID(clickEvent) {
				// console.log('in direct_connect_id_btn clk handler',clickEvent.data, clickEvent.currentTarget.innerText);
				var txt = clickEvent.currentTarget.innerText;
				self.pageElements.identifier_input.ref.val(txt);

			}
		},
		{
			'id': '.advanced-scan-options-toggle',
			'name': 'advanced_scan_options_toggle',
			'type': 'button',
			'eventName': 'click',
			'func': function advScanOptionsToggle(clickEvent) {
				// console.log('in advanced_scan_options_toggle clk handler',clickEvent.data, clickEvent);

				var classNames = clickEvent.currentTarget.className.split(' ');
				var isPlus = classNames.indexOf('icon-plus') >= 0;
				var isExpanded = false;
				if(isPlus) {
					// We need to show the elements...
					self.pageElements.advanced_scan_options_toggle.ref.removeClass('icon-plus');
					self.pageElements.advanced_scan_options_toggle.ref.addClass('icon-minus');
					self.pageElements.advanced_scan_options.slideDown();
					isExpanded = true;
				} else {
					// We need to hide the elements...
					self.pageElements.advanced_scan_options_toggle.ref.removeClass('icon-minus');
					self.pageElements.advanced_scan_options_toggle.ref.addClass('icon-plus');
					self.pageElements.advanced_scan_options.slideUp();
					isExpanded = false;
				}
				clickEvent.data.isExpanded = isExpanded;
				self.emit(
					self.eventList.TOGGLE_ADVANCED_SCAN_OPTIONS,
					clickEvent.data
				);
			}
		},
		{
			'id': '.direct-connect-options-toggle',
			'name': 'direct_connect_options_toggle',
			'type': 'button',
			'eventName': 'click',
			'func': function advScanOptionsToggle(clickEvent) {
				// console.log('in direct_connect_options_toggle clk handler',clickEvent.data, clickEvent);

				var classNames = clickEvent.currentTarget.className.split(' ');
				var isPlus = classNames.indexOf('icon-plus') >= 0;
				var isExpanded = false;
				if(isPlus) {
					// We need to show the elements...
					self.pageElements.direct_connect_options_toggle.ref.removeClass('icon-plus');
					self.pageElements.direct_connect_options_toggle.ref.addClass('icon-minus');
					self.pageElements.direct_connect_options_page_data.slideDown();
					isExpanded = true;
				} else {
					// We need to hide the elements...
					self.pageElements.direct_connect_options_toggle.ref.removeClass('icon-minus');
					self.pageElements.direct_connect_options_toggle.ref.addClass('icon-plus');
					self.pageElements.direct_connect_options_page_data.slideUp();
					isExpanded = false;
				}
				clickEvent.data.isExpanded = isExpanded;
				self.emit(
					self.eventList.TOGGLE_DIRECT_CONNECT_OPTIONS,
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
	var getSetTextElement = function(ele) {
		var setTextElement = function(data) {
			var defered = q.defer();
			ele.text(data.toString());
			defered.resolve();
			return defered.promise;
		};
		return setTextElement;
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
		self.scanningForDevicesTemplate = handlebars.compile(
			moduleData.htmlFiles.scanning_for_devices
		);
		self.directOpeningDeviceTemplate = handlebars.compile(
			moduleData.htmlFiles.direct_opening_device
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
	this.displayConnectingToDevice = function(openParams) {
		var renderedData = self.directOpeningDeviceTemplate(openParams);
		function hideElements() {
			return q.all([
				elements.device_scan_results.slideUp(),
				elements.attempt_direct_connect_btn.slideUp(),
				elements.refresh_devices_button.slideUp(),
			]);
		}
		return elements.device_scan_status.fill(renderedData)
		.then(hideElements)
		.then(elements.device_scan_status.slideDown);
	};
	// this.displayDirectConnectionResults = function(renderedData) {
	// 	return elements.device_scan_results.fill(renderedData)
	// 	.then(elements.device_scan_status.slideUp)
	// 	.then(elements.device_scan_results.slideDown);
	// };

	this.displayScanInProgress = function() {
		var renderedData = self.scanningForDevicesTemplate();
		function hideElements() {
			return q.all([
				elements.device_scan_results.slideUp(),
				elements.attempt_direct_connect_btn.slideUp(),
				elements.refresh_devices_button.slideUp(),
			]);
		}
		return elements.device_scan_status.fill(renderedData)
		.then(hideElements)
		.then(elements.device_scan_status.slideDown);
	};
	this.displayScanResultsPageData = function(renderedData) {
		function showElements() {
			return q.all([
				elements.device_scan_results.slideDown(),
				elements.attempt_direct_connect_btn.slideDown(),
				elements.refresh_devices_button.slideDown(),
			]);
		}
		return elements.device_scan_results.fill(renderedData)
		.then(elements.device_scan_status.slideUp)
		.then(showElements);
	};

	var handleOnConnectResult = function(results) {
		var defered = q.defer();

		var data;
		var key;
		var elements;

		var onConnectResult = results[0];
		if(onConnectResult.state === "rejected") {
			// Device opened successfully.
			if(self.debug || true) {
				console.log('Open Error', onConnectResult.reason);
			}
			data = onConnectResult.reason;
			key = getDeviceControlKey(data.device);
			elements = self.deviceControlElements[key];

			// Slide up the scroller
			

			// Re-attach connect button listeners
			attachConnectListeners(data.device);
			// elements.connectButtonsHolder.slideDown()

			elements.connectingToDeviceHolder.slideUp()
			.then(elements.connectButtonsHolder.slideDown)
			.then(function() {
				self.emit(self.eventList.DEVICE_FAILED_TO_OPEN, data);
				defered.resolve(results);
			});
		} else {
			// Device opened successfully.
			if(self.debug || true) {
				console.log('Open Success', onConnectResult.value);
			}
			data = onConnectResult.value;
			key = getDeviceControlKey(data.device);
			elements = self.deviceControlElements[key];

			// Attach to disconnect button listener
			attachDisconnectListener(data.device);
			// elements.disconnectButtonHolder.slideDown()

			elements.connectingToDeviceHolder.slideUp()
			.then(elements.disconnectButtonHolder.slideDown)
			.then(function() {
				self.emit(self.eventList.DEVICE_OPENED, data);
				defered.resolve(results);
			});
		}
		return defered.promise;
	};

	var enableModuleSwitching = function() {
		var defered = q.defer();
		
		// Enable module-switching
		MODULE_CHROME.enableModuleLoading();

		defered.resolve();
		return defered.promise;
	};
	var openDeviceListener = function(eventData) {
		if(self.debug || true) {
			console.log('Open button clicked', eventData.data);
		}
		// Remove remaining open button listners
		removeConnectListeners(eventData.data.device);

		// Disable module-switching
		MODULE_CHROME.disableModuleLoading('Please wait for device connection to finish.');

		// Get the device control key.
		var key = getDeviceControlKey(eventData.data.device);

		// Build a list of things that need to happen.
		var promises = [];
		console.log('Connect Data...', eventData.data);

		// Pre-emptively set the active connection type
		self.deviceControlElements[key].activeCTIndicator.setText(eventData.data.connectionType.connectionTypeName);


		promises.push(self.onConnect(eventData.data)); // Connect to the device

		// Slide up the connectButtonsHolder (hide it)
		promises.push(
			self.deviceControlElements[key].connectButtonsHolder.slideUp()
		);

		// Slide down the connectingToDeviceHolder (indeterminate ring).
		promises.push(
			self.deviceControlElements[key].connectingToDeviceHolder.slideDown()
		);
		
		// Wait for both tasks to finish
		q.allSettled(promises)
		.then(handleOnConnectResult)
		.then(enableModuleSwitching);
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
	var createConnectingToDeviceHolderSelector = function(device) {
		var selector = '';
		var dt = device.deviceTypeName.toString();
		dt = '.DEVICE_TYPE_' + dt;
		var sn = device.serialNumber.toString();
		sn = '.SERIAL_NUMBER_' + sn;
		var ctHolder = '.connecting_to_device_circle';

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
	var createActiveCTIndicatorSelector = function(device) {
		var selector = '';
		var dt = device.deviceTypeName.toString();
		dt = '.DEVICE_TYPE_' + dt;
		var sn = device.serialNumber.toString();
		sn = '.SERIAL_NUMBER_' + sn;
		var ctHolder = '#active_connection_type';

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

				// Element reference to the connect buttons holder.
				var cbhSelector = createConnectionButtonsHolderSelector(device);
				var cbhEle = $(cbhSelector);

				// Element reference to the indeterminite ring holder.
				var ctdSelector = createConnectingToDeviceHolderSelector(device);
				var ctdEle = $(ctdSelector);

				var activeCTIndicator = createActiveCTIndicatorSelector(device);
				var actIndEle = $(activeCTIndicator);
				// Create other element references.
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
					'connectingToDeviceHolder': {
						'id': ctdSelector,
						'ele': ctdEle,
						'slideUp': getSlideUpElement(ctdEle),
						'slideDown': getSlideDownElement(ctdEle),
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
					'activeCTIndicator': {
						'id': activeCTIndicator,
						'ele': actIndEle,
						'setText': getSetTextElement(actIndEle),
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

	/*
	 * Merge the scanErrors with the scanResults so that they
	 * both get displayed via the found_devices.html template.
	 */
	function mergeScanResultsAndErrors (scanResults, scanErrors) {
		if(typeof(scanErrors) === 'undefined') {
			return scanResults;
		}
		scanErrors.forEach(function(scanError) {
			var dt = scanError.dt;

			// Find the scan result that corresponds to the correct
			// device type for the scan error.
			var selectedScanResult = undefined;
			var isFound = scanResults.some(function(scanResult) {
				if(scanResult.deviceType == dt) {
					selectedScanResult = scanResult;
					return true;
				} else {
					return false;
				}
			});

			var errorResult = {};
			Object.keys(scanError).forEach(function(key) {
				errorResult[key] = scanError[key];
			});
			errorResult.productType = scanError.dtName;
			errorResult.modelType = scanError.dtName;
			var errorInfo = modbus_map.getErrorInfo(errorResult.errorCode);
			errorResult.errorName = errorInfo.string;
			errorResult.errorMessage += '. ' + errorInfo.description;
			errorResult.ctMediumInt = driver_const.CONNECTION_MEDIUM[errorResult.ct];
			errorResult.ctMedium = driver_const.CONNECTION_TYPE_NAMES[errorResult.ctMediumInt];

			console.log('IsFound', isFound, selectedScanResult, errorResult);

			// If the scan result exists then add the scan error info.
			// If the scan result doesn't exist based on the device type
			// then create a new scan result.
			if(isFound) {
				selectedScanResult.devices.push(errorResult);
			} else {
				scanResults.push({
					'deviceType': errorResult.dt,
					'deviceTypeName': errorResult.dtName,
					'deviceTypeString': errorResult.dtString,
					'devices': [errorResult]
				});
			}
		});
		return scanResults;
	}

	var innerDisplayScanResults = function(scanResults) {

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
			defered.resolve([]);
		}
		return defered.promise;
	};

	var textTemplate = "There were errors collecting data from devices. {{#each devErrors}}{{dt}}: {{#each ctErrors}}{{num}}x{{ct}}{{/each}}{{/each}}";
	var compiledTextTemplate = handlebars.compile(textTemplate);
	innerDisplayScanResultErrors = function(bundle) {
		var defered = q.defer();
		try {
			var errors = self.scanErrorsCache;
			if(errors) {
				if(errors.length > 0) {
					/* Format a string that looks like:
					There were errors collecting data from devices: 1xUSB, 1xEthernet, 1xWiFi.
					*/
					var errorsByDev = {};
					var errorsByCT = {};
					errors.forEach(function(error) {
						var dt = error.dtName;
						if(typeof(errorsByDev[dt]) === 'undefined') {
							errorsByDev[dt] = {
								'dt': dt,
								'ctErrors': {},
							};
						}
						var ct = error.ct;
						var ctMedium = driver_const.CONNECTION_MEDIUM[ct];
						var ctName = driver_const.CONNECTION_TYPE_NAMES[ctMedium];
						if(typeof(errorsByDev[dt].ctErrors[ctName]) === 'undefined') {
							errorsByDev[dt].ctErrors[ctName] = {
								'num': 1,
								'ct': ctName,
							};
						} else {
							errorsByDev[dt].ctErrors[ctName].num += 1;
						}
					});

					var dispErrors = [];
					var devKeys = Object.keys(errorsByDev);
					devKeys.forEach(function(devKey) {
						var devErrs = errorsByDev[devKey];
						var devErrsObj = {
							'dt': devErrs.dt,
							'ctErrors': [],
						};
						var ctErrors = devErrs.ctErrors;
						var ctKeys = Object.keys(ctErrors);
						ctKeys.forEach(function(ctKey) {
							devErrsObj.ctErrors.push(ctErrors[ctKey]);
						});
						dispErrors.push(devErrsObj);
					});
					var str = compiledTextTemplate({
						'devErrors': dispErrors,
					});
					showAlert(str);
				}
			}
		} catch(err) {
			// do nothing...
			console.error('Error showing alert', err);
		}
		defered.resolve(bundle);
		return defered.promise;
	}
	this.displayScanResults = function(scanResults, scanErrors) {
		// if(typeof(scanResults.forEach) === 'undefined') {
		// 	scanResults = [];
		// }
		// if(typeof(scanErrors.forEach) === 'undefined') {
		// 	scanErrors = [];
		// }

		self.scanResultsCache = scanResults;
		self.scanErrorsCache = scanErrors;

		var mergedResults;
		try {
			mergedResults = mergeScanResultsAndErrors(scanResults, scanErrors);
		} catch(err) {
			console.log('Error merging results', err);
		}
		console.log('Merged Results', mergedResults);
		console.log('Scan Results', scanResults);

		return self.appendPageLogicToScanResults(
			scanResults,
			self.wifiImageTemplate
		)
		.then(innerDisplayScanResults)
		// .then(innerDisplayScanResultErrors)
		.then(self.cacheDeviceControlElements);
	};

	this.test = function() {
		self.displayScanResultsPageData('<p>Scan Finished!</p>');
	};
	// var self = this;
};
util.inherits(createDeviceSelectorViewGenerator, EventEmitter);

