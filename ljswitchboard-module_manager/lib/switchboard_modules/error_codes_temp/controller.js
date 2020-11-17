/* jshint undef: true, unused: true, undef: true */
/* global console, MODULE_LOADER, MODULE_CHROME */
/* global handlebars */
/* exported activeModule */

// console.log('in device_selector, controller.js');

var createModuleInstance = function() {
	var io_manager = global.package_loader.getPackage('io_manager');
	var io_interface = io_manager.io_interface();

	this.moduleData = undefined;
	this.debug = false;

	var toTitleCase = function (str) {
	    return str.replace(/\w\S*/g, function(txt) {
	    	return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	    });
	};

	var replacementOverrides = {
		'io_manager': 'IO Manager',
	};

	var templatesToCompile = [];
	this.templates = {};


	this.compileTemplate = function(templateName) {
        try {
            self.templates[templateName] = handlebars.compile(
                self.moduleData.htmlFiles[templateName]
            );
        } catch(err) {
            console.error(
                'Error compiling template',
                templateName,
                err
            );
        }
    };

    var dataOrder = [
    	'Kipling',
    	'Splash Screen',
    	'Core',
    	'Module Manager',
    	'Static Files',
    	'IO Manager',
    ];
    var librarySorter = function(a, b) {
    	var defaultVal = 100;

    	var indexA = dataOrder.indexOf(a.name);
    	if(indexA < 0) {
    		indexA = defaultVal;
    	}

    	var indexB = dataOrder.indexOf(b.name);
    	if(indexB < 0) {
    		indexB = defaultVal;
    	}

    	if (indexA > indexB) {
			return 1;
		}
		if (indexA < indexB) {
			return -1;
		}
		// a must be equal to b
		return 0;
    };
    this.getProgramInfo = function() {
    	var data = {
			'errors': {},
		};

		return data;
    };

    var requiredLJMInfo = [
    	{'func': 'readLibrary', 'attr': 'LJM_LIBRARY_VERSION'},
    	{'func': 'readLibraryS', 'attr': 'LJM_MODBUS_MAP_CONSTANTS_FILE'},
    	{'func': 'readLibraryS', 'attr': 'LJM_ERROR_CONSTANTS_FILE'},
    ];

    this.populateModbusMapInfo = function(data) {
    	var ljmErrors = {};
    	try {
	    	var ljmErrorsRef = modbus_map.origConstants.errors;
	    	ljmErrors = JSON.parse(JSON.stringify(ljmErrorsRef));
	    } catch(err) {
	    	ljmErrors = [];
	    }

	    data.errors = ljmErrors;

    	return Promise.resolve(data);
    };
    // Attach a pre-load step to the Module loader
    var preLoadStep = function(newModule) {
        return new Promise((resolve) => {
			var onSuccees = function (data) {
				newModule.context.pageData = data;
				resolve(newModule);
			};
			var onErr = function (data) {
				onSuccees(data);
			};

			var pageData = self.getProgramInfo();

			self.populateModbusMapInfo(pageData)
				.then(onSuccees, onErr);

		});
    };
    MODULE_LOADER.addPreloadStep(preLoadStep);

	var startModule = function(newModule) {
		// console.log('device_selector starting', newModule.name, newModule.id);
		self.moduleData = newModule.data;

		// Compile module templates
        templatesToCompile.forEach(self.compileTemplate);

		var reportedData = {
			'name': self.moduleData.name,
		};
		MODULE_CHROME.emit('MODULE_READY', reportedData);
		MODULE_LOADER.emit('MODULE_READY', reportedData);
	};
	var stopModule = function() {
		// console.log('device_selector stopped');
		// self.emit(self.eventList.MODULE_STOPPED);
	};

	// Attach to MODULE_LOADER events that indicate to the module about what to
	// do.  (start/stop).
	var mlEvents = MODULE_LOADER.eventList;
	MODULE_LOADER.on(mlEvents.VIEW_READY, startModule);
	MODULE_LOADER.on(mlEvents.UNLOAD_MODULE, stopModule);

	var self = this;
};
// util.inherits(createModuleInstance, EventEmitter);

var activeModule = new createModuleInstance();
