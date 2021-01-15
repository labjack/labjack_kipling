
/* jshint undef: true, unused: false, undef: true */
/* global global, require, $, console, MODULE_CHROME */

// console.log('in device_selector view_generator.js');

const EventEmitter = require('events').EventEmitter;
const util = require('util');
const handlebars = require('handlebars');
const path = require('path');

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
			return new Promise(resolve => {
				ele.slideUp(self.slideDuration, resolve);
			});
		};
		return slideUp;
	};
	var getSlideDownElement = function(ele) {
		var slideDown = function() {
			return new Promise(resolve => {
				ele.slideDown(self.slideDuration, resolve);
			});
		};
		return slideDown;
	};
	var getEmptyElement = function(ele) {
		var emptyElement = function() {
			ele.empty();
			return Promise.resolve();
		};
		return emptyElement;
	};
	var getFillElement = function(ele) {
		var fillElement = function(data) {
			return new Promise(resolve => {
				ele.empty();
				ele.ready(function () {
					resolve(data);
				});
				ele.append($(data));
			});
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
		self.isFileListingDisplayed = true;
		self.emit(self.eventList.FILE_LISTING_DISPLAYED, {
			isFileListingDisplayed: self.isFileListingDisplayed,
		});
		return Promise.resolve();
	}
	function innerDeclareFileListingHidden() {
		self.isFileListingDisplayed = false;
		self.emit(self.eventList.FILE_LISTING_HIDDEN, {
			isFileListingDisplayed: self.isFileListingDisplayed,
		});
		return Promise.resolve();
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

		return Promise.allSettled(promises)

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
		return Promise.allSettled(promises);
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

	this.test = function() {
		self.displayScanResultsPageData('<p>Scan Finished!</p>');
	};
	// var self = this;
};
util.inherits(createFileBrowserViewGenerator, EventEmitter);

