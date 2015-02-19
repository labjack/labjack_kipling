
console.log('in module chrome');
var path = require('path');
var q = global.require('q');
var handlebars = global.require('handlebars');
var module_manager = require('ljswitchboard-module_manager');
var fs = require('fs');



function createModuleChrome() {

	var MODULE_CHROME_HOLDER_ID = '#module_chrome_holder';
	var MODULE_CHROME_HEADER_TABS_ID = '#header_tabs';
	var MODULE_CHROME_BODY_TABS_ID = '#body_tabs';
	var MODULE_CHROME_FOOTER_TABS_ID = '#footer_tabs';

	var MODULE_CHROME_HEADER_TABS_CLASS = '.module-chrome-header-tabs';
	var MODULE_CHROME_FOOTER_TABS_CLASS = '.module-chrome-footer-tabs';
	var MODULE_CHROME_BODY_TABS_CLASS = '.module-chrome-body-tabs';

	var MODULE_CHROME_TABS_CLASS = '.module-chrome-tab';

	var MODULE_CHROME_CLICK_ID = 'MODULE_CHROME_CLICK_ID';


	//related to the css styling in: module_chrome.css, ".module-list li", element height + 2
	var TAB_SIZING_STYLE_CLASS = '.module-list li';

	var documentURL;
	try {
		documentURL = document.URL.split('file:///')[1];
	} catch(err) {
		documentURL = '';
	}
	var cwd = path.dirname(documentURL);
	var moduleChromeTemplateName = 'module_chrome.html';
	var moduleChromeTabTemplateName = 'module_tab.html';
	var moduleChromeTemplatesDir = 'templates';
	
	var cachedTemplates = {};

	var loadTemplateFile = function(name) {
		var defered = q.defer();
		var templatePath = path.join(
			cwd,
			moduleChromeTemplatesDir,
			name
		);
		fs.readFile(templatePath, function(err, data) {
			var pageStr = '';
			if(err) {
				console.error('Error in loadTemplateFile', err);
				defered.resolve(pageStr);
			} else {
				defered.resolve(data.toString());
			}
		});
		return defered.promise;
	};
	var compileTemplate = function(name, context) {
		var defered = q.defer();
		if(cachedTemplates[name]) {
			defered.resolve(cachedTemplates[name](context));
		} else {
			loadTemplateFile(name)
			.then(function(templateData) {
				cachedTemplates[name] = handlebars.compile(templateData);
				defered.resolve(cachedTemplates[name](context));
			});
		}
		return defered.promise;
	};

	
	var renderTemplate = function(location, name, context) {
		var defered = q.defer();
		compileTemplate(name, context)
		.then(function(compiledData) {
			location.empty();
			location.append($(compiledData));
			defered.resolve(context);
		});
		return defered.promise;
	};

	var computeTabSizing = function(numTabs, offset) {
		var tabEl = $(TAB_SIZING_STYLE_CLASS);
		var height = tabEl.height();
		var padding = 2*parseInt(tabEl.css('padding'), 10);
		var marginBottom = parseInt(tabEl.css('margin-bottom'), 10);
		height += (padding + marginBottom);
		height = height * numTabs;
		if(offset) {
			height += offset;
		}
		return height.toString() + 'px';
	};
	this.adjustModuleChromeTabSpacing = function(tabSections, context) {
		var defered = q.defer();
		var headerHeight = computeTabSizing(context.header_modules.length);
		var footerHeight = computeTabSizing(context.footer_modules.length);
		var bottomPadding = computeTabSizing(
			context.footer_modules.length,
			2
		);
		
		$(MODULE_CHROME_HEADER_TABS_CLASS).css('height', headerHeight);
		$(MODULE_CHROME_FOOTER_TABS_CLASS).css('height', footerHeight);
		$(MODULE_CHROME_BODY_TABS_CLASS).css('padding-top', headerHeight);
		$(MODULE_CHROME_BODY_TABS_CLASS).css('padding-bottom', bottomPadding);
		defered.resolve(tabSections, context);
		return defered.promise;
	};

	var updateVisibleTabs = function(location, context) {
		var defered = q.defer();
		renderTemplate(location, moduleChromeTabTemplateName, context)
		.then(function(context, data) {
			defered.resolve();
		}, defered.reject);
		return defered.promise;
	};

	var internalUpdateModuleListing = function(tabSections, context) {
		var defered = q.defer();
		var promises = [];
		tabSections.forEach(function(tabSection) {
			promises.push(updateVisibleTabs(
				tabSection.location,
				{'modules': tabSection.context}
			));
		});

		// Wait for all of the operations to complete
		q.allSettled(promises)
		.then(function(res) {
			if(context) {
				self.adjustModuleChromeTabSpacing(tabSections, context)
				.then(defered.resolve, defered.reject);
			} else {
				defered.resolve(tabSections, context);
			}
		}, function(err) {
			console.error('Finished Updating Err', err);
			defered.reject(context);
		});
		return defered.promise;
	};

	var attachTabClickHandlers = function(tabSections, context) {
		var defered = q.defer();

		// Loop through each tab-section, ex: header, body, footer.
		tabSections.forEach(function(tabSection) {
			var modules = tabSection.context;

			// Loop through and attach listeners for each tab.
			modules.forEach(function(module) {
				var tabID = '#' + module.name + '-tab';
				var tab = $(tabID);
				tab.on('click', module, moduleChromeTabClickHandler);
			});
		});
		defered.resolve(tabSections, context);
		return defered.promise;
	};

	var innerUpdatePrimaryModuleListing = function(modules) {
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
		return internalUpdateModuleListing(tabSections, context)
		.then(attachTabClickHandlers);
	};
	this.updatePrimaryModuleListing = function() {
		// Get the list of modules and have the inner-function perform logic on
		// acquired data.
		return module_manager.getModulesList()
		.then(innerUpdatePrimaryModuleListing);
	};

	var internalUpdateSecondaryModuleListing = function(modules) {
		var context = {
			'modules': modules.body
		};

		var tabSections = [{
			'location': $(MODULE_CHROME_BODY_TABS_ID),
			'context': context.modules,
		}];

		// Begin execution & return a promise.
		return internalUpdateModuleListing(tabSections)
		.then(attachTabClickHandlers);
	};
	this.updateSecondaryModuleListing = function() {
		// Get the list of modules and have the inner-function perform logic on
		// acquired data.
		return module_manager.getModulesList()
		.then(internalUpdateSecondaryModuleListing);
	};
	this.updateModuleListing = function() {
		var defered = q.defer();

		// Instruct both the primary & secondary modules to update.
		var promises = [
			self.updatePrimaryModuleListing(),
			self.updateSecondaryModuleListing()
		];

		// Wait for all of the operations to complete
		q.allSettled(promises)
		.then(defered.resolve, defered.reject);
		return defered.promise;

	};

	this.allowModuleToLoad = true;
	var moduleChromeTabClickHandler = function(res) {
		// console.log('Clicked Tab', res.data.name);
		if(self.allowModuleToLoad) {
			self.allowModuleToLoad = false;
			MODULE_LOADER.loadModule(res.data)
			.then(function(res) {
				self.allowModuleToLoad = true;
				// console.log('Finished Loading Module', res.name);
				var keys = Object.keys(res);
				var i;
				for(i = 0; i < keys.length; i++) {
					res[keys[i]] = null;
					res[keys[i]] = undefined;
					delete res[keys[i]];
				}
			}, function(err) {
				self.allowModuleToLoad = true;
				console.error('Error loading module');
			});
		} else {
			console.log('Preventing module from loading');
		}
		// Query for the module's data.  Will be replaced by a function call
		// to MODULE_LOADER.
		// module_manager.loadModuleData(res.data);
	};

	this.loadStartupModule = function() {
		var defered = q.defer();

		MODULE_LOADER.loadModuleByName('device_selector')
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	this.loadModuleChrome = function() {
		var defered = q.defer();
		var context = {};

		// Render the module chrome template
		renderTemplate(
			$(MODULE_CHROME_HOLDER_ID),
			moduleChromeTemplateName,
			context
		)

		// Update the module chrome window with applicable modules
		.then(self.updateModuleListing)

		// Instruct the startup module to load, aka the device_selector
		.then(self.loadStartupModule)
		
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	this.testLoad = function() {
		self.loadModuleChrome()
		.then(function(res) {
			console.log('Template File', res);
		});
	};
	var self = this;
}

var MODULE_CHROME = new createModuleChrome();
