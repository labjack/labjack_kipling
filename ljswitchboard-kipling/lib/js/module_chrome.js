
console.log('in module chrome');
var path = require('path');
var q = global.require('q');
var handlebars = global.require('handlebars');
var module_manager = require('ljswitchboard-module_manager');
var fs = require('fs');

var MODULE_CHROME_HOLDER_ID = '#module_chrome_holder';
var MODULE_CHROME_HEADER_TABS_CLASS = '.module-chrome-header-tabs';
var MODULE_CHROME_FOOTER_TABS_CLASS = '.module-chrome-footer-tabs';
var MODULE_CHROME_BODY_TABS_CLASS = '.module-chrome-body-tabs';


//related to the css styling in: module_chrome.css, ".module-list li", element height + 2
var TAB_SIZING_STYLE_CLASS = '.module-list li'; // 

function createModuleChrome() {
	var documentURL;
	try {
		documentURL = document.URL.split('file:///')[1];
	} catch(err) {
		documentURL = '';
	}
	var cwd = path.dirname(documentURL);
	var moduleChromeTemplateName = 'module_chrome.html';
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
			console.log('compiled template');
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
	this.adjustModuleChromeTabSpacing = function(context) {
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
		defered.resolve(context);
		return defered.promise;
	};

	this.loadModuleChrome = function() {
		var defered = q.defer();
		var context = {
			'header_modules': module_manager.getHeaderModules(),
			'modules': module_manager.getConditionalModules(),
			'footer_modules': module_manager.getFooterModules()
		};
		renderTemplate(
			$(MODULE_CHROME_HOLDER_ID),
			moduleChromeTemplateName,
			context
		)
		.then(self.adjustModuleChromeTabSpacing)
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