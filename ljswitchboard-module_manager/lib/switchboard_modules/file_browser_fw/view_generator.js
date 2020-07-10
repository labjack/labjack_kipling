
/* jshint undef: true, unused: false, undef: true */
/* global global, require, $, console, MODULE_CHROME */

// console.log('in device_selector view_generator.js');

var package_loader;
var q;
var gns;
var static_files;
try {
	package_loader = global.require.main.require('@labjack/ljswitchboard-package_loader');
	q = global.require.main.require('q');
	gns = package_loader.getNameSpace();
	static_files = global.require('@labjack/ljswitchboard-static_files');
} catch(err) {
	package_loader = require.main.require('@labjack/ljswitchboard-package_loader');
	q = require.main.require('q');
	gns = package_loader.getNameSpace();
	static_files = require('@labjack/ljswitchboard-static_files');
}

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var handlebars = require('handlebars');
var path = require('path');


var createFileBrowserViewGenerator = function() {
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

	this.templates = {};
	this.saveTemplates = function(templates) {
		self.templates = templates;
	};
	this.context = undefined;
	this.saveInitialContext = function(context) {
		self.context = context;
	};
	this.getDownloadControlsRaw = function(context) {
		var data = {
			'outputDirectory': 'C:/Users/Chris/Documents',
		};
		return self.templates.download_controls_template(data);
	};
	this.getBrowserControlsRaw = function(context) {
		var cwd = context.getCWD.cwd;
		cwd = 'root' + cwd;
		var pathSep = path.posix.sep;
		var cwdPartials = cwd.split(pathSep).filter(function(partial) {
			if(partial !== '') {
				return true;
			} else {
				return false;
			}
		});
		var extendedPartials = cwdPartials.map(function(partial, i) {
			var data = {
				'folder': partial,
				'active': false,
			};
			if(i == cwdPartials.length - 1) {
				data.active = true;
			}
			return data;
		});


		var data = {
			'cwd': cwd,
			'cwdPartials': cwdPartials,
			'extendedPartials': extendedPartials,
		};
		return self.templates.browser_controls_template(data);
	};
	this.getFileBrowserRaw = function(context) {
		var data = {
			'cwd': context.readdir.cwd,
			'fileNames': context.readdir.fileNames,
			'files': context.readdir.files,
		};
		return self.templates.file_browser_template(data);
	};

	this.eventList = {
		// File Navigation Events
		FILE_SELECTED: 'FILE_SELECTED',
		FILE_SINGLE_CLICKED: 'FILE_SINGLE_CLICKED',
		FILE_DOUBLE_CLICKED: 'FILE_DOUBLE_CLICKED',

		// Button Events
		DOWNLOAD_SELECTED_FILES: 'DOWNLOAD_SELECTED_FILES',
		NAVIGATE_BACK_DIR_BUTTON: 'NAVIGATE_BACK_DIR_BUTTON',
		OPEN_DOWNLOAD_TO_DIRECTORY: 'OPEN_DOWNLOAD_TO_DIRECTORY',
		EDIT_DOWNLOAD_TO_DIRECTORY: 'EDIT_DOWNLOAD_TO_DIRECTORY',
		REFRESH_FILE_LISTING: 'REFRESH_FILE_LISTING',

		// File listing Events
		FILE_LISTING_DISPLAYED: 'FILE_LISTING_DISPLAYED',
		FILE_LISTING_HIDDEN: 'FILE_LISTING_HIDDEN',
	};

	var pageControlElementsList = [
		// Table element that displays the files in the CWD.
		{'id': '#file_listing_table', 'name': 'file_listing_table'},
		// Element that indicates that the file listing is being queried.
		{'id': '#file_listing_refreshing', 'name': 'file_listing_refreshing'},
		// Text span element displaying where files will be downloaded to.
		{'id': '#download_to_dir', 'name': 'download_to_dir'},
		// Text butotn that opens the download-to directory.
		{
			'id': '#download_selected_files_button',
			'name': 'download_selected_files_button',
			'type': 'button',
			'eventName': 'click',
			'func': function(clickEvent) {
				self.emit(
					self.eventList.DOWNLOAD_SELECTED_FILES,
					clickEvent.data
				);
			}
		},
		// Text bar that displays the devices cwd.
		{'id': '#device_cwd', 'name': 'device_cwd'},
		
		// Button that initiates the downloading of the selected files.
		{
			'id': '#download_selected_files_button',
			'name': 'download_selected_files_button',
			'type': 'button',
			'eventName': 'click',
			'func': function(clickEvent) {
				self.emit(
					self.eventList.DOWNLOAD_SELECTED_FILES,
					clickEvent.data
				);
			}
		},

		// Button that navigates the user back a directory.
		{
			'id': '#navigate_back_dir_button',
			'name': 'navigate_back_dir_button',
			'type': 'button',
			'eventName': 'click',
			'func': function(clickEvent) {
				self.emit(
					self.eventList.NAVIGATE_BACK_DIR_BUTTON,
					clickEvent.data
				);
			}
		},

		// Button that refreshes the files currently displayed.
		{
			'id': '#refresh_file_listing_button',
			'name': 'refresh_file_listing_button',
			'type': 'button',
			'eventName': 'click',
			'func': function(clickEvent) {
				self.emit(
					self.eventList.REFRESH_FILE_LISTING,
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
			return defered.promise;
		};
		return fillElement;
	};

	// Start defining externally accessable object initialization functions.
	// This function should be called after the page has been loaded and
	// initializes various page element listeners and basic DOM manipulation
	// functions.
	this.cachePageControlElements = function(moduleData) {
		self.moduleData = moduleData;
		var modulePath = moduleData.path;
		
		// Initialize various properties and compile templates.
		self.fileImageTemplate = handlebars.compile(
			moduleData.htmlFiles.file_image
		);

		self.fileBrowserTemplate = handlebars.compile(
			moduleData.htmlFiles.file_browser_template
		);

		self.fileBrowserTableTemplate = handlebars.compile(
			moduleData.htmlFiles.file_browser_table_template
		);

		self.fileBrowserTableRowTemplate = handlebars.compile(
			moduleData.htmlFiles.file_browser_table_row_template
		);

		self.cwdTemplate = handlebars.compile(
			moduleData.htmlFiles.cwdTemplate
		);


		// Attach page listeners to page control elements.
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

	// This function.... not really needed??
	this.saveDeviceControlFunctions = function(onConnect, onDisconnect) {
		self.onConnect = onConnect;
		self.onDisconnect = onDisconnect;
	};

	this.isFileListingDisplayed = false;
	function innerDeclareFileListingDisplayed() {
		var defered = q.defer();
		self.isFileListingDisplayed = true;
		self.emit(self.eventList.FILE_LISTING_DISPLAYED, {
			isFileListingDisplayed: self.isFileListingDisplayed,
		});
		defered.resolve();
		return defered.promise;
	}
	function innerDeclareFileListingHidden() {
		var defered = q.defer();
		self.isFileListingDisplayed = false;
		self.emit(self.eventList.FILE_LISTING_HIDDEN, {
			isFileListingDisplayed: self.isFileListingDisplayed,
		});
		defered.resolve();
		return defered.promise;
	}
	// Start defining externally accessable page control methods.
	// Function for displaying that file listing data is being queried aka
	// hiding the file listing data table.
	this.hideFileListingData = function() {
		var promises = [];

		// Hide the refresh, back, and download buttons.
		// promises.push(elements.download_selected_files_button.slideUp());
		// promises.push(elements.navigate_back_dir_button.slideUp());
		// promises.push(elements.refresh_file_listing_button.slideUp());

		// Hide the file listing table
		promises.push(elements.file_listing_table.slideUp());

		return q.allSettled(promises)

		// Show the file listing refreshing loader
		.then(elements.file_listing_refreshing.slideDown)
		.then(innerDeclareFileListingHidden);
	};

	function innerDisplayFileListingElements() {
		var promises = [];

		// Show the refresh, back, and download buttons.
		// promises.push(elements.download_selected_files_button.slideUp());
		// promises.push(elements.navigate_back_dir_button.slideUp());
		// promises.push(elements.refresh_file_listing_button.slideUp());
		// Show the file listing table.
		promises.push(elements.file_listing_table.slideDown());
		return q.allSettled(promises);
	}
	
	// An example snippit of data to be rendered and displayed.
	var testFileListingData = {
		cwd: '/',
		fileNames: [ 'log1.csv', 'JP2 period 2.txt' ],
		files:[{ 
				name: 'log1.csv', ext: '.csv', img: 'csv',
			path: '/log1.csv', pathInfo: {}, isDirectory: false,
			isFile: true, size: 299, sizeStr: '299 B'
		}, {
			name: 'JP2 period 2.txt', ext: '.txt', img: 'txt',
			path: '/JP2 period 2.txt', pathInfo: {}, isDirectory: false,
			isFile: true, size: 4587, sizeStr: '4.587 KB'
		}, {
			name: 'Test Folder A', ext: '', img: 'folder',
			path: '/Test Folder A', pathInfo: {}, isDirectory: true,
			isFile: false, size: 0, sizeStr: '0 B'
		}, {
			name: 'Test Warning', ext: '', img: 'warning',
			path: '/', pathInfo: {}, isDirectory: false,
			isFile: false, size: 0, sizeStr: '0 B'
		}, {
			name: 'Test Error', ext: '', img: 'error',
			path: '/', pathInfo: {}, isDirectory: false,
			isFile: false, size: 0, sizeStr: '0 B'
		}]
	};
	// A few run-time testing functions that display the test data.
	this.testCallDisplayFileListingData = function() {
		return self.displayFileListingData(testFileListingData);
	};
	this.testCallFullDisplayFileListingData = function() {
		return self.hideFileListingData()
		.then(function() {
			return self.displayCWD(testFileListingData.cwd);
		})
		.then(self.testCallDisplayFileListingData);
	};

	// Function for displaying file listing data table.
	this.displayFileListingData = function(fileListingData) {
		var files = fileListingData.files;
		var displayData = {
			files: [],
		};

		// Compile information for each row of the table.
		files.forEach(function(file) {
			displayData.files.push({
				'name': file.name,
				'ext': file.ext,
				'img': file.img,
				'size': file.size,
				'sizeStr': file.sizeStr,
				'data': self.fileBrowserTableRowTemplate(file),
			});
		});

		// Compile the entire table.
		var compiledData = self.fileBrowserTableTemplate(displayData);

		// Display the compiled table
		return elements.file_listing_table.fill(compiledData)
		.then(elements.file_listing_refreshing.slideUp)
		.then(innerDisplayFileListingElements)
		.then(innerDeclareFileListingDisplayed);
	};

	// Function for displaying the device's CWD
	this.displayCWD = function(cwdData) {
		var renderedData = self.cwdTemplate(cwdData);
		return elements.device_cwd.fill(renderedData);
	};

	// Function for displaying the location where files will be downloaded to.
	this.displayDownloadFileToDir = function(renderedData) {
		return elements.download_to_dir.fill(renderedData);
	};
	
	// TODO: Stubbed out function for getting the list of selected files.
	this.getSelectedFiles = function() {
		return [];
	};

	// var enableModuleSwitching = function() {
	// 	var defered = q.defer();
		
	// 	// Enable module-switching
	// 	MODULE_CHROME.enableModuleLoading();

	// 	defered.resolve();
	// 	return defered.promise;
	// };

	// var attachClickListener = function(ele, device, connectionType) {
	// 	var clickData = {
	// 		'device': device,
	// 		'connectionType': connectionType,
	// 	};
	// 	ele.one('click', clickData, openDeviceListener);
	// 	/*
	// 	ele.attr('disabled',true); // Disables the button

	// 	// a jquery trick of:
	// 	$( "#foo" ).on( "click", function( event ) {
	// 		alert( "This will be displayed only once." );
	// 		$( this ).off( event );
	// 	});
	// 	may be useful.
	// 	api.jquery.com/one/
	// 	*/
	// };

	// var attachConnectListeners = function(device) {
	// 	var key = getDeviceControlKey(device);
	// 	device.connectionTypes.forEach(function(connectionType) {
	// 		var ctKey = connectionType.name;
	// 		attachClickListener(
	// 			self.deviceControlElements[key][ctKey].ele,
	// 			device,
	// 			connectionType
	// 		);
	// 	});
	// };
	// var removeConnectListeners = function(device) {
	// 	var key = getDeviceControlKey(device);
	// 	device.connectionTypes.forEach(function(connectionType) {
	// 		var ctKey = connectionType.name;
	// 		self.deviceControlElements[key][ctKey].ele.off('click');
	// 	});
	// };
	// var attachDisconnectListener = function(device) {
	// 	if(self.debug) {
	// 		console.log('Attaching disconnect listener');
	// 	}
	// 	var key = getDeviceControlKey(device);
	// 	var element = self.deviceControlElements[key].disconnectButton.ele;
	// 	element.one('click', {'device': device}, closeDeviceListener);
	// };
	// var removeDisconnectListener = function(device) {
	// 	var key = getDeviceControlKey(device);
	// 	var element = self.deviceControlElements[key].disconnectButton.ele;
	// 	element.off('click');
	// };

	// var createConnectButtonSelector = function(device, connectionType) {
	// 	var selector = '';
	// 	var dt = device.deviceTypeName.toString();
	// 	dt = '.DEVICE_TYPE_' + dt;
	// 	var sn = device.serialNumber.toString();
	// 	sn = '.SERIAL_NUMBER_' + sn;
	// 	var ct = connectionType.name.toString();
	// 	ct = '.CONNECTION_TYPE_' + ct;

	// 	selector = dt + ' ' + sn + ' ' + ct;
	// 	return selector;
	// };
	// var createConnectionButtonsHolderSelector = function(device) {
	// 	var selector = '';
	// 	var dt = device.deviceTypeName.toString();
	// 	dt = '.DEVICE_TYPE_' + dt;
	// 	var sn = device.serialNumber.toString();
	// 	sn = '.SERIAL_NUMBER_' + sn;
	// 	var ctHolder = '.connect_buttons_class';

	// 	selector = dt + ' ' + sn + ' ' + ctHolder;
	// 	return selector;
	// };
	// var createDisconnectButtonSelector = function(device) {
	// 	var selector = '';
	// 	var dt = device.deviceTypeName.toString();
	// 	dt = '.DEVICE_TYPE_' + dt;
	// 	var sn = device.serialNumber.toString();
	// 	sn = '.SERIAL_NUMBER_' + sn;
	// 	var ctHolder = '.disconnect-button';

	// 	selector = dt + ' ' + sn + ' ' + ctHolder;
	// 	return selector;
	// };
	// var createDisconnectButtonHolderSelector = function(device) {
	// 	var selector = '';
	// 	var dt = device.deviceTypeName.toString();
	// 	dt = '.DEVICE_TYPE_' + dt;
	// 	var sn = device.serialNumber.toString();
	// 	sn = '.SERIAL_NUMBER_' + sn;
	// 	var ctHolder = '.disconnect_buttons_class';

	// 	selector = dt + ' ' + sn + ' ' + ctHolder;
	// 	return selector;
	// };
	// var getDeviceControlKey = function(device) {
	// 	var dt = device.deviceTypeName.toString();
	// 	var sn = device.serialNumber.toString();
	// 	return [dt,sn].join('_');
	// };
	// this.cacheDeviceControlElements = function(scanResults) {
	// 	var defered = q.defer();
	// 	// Clear previous elements cache TODO: Disconnect from listeners
	// 	self.deviceControlElements = {};

	// 	if(self.debug) {
	// 		console.log('Caching Device Control Elements');
	// 	}
	// 	// console.log('numDeviceTypes', scanResults.length);
	// 	scanResults.forEach(function(deviceType) {
	// 		// console.log('Data:', Object.keys(deviceType));
	// 		deviceType.devices.forEach(function(device) {
	// 			// console.log('Device Data', device);
	// 			var key = getDeviceControlKey(device);
	// 			self.deviceControlElements[key] = {};

	// 			var cbhSelector = createConnectionButtonsHolderSelector(device);
	// 			var cbhEle = $(cbhSelector);
	// 			var dbhSelector = createDisconnectButtonHolderSelector(device);
	// 			var dbhEle = $(dbhSelector);
	// 			var dbSelector = createDisconnectButtonSelector(device);
	// 			var dbEle = $(dbSelector);

	// 			self.deviceControlElements[key] = {
	// 				'connectButtonsHolder': {
	// 					'id': cbhSelector,
	// 					'ele': cbhEle,
	// 					'slideUp': getSlideUpElement(cbhEle),
	// 					'slideDown': getSlideDownElement(cbhEle),
	// 				},
	// 				'disconnectButtonHolder': {
	// 					'id': dbhSelector,
	// 					'ele': dbhEle,
	// 					'slideUp': getSlideUpElement(dbhEle),
	// 					'slideDown': getSlideDownElement(dbhEle),
	// 				},
	// 				'disconnectButton': {
	// 					'id': dbSelector,
	// 					'ele': dbEle,
	// 					'slideUp': getSlideUpElement(dbEle),
	// 					'slideDown': getSlideDownElement(dbEle),
	// 				},
	// 			};

	// 			// Establish connection type listeners
	// 			device.connectionTypes.forEach(function(connectionType) {
	// 				var selector = createConnectButtonSelector(
	// 					device,
	// 					connectionType
	// 				);
	// 				var ctKey = connectionType.name;
	// 				var ele = $(selector);
	// 				self.deviceControlElements[key][ctKey] = {
	// 					'id': selector,
	// 					'ele': ele
	// 				};
	// 			});
				
	// 			if(!device.isActive) {
	// 				// Attach connect button listeners
	// 				attachConnectListeners(device);
	// 			} else {
	// 				// Attach disconnect button listeners
	// 				attachDisconnectListener(device);
	// 			}
	// 		});
	// 	});
	// 	defered.resolve(scanResults);
	// 	return defered.promise;
	// };

	
	// var innerDisplayScanResults = function(scanResults) {

	// 	var defered = q.defer();
	// 	var data = '';
	// 	try {
	// 		if(scanResults.length === 0) {
	// 			if(self.moduleData.htmlFiles.no_devices_found) {
	// 				data = self.moduleData.htmlFiles.no_devices_found;
	// 			}
	// 			self.displayScanResultsPageData(data);
	// 			defered.resolve(scanResults);
	// 		} else {
	// 			if(self.debug) {
	// 				console.log('Displaying Data', scanResults.length);
	// 			}
	// 			// Display Data
	// 			data += '<p>Found ';
	// 			data += scanResults.length.toString();
	// 			data += ' devices</p>';
	// 			if(self.deviceListingTemplate) {
	// 				data = self.deviceListingTemplate({
	// 					'device_types': scanResults,
	// 					'staticFiles': static_files.getDir(),
	// 				});
	// 			}
	// 			self.displayScanResultsPageData(data)
	// 			.then(function() {
	// 				defered.resolve(scanResults);
	// 			});
	// 		}
	// 	} catch(err) {
	// 		data = '';
	// 		data += '<p>Error Displaying Scan Results: ';
	// 		data += JSON.stringify(err);
	// 		data += '</p>';
	// 		console.error('error displaying scan results');
	// 		self.displayScanResultsPageData(data);
	// 		defered.resolve([]);
	// 	}
	// 	return defered.promise;
	// };
	// this.displayScanResults = function(scanResults) {
	// 	self.scanResultsCache = scanResults;
	// 	return self.appendPageLogicToScanResults(
	// 		scanResults,
	// 		self.wifiImageTemplate
	// 	)
	// 	.then(innerDisplayScanResults)
	// 	.then(self.cacheDeviceControlElements);
	// };

	this.test = function() {
		self.displayScanResultsPageData('<p>Scan Finished!</p>');
	};
	// var self = this;
};
util.inherits(createFileBrowserViewGenerator, EventEmitter);

