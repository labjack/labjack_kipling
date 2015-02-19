
console.log('in module loader');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');
var q = global.require('q');
var handlebars = global.require('handlebars');
try {
	handlebars.registerHelper('printContext', function() {
		return new handlebars.SafeString(JSON.stringify({'context': this}, null, 2));
	});
} catch(err) {
	console.log('HErE', err);
}
var module_manager = require('ljswitchboard-module_manager');
var fs = require('fs');
var package_loader = require('ljswitchboard-package_loader');
var gns = package_loader.getNameSpace();


function createModuleLoader() {
	this.stats = {
		'numLoaded': 0
	};
	var eventList = {
		VIEW_READY: 'VIEW_READY',
		UNLOAD_MODULE: 'UNLOAD_MODULE'
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
			console.info(
				'Executing precompile function',
				i,
				precompileFunctions.length
			);
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
	var loadHTMLFiles = function(newModule) {
		var defered = q.defer();
		newModule.html.forEach(function(htmlFile) {
			if(htmlFile.fileName === 'view.html') {
				var template = handlebars.compile(htmlFile.fileData);
				var data = template(newModule.context);
				data = MODULE_LOADER_VIEW_TEMPLATE({
					'numLoaded': newModule.context.stats.numLoaded,
					'viewData': data,
				});
				newModule.outputLocation.view.append(data);

				var elementID = MODULE_LOADER_VIEW_ID_TEMPLATE({
					'numLoaded': newModule.context.stats.numLoaded
				});
				$(elementID).ready(function() {
					defered.resolve(newModule);
					self.emit(eventList.VIEW_READY, {
						'name': newModule.name,
						'id': elementID
					});
				});
			}
		});
		return defered.promise;
	};
	var updateStatistics = function(newModule) {
		var defered = q.defer();
		self.stats.numLoaded += 1;
		defered.resolve(newModule);
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
			'stats': self.stats
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
		.then(getModuleContext)
		.then(loadHTMLFiles)
		.then(updateStatistics)
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
