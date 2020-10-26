'use strict';

const path = require('path');
const {EventEmitter} = require('events');
const package_loader = global.lj_di_injector.get('package_loader');
const static_files = package_loader.getPackage('static_files');
const io_manager = package_loader.getPackage('io_manager');
const module_manager = package_loader.getPackage('module_manager');
const core = package_loader.getPackage('core');
const handleBarsService = core.handleBarsService;

// Configure the module_manager persistent data path.
const kiplingExtractionPath = package_loader.getExtractionPath();
const moduleDataPath = path.normalize(path.join(
	kiplingExtractionPath,
	'module_data'
));
module_manager.configurePersistentDataPath(moduleDataPath);
module_manager.disableLinting();

const MODULE_LOADER_CSS_DESTINATION_ID = 'module-chrome-loaded-module-css';
const MODULE_LOADER_JS_DESTINATION_ID = 'module-chrome-loaded-module-js';
const MODULE_LOADER_VIEW_DESTINATION_ID = 'module-chrome-loaded-module-view';

const eventList = {
	VIEW_READY: 'VIEW_READY',
	UNLOAD_MODULE: 'UNLOAD_MODULE',
	MODULE_READY: 'MODULE_READY',
};

class ModuleLoader extends EventEmitter {

	constructor() {
		super();
		this.stats = {
			'numLoaded': 0
		};
		this.current_module_data = {};

		this.eventList = eventList;

		this.precompileFunctions = [];
		this.unloadModuleFunctions = [];
	}

	clearCurrentModule(newModule) {
		return new Promise((resolve, reject) => {
			// Remove any current listeners from the VIEW_READY and UNLOAD_MODULE
			// events.  They should only be listened to by the currently loaded
			// module.
			this.removeAllListeners(eventList.VIEW_READY);
			this.removeAllListeners(eventList.UNLOAD_MODULE);

			// Clear the DOM elements
			const locationKeys = Object.keys(newModule.outputLocation);
			locationKeys.forEach((locationKey) => {
				newModule.outputLocation[locationKey].empty();
			});
			resolve(newModule);
		});
	}

	getCreatePageElement(newModule) {
		const createPageElement = (newFile) => {
			return new Promise((resolve, reject) => {
			const results = {
				'name': newFile.fileName,
			};
			try {
				const fileType = path.extname(newFile.fileName);
				if(fileType === '.css') {
					const newElement = document.createElement('style');
					newElement.setAttribute('type', 'text/css');

					newElement.onload = () => {
						// console.info('!!! '+fileType+' file loaded', newFile.fileName);
						resolve(results);
					};
					newElement.onerror = () => {
						console.error('Error in file' + fileType);
					};

					// Save the file's data
					results.element = newElement;
					newElement.appendChild(document.createTextNode(newFile.fileData));
					newModule.outputLocation.css.append(newElement);
				} else if(fileType === '.js') {
					const newElement = document.createElement('script');
					newElement.setAttribute('type', 'text/javascript');
					//

					// Isn't working for .js files :( idk why, it worked before.
					// newElement.onload = () => {
					// console.info('!!! '+fileType+' file loaded', newFile.fileName);
					// resolve(results);
					// };
					// newElement.setAttribute('src', newFile.filePath);

					// Save the file's data
					results.element = newElement;
					newElement.appendChild(document.createTextNode(newFile.fileData));
					newModule.outputLocation.js.append(newElement);
					resolve(results);
				} else {
					console.error('Trying to load invalid fileType', fileType);
					resolve(results);
				}
			} catch(err) {
				console.error('Error Loading Element', err);
				console.error(newFile.fileName);
				results.element = undefined;
				resolve(results);
			}

			});
		};
		return createPageElement;
	}

	loadCSSFiles(newModule) {
		return new Promise((resolve, reject) => {
			const promises = newModule.css.map(this.getCreatePageElement(newModule));

			Promise.allSettled(promises)
				.then((results) => {
					resolve(newModule);
				}, (err) => {
					console.error('Finished Loading Err', err);
					reject(newModule);
				});
		});
	}

	loadJSFiles(newModule) {
		return new Promise((resolve, reject) => {
			const promises = newModule.js.map(this.getCreatePageElement(newModule));

			Promise.allSettled(promises)
				.then((results) => {
					resolve(newModule);
				}, (err) => {
					console.error('Finished Loading Err', err);
					reject(newModule);
				});
		});
	}

	addPreloadStep(func) {
		this.precompileFunctions.push(func);
	}

	getModuleContext(newModule) {
		return new Promise((resolve, reject) => {
			const promises = [];
			for(let i = 0; i < this.precompileFunctions.length; i++) {
				promises.push(this.precompileFunctions[i](newModule));
			}
			Promise.allSettled(promises)
				.then((results) => {
					this.precompileFunctions = [];
					resolve(newModule);
				}, (err) => {
					console.error('Finished pre-compilation steps', err);
					reject(newModule);
				});
		});
	}

	getUpdatedDeviceListing(newModule) {
		return new Promise((resolve, reject) => {
			const io_interface = io_manager.io_interface();
			const device_controller = io_interface.getDeviceController();

			// Filter what devices are displayed
			const filters = newModule.data.supportedDevices ? newModule.data.supportedDevices : null;
			device_controller.getDeviceListing(filters).then((deviceListing) => {
				newModule.context.devices = deviceListing;
				resolve(newModule);
			});
		});
	}

	async loadHTMLFiles(newModule) {
		// console.log('loaded html files', newModule.htmlFiles);
		let htmlFile = '<p>No view.html file loaded.</p>';
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
		const data1 = await handleBarsService.renderHtmlTemplate(htmlFile, newModule.context);

		// Append a header & footer onto the template.
		const data = '<div id="module-chrome-current-module-' + newModule.context.stats.numLoaded + '">' + data1 + '</div>';

		// Add the page data to the dom.
		newModule.outputLocation.view.append(data);

		// Build the elementID string that was assigned to the element when
		// compiling the "MODULE_LOADER_VIEW_TEMPLATE"

		const elementID = '#module-chrome-current-module-' + newModule.context.stats.numLoaded;

		return new Promise((resolve) => {
			// Attach to the .ready event of the element just created.
			// Element must already be added because we use jquery to search for
			// the element's ID to attach to the "ready" event.
			$(elementID).ready(() => {
				resolve(newModule);
				const loadedData = {
					'name': newModule.name,
					'id': elementID,
					'data': newModule,
					'humanName': newModule.data.humanName,
				};
				this.emit(eventList.VIEW_READY, loadedData);
				this.current_module_data = null;
				this.current_module_data = undefined;
				this.current_module_data = loadedData;
			});
		});
	}

	updateStatistics(newModule) {
		return new Promise((resolve, reject) => {
		this.stats.numLoaded += 1;
		resolve(newModule);
		});
	}

	runGC(data) {
		let gcExecuted = false;
		if(global.gc) {
			if(global.gc.call) {
				if(typeof(global.gc.call) === 'function') {
					global.gc.call();
					gcExecuted = true;
				}
			}
		}
		if(gcExecuted) {
			// console.log('gc.call executed');
		} else {
			// console.log('gc.call not executed');
		}

		return Promise.resolve(data);
	}

	addUnloadStep(func) {
		this.unloadModuleFunctions.push(func);
	}

	executeUnloadModuleFunctions(moduleData) {
		return new Promise((resolve, reject) => {
			if (this.unloadModuleFunctions.length > 0) {
				const promises = [];
				for(let i = 0; i < this.unloadModuleFunctions.length; i++) {
					promises.push(this.unloadModuleFunctions[i]());
				}
				Promise.allSettled(promises)
					.then((results) => {
						this.unloadModuleFunctions = [];
						resolve(moduleData);
					}, function(err) {
						console.error('Finished unload-module steps', err);
						resolve(moduleData);
					});
			} else {
				resolve(moduleData);
			}
		});
	}

	renderModule(moduleData) {
		return new Promise((resolve, reject) => {
			// Trigger any loaded module to halt its execution
			this.emit(eventList.UNLOAD_MODULE, {
				'data': 'testData...'
			});
			moduleData.loadResults = {
				'overallResult': true,
				'css': [],
				'js': [],
				'html': [],
			};
			// coppied directory of the static_files project location.
			const cpdDir = JSON.parse(JSON.stringify(static_files.getDir()));
			// console.log('coppied directory', cpdDir);
			moduleData.context = {
				'stats': this.stats,
				'staticFiles': cpdDir,
				'devices': undefined,
			};
			moduleData.outputLocation = {
				'css': $('#' + MODULE_LOADER_CSS_DESTINATION_ID),
				'js': $('#' + MODULE_LOADER_JS_DESTINATION_ID),
				'view': $('#' + MODULE_LOADER_VIEW_DESTINATION_ID),
			};
			// moduleData.outputLocationID = MODULE_LOADER_DESTINATION_ID;
			this.clearCurrentModule(moduleData)
				.then(moduleData => this.loadCSSFiles(moduleData))
				.then(moduleData => this.loadJSFiles(moduleData))
				.then(moduleData => this.getUpdatedDeviceListing(moduleData))
				.then(moduleData => this.getModuleContext(moduleData))
				.then(moduleData => this.loadHTMLFiles(moduleData))
				.then(moduleData => this.updateStatistics(moduleData))
				.then(moduleData => this.runGC(moduleData))
				.then(resolve, reject);
				});
	}

	loadModule(moduleObject) {
		return new Promise((resolve, reject) => {
			module_manager.loadModuleData(moduleObject)
				.then(moduleData => this.executeUnloadModuleFunctions(moduleData))
				.then(moduleData => this.renderModule(moduleData))
				.then(resolve, reject);
		});
	}

	loadModuleByName(moduleName) {
		return new Promise((resolve, reject) => {
			module_manager.loadModuleDataByName(moduleName)
				.then(moduleData => this.executeUnloadModuleFunctions(moduleData))
				.then(moduleData => this.renderModule(moduleData))
				.then(resolve, reject);
		});
	}

}

global.MODULE_LOADER = new ModuleLoader();
