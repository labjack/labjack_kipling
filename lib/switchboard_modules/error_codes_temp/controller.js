
/* jshint undef: true, unused: true, undef: true */
/* global global, require, console, MODULE_LOADER, MODULE_CHROME, createDeviceSelectorViewGenerator */
/* global handlebars, process, modbus_map */
/* exported activeModule */

// console.log('in device_selector, controller.js');


var package_loader;
var q;
var gns;
var io_manager;
var driver_const;
var async;
try {
	package_loader = global.require.main.require('ljswitchboard-package_loader');
	q = global.require.main.require('q');
	gns = package_loader.getNameSpace();
	io_manager = global.require.main.require('ljswitchboard-io_manager');
	driver_const = global.require('ljswitchboard-ljm_driver_constants');
	async = global.require('async');
} catch(err) {
	package_loader = require.main.require('ljswitchboard-package_loader');
	q = require.main.require('q');
	gns = package_loader.getNameSpace();
	io_manager = require.main.require('ljswitchboard-io_manager');
	driver_const = require.main.require('ljswitchboard-ljm_driver_constants');
	async = require.main.require('async');
}

var createModuleInstance = function() {
	var io_manager = global[gns].io_manager;
	var io_interface = io_manager.io_interface();
	var driver = io_interface.getDriverController();


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
    	var defered = q.defer();
    	var ljmErrors = {};
    	try {
	    	var ljmErrorsRef = modbus_map.origConstants.errors;
	    	ljmErrors = JSON.parse(JSON.stringify(ljmErrorsRef));
	    } catch(err) {
	    	ljmErrors = [];
	    }

	    data.errors = ljmErrors;

    	defered.resolve(data);
    	return defered.promise;
    };
    // Attach a pre-load step to the Module loader
    var preLoadStep = function(newModule) {
        var defered = q.defer();

        var onSuccees = function(data) {
        	newModule.context.pageData = data;
        	defered.resolve(newModule);
        };
        var onErr = function(data) {
        	onSuccees(data);
        };

        var pageData = self.getProgramInfo();
        
        self.populateModbusMapInfo(pageData)
        .then(onSuccees, onErr);

        return defered.promise;
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