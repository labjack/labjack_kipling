

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');
var q = global.require('q');
var handlebars = global.require('handlebars');
var module_manager = require('ljswitchboard-module_manager');
var fs = require('fs');
var package_loader = require('ljswitchboard-package_loader');
var gns = package_loader.getNameSpace();
var static_files = require('ljswitchboard-static_files');
var io_manager = require('ljswitchboard-io_manager');
var modbus_map = require('ljswitchboard-modbus_map').getConstants();

// Configure the module_manager persistent data path.
var kiplingExtractionPath = package_loader.getExtractionPath();
var moduleDataPath = path.normalize(path.join(
	kiplingExtractionPath,
	'module_data'
));
module_manager.configurePersistentDataPath(moduleDataPath);
module_manager.disableLinting();


function createModuleLoader() {
	this.stats = {
		'numLoaded': 0
	};
	var eventList = {
		VIEW_READY: 'VIEW_READY',
		UNLOAD_MODULE: 'UNLOAD_MODULE',
		MODULE_READY: 'MODULE_READY',
	};
	this.eventList = eventList;

	var MODULE_LOADER_CSS_DESTINATION_ID = 'module-chrome-loaded-module-css';
	var MODULE_LOADER_JS_DESTINATION_ID = 'module-chrome-loaded-module-js';
	var MODULE_LOADER_VIEW_DESTINATION_ID = 'module-chrome-loaded-module-view';
	var MODULE_LOADER_VIEW_TEMPLATE_ARRAY = [
		'<div id="module-chrome-current-module-{{numLoaded}}">',
		'{{{viewData}}}',
		'</div>'
	];
	var MODULE_LOADER_VIEW_TEMPLATE = handlebars.compile(
		MODULE_LOADER_VIEW_TEMPLATE_ARRAY.join('')
	);
	var MODULE_LOADER_VIEW_ID_TEMPLATE = handlebars.compile([
		'#module-chrome-current-module-{{numLoaded}}'
	].join(''));

	var clearCurrentModule = function(newModule) {
		var defered = q.defer();

		// Remove any current listeners from the VIEW_READY and UNLOAD_MODULE
		// events.  They should only be listened to by the currently loaded
		// module.
		self.removeAllListeners(eventList.VIEW_READY);
		self.removeAllListeners(eventList.UNLOAD_MODULE);

		// Clear the DOM elements
		var locationKeys = Object.keys(newModule.outputLocation);
		locationKeys.forEach(function(locationKey) {
			newModule.outputLocation[locationKey].empty();
		});
		defered.resolve(newModule);
		return defered.promise;
		// location.append($(compiledData));
	};
	var getCreatePageElement = function(newModule) {
		var createPageElement = function(newFile) {
			var defered = q.defer();
			var results = {
				'name': newFile.fileName,
			};
			try {
				var fileType = path.extname(newFile.fileName);
				var newElement;
				if(fileType === '.css') {
					newElement = document.createElement('style');
					newElement.setAttribute('type', 'text/css');

					newElement.onload = function() {
						// console.info('!!! '+fileType+' file loaded', newFile.fileName);
						defered.resolve(results);
					};
					newElement.onerror = function() {
						console.error('Error in file' + fileType);
					};

					// Save the file's data
					results.element = newElement;
					newElement.appendChild(document.createTextNode(newFile.fileData));
					newModule.outputLocation.css.append(newElement);
				} else if(fileType === '.js') {
					newElement = document.createElement('script');
					newElement.setAttribute('type', 'text/javascript');
					// 

					// Isn't working for .js files :( idk why, it worked before.
					// newElement.onload = function() {
					// console.info('!!! '+fileType+' file loaded', newFile.fileName);
					// defered.resolve(results);
					// };
					// newElement.setAttribute('src', newFile.filePath);

					// Save the file's data
					results.element = newElement;
					newElement.appendChild(document.createTextNode(newFile.fileData));
					newModule.outputLocation.js.append(newElement);
					defered.resolve(results);
				} else {
					console.error('Trying to load invalid fileType', fileType);
					defered.resolve(results);
				}
			} catch(err) {
				console.error('Error Loading Element', err);
				console.error(newFile.fileName);
				results.element = undefined;
				defered.resolve(results);
			}
			
			return defered.promise;
		};
		return createPageElement;
	};

	var loadCSSFiles = function(newModule) {
		var defered = q.defer();
		var promises = newModule.css.map(getCreatePageElement(newModule));

		q.allSettled(promises)
		.then(function(results) {
			defered.resolve(newModule);
		}, function(err) {
			console.error('Finished Loading Err', err);
			defered.reject(newModule);
		});
		return defered.promise;
	};
	var loadJSFiles = function(newModule) {
		var defered = q.defer();
		var promises = newModule.js.map(getCreatePageElement(newModule));

		q.allSettled(promises)
		.then(function(results) {
			defered.resolve(newModule);
		}, function(err) {
			console.error('Finished Loading Err', err);
			defered.reject(newModule);
		});
		return defered.promise;
	};
	var precompileFunctions = [];
	this.addPreloadStep = function(func) {
		precompileFunctions.push(func);
	};
	var getModuleContext = function(newModule) {
		var defered = q.defer();
		var promises = [];
		var i;
		for(i = 0; i < precompileFunctions.length; i++) {
			// console.info(
			// 	'Executing precompile function',
			// 	i,
			// 	precompileFunctions.length
			// );
			promises.push(precompileFunctions[i](newModule));
		}
		q.allSettled(promises)
		.then(function(results) {
			// remove precompile functions
			precompileFunctions = [];
			defered.resolve(newModule);
		}, function(err) {
			console.error('Finished pre-compilation steps', err);
			defered.reject(newModule);
		});
		return defered.promise;
	};

	var getUpdatedDeviceListing = function(newModule) {
		var defered = q.defer();
		var io_interface = io_manager.io_interface();
		var device_controller = io_interface.getDeviceController();

		// Filter what devices are displayed
		var filters;
		if(newModule.data.supportedDevices) {
			filters = newModule.data.supportedDevices;
		}
		device_controller.getDeviceListing(filters)
		.then(function(deviceListing) {
			newModule.context.devices = deviceListing;
			defered.resolve(newModule);
		});
		return defered.promise;
	};
	var loadHTMLFiles = function(newModule) {
		var defered = q.defer();
		// console.log('loaded html files', newModule.htmlFiles);
		var htmlFile = '<p>No view.html file loaded.</p>';
		// Check to see if a framework is being loaded:
		if(newModule.data.framework) {
			if(newModule.htmlFiles.framework_view) {
				htmlFile = newModule.htmlFiles.framework_view;
			} else if(newModule.htmlFiles.view) {
				htmlFile = newModule.htmlFiles.view;
			}
		} else {
			if(newModule.htmlFiles.view) {
				htmlFile = newModule.htmlFiles.view;
			}
		}

		// Compile & populate the view.html file
		var template = handlebars.compile(htmlFile);
		var data = template(newModule.context);

		// Append a header & footer onto the template.
		data = MODULE_LOADER_VIEW_TEMPLATE({
			'numLoaded': newModule.context.stats.numLoaded,
			'viewData': data,
		});

		// Add the page data to the dom.
		newModule.outputLocation.view.append(data);

		// Build the elementID string that was assigned to the element when
		// compiling the "MODULE_LOADER_VIEW_TEMPLATE"
		var elementID = MODULE_LOADER_VIEW_ID_TEMPLATE({
			'numLoaded': newModule.context.stats.numLoaded,
		});

		// Attach to the .ready event of the element just created.
		// Element must already be added because we use jquery to search for
		// the element's ID to attach to the "ready" event.
		$(elementID).ready(function() {
			defered.resolve(newModule);
			self.emit(eventList.VIEW_READY, {
				'name': newModule.name,
				'id': elementID,
				'data': newModule,
			});
		});
		return defered.promise;
	};
	var updateStatistics = function(newModule) {
		var defered = q.defer();
		self.stats.numLoaded += 1;
		defered.resolve(newModule);
		return defered.promise;
	};
	var runGC = function(data) {
		var defered = q.defer();
		var gcExecuted = false;
		if(gc) {
			if(gc.call) {
				if(typeof(gc.call) === 'function') {
					gc.call();
					gcExecuted = true;
				}
			}
		}
		if(gcExecuted) {
			// console.log('gc.call executed');
		} else {
			// console.log('gc.call not executed');
		}
		
		defered.resolve(data);
		return defered.promise;
	};

	var renderModule = function(moduleData) {
		var defered = q.defer();
		// Trigger any loaded module to halt its execution
		self.emit(eventList.UNLOAD_MODULE, {
			'data': 'testData...'
		});
		moduleData.loadResults = {
			'overallResult': true,
			'css': [],
			'js': [],
			'html': [],
		};
		moduleData.context = {
			'stats': self.stats,
			'staticFiles': static_files.getDir(),
			'devices': undefined,
		};
		moduleData.outputLocation = {
			'css': $('#' + MODULE_LOADER_CSS_DESTINATION_ID),
			'js': $('#' + MODULE_LOADER_JS_DESTINATION_ID),
			'view': $('#' + MODULE_LOADER_VIEW_DESTINATION_ID),
		};
		// moduleData.outputLocationID = MODULE_LOADER_DESTINATION_ID;
		clearCurrentModule(moduleData)
		.then(loadCSSFiles)
		.then(loadJSFiles)
		.then(getUpdatedDeviceListing)
		.then(getModuleContext)
		.then(loadHTMLFiles)
		.then(updateStatistics)
		.then(runGC)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	this.loadModule = function(moduleObject) {
		var defered = q.defer();
		module_manager.loadModuleData(moduleObject)
		.then(renderModule)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	this.loadModuleByName = function(moduleName) {
		var defered = q.defer();
		module_manager.loadModuleDataByName(moduleName)
		.then(renderModule)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	var self = this;
}
util.inherits(createModuleLoader, EventEmitter);

var MODULE_LOADER = new createModuleLoader();
