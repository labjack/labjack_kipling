'use strict';

const {EventEmitter} = require('events');
const path = require('path');

const package_loader = global.package_loader;
const module_manager = package_loader.getPackage('module_manager');
const handleBarsService = package_loader.getPackage('handleBarsService');

const io_manager = package_loader.getPackage('io_manager');

const MODULE_CHROME_HOLDER_ID = '#module_chrome_holder';
const MODULE_CHROME_HEADER_TABS_ID = '#header_tabs';
const MODULE_CHROME_BODY_TABS_ID = '#body_tabs';
const MODULE_CHROME_FOOTER_TABS_ID = '#footer_tabs';

const MODULE_CHROME_HEADER_TABS_CLASS = '.module-chrome-header-tabs';
const MODULE_CHROME_FOOTER_TABS_CLASS = '.module-chrome-footer-tabs';
const MODULE_CHROME_BODY_TABS_CLASS = '.module-chrome-body-tabs';

//related to the css styling in: module_chrome.css, ".module-list li", element height + 2
const TAB_SIZING_STYLE_CLASS = '.module-list li';

const sliderTabsClass = '.body-tab';

class ModuleChrome extends EventEmitter {

	constructor() {
		super();
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

/*
		let documentURL;
		try {
			documentURL = document.URL.split('file:///')[1];
		} catch(err) {
			documentURL = '';
		}
		const cwd = path.dirname(documentURL);
		try {
			cwd = decodeURIComponent(cwd);
		} catch(err) {
			cwd = cwd.split('%20').join(' ');
		}
		if (!path.isAbsolute(cwd)) {
			cwd = path.resolve(path.sep, cwd);
		}
*/

		// Initialize variables for communicating with the driver.
		this.io_interface = undefined;
		this.device_controller = undefined;

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
				let isMet = false;
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
				let isMet = true;
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
	}

	async compileTemplate(templateName, data) {
		const handleBarsService = package_loader.getPackage('handleBarsService');
		return await handleBarsService.renderTemplate(path.join(__dirname, 'templates', templateName), data);
	}

	async renderTemplate(location, name, context) {
		const compiledData = await handleBarsService.renderTemplate(name, context);
		location.empty();
		location.append($(compiledData));
		const bodyTabs = location.find(sliderTabsClass);
		if (bodyTabs.length > 0) {
			bodyTabs.show();
		}
		return context;
	}

	computeTabSizing(numTabs, offset, ele) {
		const tabEl = ele ? ele : $(TAB_SIZING_STYLE_CLASS);
		const padding = 2 * parseInt(tabEl.css('padding'), 10);
		const marginBottom = parseInt(tabEl.css('margin-bottom'), 10);
		let height = tabEl.height();
		height += (padding + marginBottom);
		height = height * numTabs;
		if (offset) {
			height += offset;
		}
		return height.toString() + 'px';
	}

	adjustModuleChromeTabSpacing(tabSections, context) {
		return new Promise((resolve) => {
			const headerHeight = this.computeTabSizing(context.header_modules.length);
			const footerHeight = this.computeTabSizing(
				context.footer_modules.length,
				-2,
				$(MODULE_CHROME_FOOTER_TABS_CLASS)
			);
			const bottomPadding = this.computeTabSizing(
				context.footer_modules.length,
				0,
				$(MODULE_CHROME_FOOTER_TABS_CLASS)
			);
			// const bottomPadding = this.computeTabSizing(
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

	async updateVisibleTabs(location, context) {
		await this.renderTemplate(location, window.moduleChromeTabTemplateName, context);
	}

	internalUpdateModuleListing(tabSections, context) {
		return new Promise((resolve, reject) => {
			const promises = [];
			tabSections.forEach((tabSection) => {
				promises.push(this.updateVisibleTabs(
					tabSection.location,
					{'modules': tabSection.context}
				));
			});

			// Wait for all of the operations to complete
			Promise.allSettled(promises)
				.then(() => {
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
		return new Promise((resolve) => {
			// Loop through each tab-section, ex: header, body, footer.
			tabSections.forEach((tabSection) => {
				const modules = tabSection.context;

				// Loop through and attach listeners for each tab.
				modules.forEach((module) => {
					const tabID = '#' + module.name + '-tab';
					const tab = $(tabID);
					tab.on('click', module, res => this.moduleChromeTabClickHandler(res));
				});
			});
			resolve(tabSections, context);
		});
	}

	innerUpdatePrimaryModuleListing(modules) {
		const context = {
			'header_modules': modules.header,
			'footer_modules': modules.footer
		};
		const tabSections = [{
			'location': $(MODULE_CHROME_HEADER_TABS_ID),
			'context': context.header_modules,
		}, {
			'location': $(MODULE_CHROME_FOOTER_TABS_ID),
			'context': context.footer_modules,
		}];

		// Begin execution & return a promise.
		return this.internalUpdateModuleListing(tabSections, context)
			.then((tabSections, context) => this.attachTabClickHandlers(tabSections, context));
	}

	updatePrimaryModuleListing() {
		// Get the list of modules and have the inner-function perform logic on
		// acquired data.
		return module_manager.getModulesList()
			.then(modules => this.innerUpdatePrimaryModuleListing(modules))
			.then(updatedModules => this.reportModuleTabsUpdated(updatedModules));
	}

	internalUpdateSecondaryModuleListing(modules) {
		const context = {
			'modules': modules.body
		};

		const tabSections = [{
			'location': $(MODULE_CHROME_BODY_TABS_ID),
			'context': context.modules,
		}];

		// Begin execution & return a promise.
		return this.internalUpdateModuleListing(tabSections)
			.then((tabSections, context) => this.attachTabClickHandlers(tabSections, context));
	}

	checkDeviceForSupport(filters, deviceListing) {
		return filters.some((filter) => {
			let isSupportedDevice = true;
			const keys = Object.keys(filter);

			// Check each filter to see if the current device meets all filter
			// requirements.
			keys.every((key) => {

				if (typeof (this.filterOperations[key]) === 'function') {
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
				} else if (typeof (deviceListing[key]) !== 'undefined') {
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
	}

	filterBodyModules(module) {
		let showModule = true;
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

	async filterModulesList(modules) {
		if (this.debugFilters) {
			console.log('Filtering Secondary modules', modules.body);
			console.log('Device Listing', this.cachedDeviceListing);
		}

		this.filterFlags = {};
		modules.body = modules.body.filter(module => this.filterBodyModules(module));
		return modules;
	}

	async reportModuleTabsUpdated(updatedModules) {
		this.emit(this.eventList.MODULE_TABS_UPDATED, updatedModules);
	}

	updateSecondaryModuleListing() {
		// Get the list of modules and have the inner-function perform logic on
		// acquired data.
		return module_manager.getModulesList()
			.then(modules => this.filterModulesList(modules))
			.then(modules => this.internalUpdateSecondaryModuleListing(modules))
			.then(updatedModules => this.reportModuleTabsUpdated(updatedModules));
	}

	updateModuleListing() {
		// Instruct both the primary & secondary modules to update.
		const promises = [
			this.updatePrimaryModuleListing(),
			this.updateSecondaryModuleListing()
		];

		// Wait for all of the operations to complete
		return Promise.allSettled(promises);
	}

	disableModuleLoading(message) {
		console.log('MODULE_CHROME.disableModuleLoading', message);
		this.allowModuleToLoad = false;
		this.moduleLockMessage = message;
	}

	enableModuleLoading() {
		console.log('MODULE_CHROME.enableModuleLoading');
		this.moduleLockMessage = '';
		this.allowModuleToLoad = true;
	}

	conditionallyClearCaches() {
		try {
			let clearCaches = false;
			if (!!process.env.TEST_MODE) {
				clearCaches = clearCaches || !!process.env.TEST_MODE;
			}
			if (clearCaches) {
				if (global.CLEAR_CACHES) {
					console.log('clearing caches');
					global.CLEAR_CACHES();
				}
			} else {
				console.log('not clearing caches',
					clearCaches,
					!!process.env.TEST_MODE
				);
			}
		} catch(err) {
			console.error('Not Clearing Caches due to error', err);
		}
	}

	moduleChromeTabClickHandler(res) {
		// console.log('Clicked Tab', res.data.name);
		if (this.allowModuleToLoad) {
			console.log('MODULE_CHROME.moduleChromeTabClickHandler');
			this.allowModuleToLoad = false;

			this.conditionallyClearCaches();

			// Clear all selected module styling classes
			$('.module-chrome-tab').removeClass('selected');
			const tabID = '#' + res.data.name + '-tab';
			$(tabID).addClass('selected');

			this.emit(this.eventList.LOADING_MODULE, res);
			global.MODULE_LOADER.once('MODULE_READY', () => {
				console.log('MODULE_CHROME.MODULE_READY');
				this.allowModuleToLoad = true;
				global.hideInfoMessage();
				global.hideAlert();
			});

			console.log('global.MODULE_LOADER', res.data);
			global.MODULE_LOADER.loadModule(res.data)
				.then((res) => {
					console.log('MODULE_CHROME.loadModule - ok');
					this.emit(this.eventList.MODULE_LOADED, res);
					// this.allowModuleToLoad = true;
				}, (err) => {
					console.log('MODULE_CHROME.loadModule - err');
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

	async saveDeviceListingData(deviceInfoArray) {
		console.log('Updated Device Listing', deviceInfoArray);

		this.emit(this.eventList.DEVICE_LIST_UPDATED, deviceInfoArray);

		this.cachedDeviceListing = deviceInfoArray;
	}

	deviceControllerDeviceListChanged() {
		// Get updated device listing from the device controller
		return this.device_controller.getDeviceListing()
			.then(deviceInfoArray => this.saveDeviceListingData(deviceInfoArray))
			.then(() => this.updateSecondaryModuleListing());
	}

	attachToDeviceControllerEvents() {
		this.io_interface = io_manager.io_interface();
		this.device_controller = this.io_interface.getDeviceController();

		this.device_controller.on(
			this.device_controller.eventList.DEVICE_CONTROLLER_DEVICE_OPENED,
			() => {
				// this.updateSecondaryModuleListing()
				this.deviceControllerDeviceListChanged();
			}
		);
		this.device_controller.on(
			this.device_controller.eventList.DEVICE_CONTROLLER_DEVICE_CLOSED,
			() => {
				// this.updateSecondaryModuleListing()
				this.deviceControllerDeviceListChanged();
			}
		);

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
			window.moduleChromeTemplateName,
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
			window.moduleChromeTemplateName,
			context
		);

		// Update the module chrome window with applicable modules
		await this.updateModuleListing();

		// Attach to important device_controller events.
		await this.attachToDeviceControllerEvents();

		// Report that the module chrome has started
		await this.reportModuleChromeStarted();
	}

	reloadModuleChrome() {
		return this.internalLoadModuleChrome();
	}

	loadModuleChrome() {
		if (!!process.env.TEST_MODE) {
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

global.MODULE_CHROME = new ModuleChrome();
