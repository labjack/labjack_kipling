'use strict';

const EventEmitter = require('events').EventEmitter;

const package_loader = global.lj_di_injector.get('package_loader');
const module_manager = package_loader.getPackage('module_manager');
// const modbus_map = require('ljswitchboard-modbus_map').getConstants();


const MODULE_CHROME_HOLDER_ID = '#module_chrome_holder';
const MODULE_CHROME_HEADER_TABS_ID = '#header_tabs';
const MODULE_CHROME_BODY_TABS_ID = '#body_tabs';
const MODULE_CHROME_FOOTER_TABS_ID = '#footer_tabs';

const MODULE_CHROME_HEADER_TABS_CLASS = '.module-chrome-header-tabs';
const MODULE_CHROME_FOOTER_TABS_CLASS = '.module-chrome-footer-tabs';
const MODULE_CHROME_BODY_TABS_CLASS = '.module-chrome-body-tabs';

const MODULE_CHROME_TABS_CLASS = '.module-chrome-tab';
const MODULE_CHROME_CLICK_ID = 'MODULE_CHROME_CLICK_ID';

//related to the css styling in: module_chrome.css, ".module-list li", element height + 2
const TAB_SIZING_STYLE_CLASS = '.module-list li';

const moduleChromeTemplateName = 'module_chrome.html';
const moduleChromeTabTemplateName = 'module_tab.html';
const moduleChromeTemplatesDir = 'templates';

const sliderTabsClass = '.body-tab';

class ModuleChrome extends EventEmitter {

	constructor() {
		super();

		this.gui = global.lj_di_injector.get('gui');

		this.moduleChromeStarted = false;

		this.eventList = {
			MODULE_CHROME_STARTED: 'MODULE_CHROME_STARTED',
			LOADING_MODULE: 'LOADING_MODULE',
			MODULE_LOADED: 'MODULE_LOADED',
			MODULE_READY: 'MODULE_READY',
			DEVICE_LIST_UPDATED: 'DEVICE_LIST_UPDATED',
			MODULE_TABS_UPDATED: 'MODULE_TABS_UPDATED',

			// Events triggered by the device selector.
			DEVICE_SELECTOR_DEVICE_OPENED: 'DEVICE_SELECTOR_DEVICE_OPENED',
			DEVICE_SELECTOR_DEVICE_CLOSED: 'DEVICE_SELECTOR_DEVICE_CLOSED',
		};

		var documentURL;
		try {
			documentURL = document.URL.split('file:///')[1];
		} catch(err) {
			documentURL = '';
		}
		var cwd = path.dirname(documentURL);
		try {
			cwd = decodeURIComponent(cwd);
		} catch(err) {
			cwd = cwd.split('%20').join(' ');
		}
		if (!path.isAbsolute(cwd)) {
			cwd = path.resolve(path.sep, cwd);
		}

		this.cachedTemplates = {};

		// Initialize variables for communicating with the driver.
		this.io_manager = undefined;
		this.io_interface = undefined;
		this.device_controller = undefined;
		this.device_controller_events = undefined;

		this.cachedDeviceListing = [];

		this.debugFilters = false;

		this.filterOperations = {
			// TODO: Should combine this filter code with the filter code in the
			// io_manager device_keeper.js file.
			'minFW': (filterValue, deviceAttributes) => {
				if (this.debugFilters) {
					console.log('Checking minFW', filterValue, deviceAttributes.FIRMWARE_VERSION);
				}
				if (deviceAttributes.FIRMWARE_VERSION) {
					if (filterValue < deviceAttributes.FIRMWARE_VERSION) {
						return true;
					} else {
						this.filterFlags.isOld = true;
						if (this.debugFilters) {
							console.log('FAILS!');
						}
						return false;
					}
				} else {
					console.error('Firmware Version not found');
					return false;
				}
			},
			'subclass': (filterValues, deviceAttributes) => {
				var isMet = false;
				if (this.debugFilters) {
					console.log('Checking subclass', filterValues, deviceAttributes.productType);
				}
				filterValues.forEach((filterValue) => {
					if (deviceAttributes.productType.indexOf(filterValue) >= 0) {
						if (this.debugFilters) {
							console.log('Passes!', '"' + filterValue + '"');
						}
						isMet = true;
					}
				});
				return isMet;
			},
			'type': (filterValue, deviceAttributes) => {
				if (this.debugFilters) {
					console.log('Checking type', filterValue, deviceAttributes.productType);
				}
				var isMet = true;
				if (deviceAttributes.productType.indexOf(filterValue) < 0) {
					if (this.debugFilters) {
						console.log('FAILS!');
					}
					isMet = false;
				}
				return isMet;
			}
		};

		this.filterFlags = {};
		this.moduleLockMessage = '';
		this.allowModuleToLoad = true;

		this.deviceControllerEventListeners = {
			'DEVICE_CONTROLLER_DEVICE_OPENED': (eventData) => {
				// console.log('MODULE_CHROME, Device List Changed');

				// this.updateSecondaryModuleListing()
				this.deviceControllerDeviceListChanged();
			},
			'DEVICE_CONTROLLER_DEVICE_CLOSED': (eventData) => {
				// console.log('MODULE_CHROME, Device List Changed');

				// this.updateSecondaryModuleListing()
				this.deviceControllerDeviceListChanged();
			}
		};
	}

	loadTemplateFile(name) {
		return new Promise((resolve, reject) => {
			var templatePath = path.join(
				cwd,
				moduleChromeTemplatesDir,
				name
			);
			if (!path.isAbsolute(templatePath)) {
				templatePath = path.resolve(path.sep, templatePath);
			}
			// console.log('Executing fs.readFile', {
			// 	'optionA': path.resolve(templatePath),
			// 	'optionB': path.resolve(path.sep, templatePath)
			// });

			fs.readFile(templatePath, (err, data) => {
				var pageStr = '';
				if (err) {
					console.error('Error in _loadTemplateFile', err);
					console.error('Data', {
						'path': templatePath,
						'name': name,
						'cwd': cwd,
						'moduleChromeTemplatesDir': moduleChromeTemplatesDir,
					});
					resolve(pageStr);
				} else {
					resolve(data.toString());
				}
			});
		});
	}

	clearTemplateCache() {
		this.cachedTemplates = {};
	}

	compileTemplate(name, context) {
		return new Promise((resolve, reject) => {
			if (this.cachedTemplates[name]) {
				resolve(this.cachedTemplates[name](context));
			} else {
				this.loadTemplateFile(name)
					.then((templateData) => {
						const handlebars = global.require('handlebars');
						this.cachedTemplates[name] = handlebars.compile(templateData);
						resolve(this.cachedTemplates[name](context));
					});
			}
		});
	}

	renderTemplate(location, name, context) {
		return new Promise((resolve, reject) => {
			this.compileTemplate(name, context)
				.then((compiledData) => {
					var bodyTabs;

					location.empty();
					location.append($(compiledData));
					bodyTabs = location.find(sliderTabsClass);
					if (bodyTabs.length > 0) {
						bodyTabs.show();
					}
					resolve(context);
				});
		});
	}

	computeTabSizing(numTabs, offset, ele) {
		var tabEl;
		if (ele) {
			tabEl = ele;
		} else {
			tabEl = $(TAB_SIZING_STYLE_CLASS);
		}
		let height = tabEl.height();
		const padding = 2 * parseInt(tabEl.css('padding'), 10);
		const marginBottom = parseInt(tabEl.css('margin-bottom'), 10);
		height += (padding + marginBottom);
		height = height * numTabs;
		if (offset) {
			height += offset;
		}
		return height.toString() + 'px';
	}

	adjustModuleChromeTabSpacing(tabSections, context) {
		return new Promise((resolve, reject) => {

			var headerHeight = this.computeTabSizing(context.header_modules.length);
			var footerHeight = this.computeTabSizing(
				context.footer_modules.length,
				-2,
				$(MODULE_CHROME_FOOTER_TABS_CLASS)
			);
			var bottomPadding = this.computeTabSizing(
				context.footer_modules.length,
				0,
				$(MODULE_CHROME_FOOTER_TABS_CLASS)
			);
			// var bottomPadding = this.computeTabSizing(
			// 	context.footer_modules.length,
			// 	2
			// );

			$(MODULE_CHROME_HEADER_TABS_CLASS).css('height', headerHeight);
			$(MODULE_CHROME_FOOTER_TABS_CLASS).css('height', footerHeight);
			$(MODULE_CHROME_BODY_TABS_CLASS).css('padding-top', headerHeight);
			$(MODULE_CHROME_BODY_TABS_CLASS).css('padding-bottom', bottomPadding);
			// $(MODULE_CHROME_BODY_TABS_CLASS).css('padding-bottom', footerHeight);
			resolve(tabSections, context);
		});
	}

	updateVisibleTabs(location, context) {
		return new Promise((resolve, reject) => {
			this.renderTemplate(location, moduleChromeTabTemplateName, context)
				.then((context, data) => {
					resolve();
				}, reject);
		});
	}

	internalUpdateModuleListing(tabSections, context) {
		return new Promise((resolve, reject) => {
			var promises = [];
			tabSections.forEach((tabSection) => {
				promises.push(this.updateVisibleTabs(
					tabSection.location,
					{'modules': tabSection.context}
				));
			});

			// Wait for all of the operations to complete
			Promise.allSettled(promises)
				.then((res) => {
					if (context) {
						this.adjustModuleChromeTabSpacing(tabSections, context)
							.then(resolve, reject);
					} else {
						resolve(tabSections, context);
					}
				}, (err) => {
					console.error('Finished Updating Err', err);
					reject(context);
				});
		});
	}

	attachTabClickHandlers(tabSections, context) {
		return new Promise((resolve, reject) => {
			// Loop through each tab-section, ex: header, body, footer.
			tabSections.forEach((tabSection) => {
				var modules = tabSection.context;

				// Loop through and attach listeners for each tab.
				modules.forEach((module) => {
					var tabID = '#' + module.name + '-tab';
					var tab = $(tabID);
					tab.on('click', module, res => this.moduleChromeTabClickHandler(res));
				});
			});
			resolve(tabSections, context);
		});
	}

	innerUpdatePrimaryModuleListing(modules) {
		return new Promise((resolve, reject) => {
			var context = {
				'header_modules': modules.header,
				'footer_modules': modules.footer
			};
			var tabSections = [{
				'location': $(MODULE_CHROME_HEADER_TABS_ID),
				'context': context.header_modules,
			}, {
				'location': $(MODULE_CHROME_FOOTER_TABS_ID),
				'context': context.footer_modules,
			}];

			// Begin execution & return a promise.
			this.internalUpdateModuleListing(tabSections, context)
				.then((tabSections, context) => this.attachTabClickHandlers(tabSections, context))
				.then(() => {
					resolve(context);
				});
		});
	}

	updatePrimaryModuleListing() {
		// Get the list of modules and have the inner-function perform logic on
		// acquired data.
		return module_manager.getModulesList()
		.then(modules => this.innerUpdatePrimaryModuleListing(modules))
		.then(updatedModules => this.reportModuleTabsUpdated(updatedModules));
	}

	internalUpdateSecondaryModuleListing(modules) {
		return new Promise((resolve, reject) => {
			var context = {
				'modules': modules.body
			};

			var tabSections = [{
				'location': $(MODULE_CHROME_BODY_TABS_ID),
				'context': context.modules,
			}];

			// Begin execution & return a promise.
			this.internalUpdateModuleListing(tabSections)
				.then((tabSections, context) => this.attachTabClickHandlers(tabSections, context))
				.then(() => {
					resolve(context);
				});
		});
	}

	checkDeviceForSupport(filters, deviceListing) {
		var passedFilters = filters.some((filter) => {
			var isSupportedDevice = true;
			var keys = Object.keys(filter);

			// Check each filter to see if the current device meets all filter
			// requirements.
			keys.every((key) => {

				if (typeof(this.filterOperations[key]) === 'function') {
					if (this.debugFilters) {
						console.log(
							'Checking Filter - func - Key',
							key,
							filter[key]
						);
					}
					if (!this.filterOperations[key](filter[key], deviceListing)) {
						isSupportedDevice = false;
						return false;
					}
				} else if (typeof(deviceListing[key]) !== 'undefined') {
					console.log(
						'Checking Filter - attr - Key',
						key,
						deviceListing[key],
						filter[key]
					);
				} else {
					console.log('Checking Filter', key, 'unfound...');
				}
				return true;
			});
			return isSupportedDevice;
		});
		return passedFilters;
	}

	filterBodyModules(module) {
		var showModule = true;
		var isSupportedDevice;
		// If there aren't any connected devices, make sure that no modules are
		// shown.
		if (this.cachedDeviceListing.length === 0) {
			showModule = false;
		} else {
			// If the loaded module has the supportedDevices attribute, execute
			// the filters.
			if (module.supportedDevices) {
				showModule = this.cachedDeviceListing.some(
					(deviceListing) => {
						return this.checkDeviceForSupport(
							module.supportedDevices,
							deviceListing
						);
					});
			} else {
				if (this.debugFilters || true) {
					console.log('Not Filtering Module', module.humanName, module.name);
				}
			}
		}
		return showModule;
	}

	filterModulesList(modules) {
		return new Promise((resolve, reject) => {
			if (this.debugFilters) {
				console.log('Filtering Secondary modules', modules.body);
				console.log('Device Listing', this.cachedDeviceListing);
			}

			this.filterFlags = {};
			modules.body = modules.body.filter(module => this.filterBodyModules(module));
			resolve(modules);
		});
	}

	reportModuleTabsUpdated(updatedModules) {
		return new Promise((resolve, reject) => {
			this.emit(this.eventList.MODULE_TABS_UPDATED, updatedModules);
			resolve();
		});
	}

	updateSecondaryModuleListing() {
		// Get the list of modules and have the inner-function perform logic on
		// acquired data.
		return module_manager.getModulesList()
		.then(modules => this.filterModulesList(modules))
		.then(modules => this.internalUpdateSecondaryModuleListing(modules))
		.then(updatedModules => this.reportModuleTabsUpdated(updatedModules));
	}

	runGC(data) {
		var gcExecuted = false;
		if (global.gc) {
			if (global.gc.call) {
				if (typeof (global.gc.call) === 'function') {
					global.gc.call();
					gcExecuted = true;
				}
			}
		}
		if (gcExecuted) {
			// console.log('gc.call executed');
		} else {
			// console.log('gc.call not executed');
		}

		return Promise.resolve(data);
	}

	updateModuleListing() {
		// Instruct both the primary & secondary modules to update.
		const promises = [
			this.updatePrimaryModuleListing(),
			this.updateSecondaryModuleListing()
		];

		// Wait for all of the operations to complete
		return Promise.allSettled(promises)
			.then(() => this.runGC());
	}

	disableModuleLoading(message) {
		this.allowModuleToLoad = false;
		this.moduleLockMessage = message;
	}

	enableModuleLoading() {
		this.moduleLockMessage = '';
		this.allowModuleToLoad = true;
	}

	conditionallyClearCaches() {
		try {
			var clearCaches = false;
			if (typeof(this.gui.App.manifest.clearCachesOnModuleLoad) !== "undefined") {
				clearCaches = clearCaches || this.gui.App.manifest.clearCachesOnModuleLoad;
			}
			if (!!process.env.TEST_MODE || typeof(this.gui.App.manifest.test) !== "undefined") {
				clearCaches = clearCaches || !!process.env.TEST_MODE || this.gui.App.manifest.test;
			}
			if (clearCaches) {
				if (global.CLEAR_CACHES) {
					console.log('clearing caches');
					global.CLEAR_CACHES();
				}
			} else {
				console.log('not clearing caches',
					clearCaches,
					this.gui.App.manifest.clearCachesOnModuleLoad,
					!!process.env.TEST_MODE || this.gui.App.manifest.test
				);
			}
		} catch(err) {
			console.error('Not Clearing Caches due to error', err);
		}
	}

	moduleChromeTabClickHandler(res) {
		// console.log('Clicked Tab', res.data.name);
		if (this.allowModuleToLoad) {
			this.allowModuleToLoad = false;

			this.conditionallyClearCaches();

			// Clear all selected module styling classes
			$('.module-chrome-tab').removeClass('selected');
			var tabID = '#' + res.data.name + '-tab';
			$(tabID).addClass('selected');

			this.emit(this.eventList.LOADING_MODULE, res);
			global.MODULE_LOADER.once('MODULE_READY', (res) => {
				this.allowModuleToLoad = true;
				global.hideInfoMessage();
				global.hideAlert();
			});

			global.MODULE_LOADER.loadModule(res.data)
			.then((res) => {
				this.emit(this.eventList.MODULE_LOADED, res);
				// this.allowModuleToLoad = true;
				// // console.log('Finished Loading Module', res.name);

				// Delete loaded data (commented out to let gc handle it)
				// var keys = Object.keys(res);
				// var i;
				// for(i = 0; i < keys.length; i++) {
				// res[keys[i]] = null;
				// res[keys[i]] = undefined;
				// delete res[keys[i]];
				// }
			}, (err) => {
				this.allowModuleToLoad = true;
				console.error('Error loading module', err);
			});
		} else {
			// console.log('Preventing module from loading');
			if (this.moduleLockMessage) {
				global.showInfoMessage(this.moduleLockMessage);
			} else {
				global.showInfoMessage('Please wait for module to finish loading.');
			}
		}
		// Query for the module's data.  Will be replaced by a function call
		// to MODULE_LOADER.
		// module_manager.loadModuleData(res.data);
	}

	saveDeviceListingData(deviceInfoArray) {
		return new Promise((resolve, reject) => {
			console.log('Updated Device Listing', deviceInfoArray);

			this.emit(this.eventList.DEVICE_LIST_UPDATED, deviceInfoArray);

			this.cachedDeviceListing = deviceInfoArray;
			resolve();
		});
	}

	deviceControllerDeviceListChanged() {
		return new Promise((resolve, reject) => {

			// Get updated device listing from the device controller
			this.device_controller.getDeviceListing()
				.then(deviceInfoArray => this.saveDeviceListingData(deviceInfoArray))
				.then(() => this.updateSecondaryModuleListing())
				.then(resolve);
		});
	}

	attachToDeviceControllerEvents() {
		this.io_manager = global.require('ljswitchboard-io_manager');
		this.io_interface = this.io_manager.io_interface();
		this.device_controller = this.io_interface.getDeviceController();
		this.device_controller_events = this.device_controller.eventList;

		const listenerKeys = Object.keys(this.deviceControllerEventListeners);
		listenerKeys.forEach((key) => {
			this.device_controller.on(
				this.device_controller_events[key],
				this.deviceControllerEventListeners[key]
			);
		});

		return Promise.resolve();
	}

	loadStartupModule() {
		return global.MODULE_LOADER.loadModuleByName('device_selector');
	}

	async reportModuleChromeStarted() {
		this.emit(this.eventList.MODULE_CHROME_STARTED);
		this.moduleChromeStarted = true;
	}

	async internalLoadModuleChrome() {
		const context = {};

		// Render the module chrome template
		await this.renderTemplate(
			$(MODULE_CHROME_HOLDER_ID),
			moduleChromeTemplateName,
			context
		);

		// Update the module chrome window with applicable modules
		await this.updateModuleListing();

		// Attach to important device_controller events.
		await this.attachToDeviceControllerEvents();

		// Instruct the startup module to load, aka the device_selector
		await this.loadStartupModule();

		// Report that the module chrome has started
		await this.reportModuleChromeStarted();

		// Update the module chrome window with applicable modules
		await this.updateModuleListing();
	}

	// Almost identical to the "internalLoadModuleChrome", however it doesn't
	// start the device_selector module.
	async loadTestModuleChrome() {
			const context = {};

			// Render the module chrome template
			await this.renderTemplate(
				$(MODULE_CHROME_HOLDER_ID),
				moduleChromeTemplateName,
				context
			);

			// Update the module chrome window with applicable modules
			const bundle = await this.updateModuleListing();

			// Attach to important device_controller events.
			await this.attachToDeviceControllerEvents();

			// Report that the module chrome has started
			await this.reportModuleChromeStarted();
	}

	reloadModuleChrome() {
		return this.internalLoadModuleChrome();
	}

	loadModuleChrome() {
		if (!!process.env.TEST_MODE || this.gui.App.manifest.test) {
			return this.loadTestModuleChrome();
		} else {
			return this.internalLoadModuleChrome();
		}
	}

	testLoad() {
		this.loadModuleChrome()
			.then((res) => {
				console.log('Template File', res);
			});
	}
}

var MODULE_CHROME = new ModuleChrome();
