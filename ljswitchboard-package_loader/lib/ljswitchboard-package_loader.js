
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');

var gns = 'ljswitchboard';
global[gns] = {};

exports.setNameSpace = function(namespace) {
	global[namespace] = {};
	var curKeys = Object.keys(global[gns]);
	curKeys.forEach(function(curKey) {
		global[namespace][curKey] = global[gns][curKey];
		global[gns][curKey] = null;
		delete global[gns][curKey];
	});
	global[gns] = null;
	delete global[gns];

	gns = namespace;
};

function createPackageLoader() {

	var startNWApp = function(packageInfo, info) {
		// console.log('nwApp detected', packageInfo, info);
		if(global[gns].gui) {
			// Local reference to nw.gui
			var gui = global[gns].gui;
			var curApp = global[gns][packageInfo.name];

			// Get the module's data that should be used when opening the new window
			var newWindowData;
			if(curApp.data) {
				if(curApp.data.window) {
					newWindowData = curApp.data.window;
				}
			}

			// Build the url and moduleData path
			var windowPath = 'file:///' + path.join(packageInfo.location, info.main);

			// Open a new window and save its reference
			curApp.win = gui.Window.open(
				windowPath,
				newWindowData
			);

			self.emit('opened_window', packageInfo.name);

			// Listen for the close events
			// curApp.win.on('closed', function() {
			// 	global[gns].gui.App.quit();
			// });
		}
	};

	var startPackage = function(packageInfo, name) {
		try {
			if(global[gns][name].info) {
				try {
					// Build package.json path
					var moduleDataPath = path.join(packageInfo.location, 'package.json');

					// Load the moduleData (its package.json file) & save it to info.data;
					var moduleData = require(moduleDataPath);
					global[gns][name].data = moduleData;
				} catch(err) {
					console.error('Failed to load package data');
				}
				
				if(global[gns][name].info.type) {
					if(global[gns][name].info.type === 'nwApp') {
						startNWApp(packageInfo, global[gns][name].info);
					}
				}
			} else {
				// console.warn('Info Object does not exist, not doing anything special');
			}
		} catch (err) {
			console.error('package_loader: startPackage Error', err);
		}
	};

	var requirePackage = function(packageInfo) {
		var name = packageInfo.name;
		var location;
		var requireStr;

		if(packageInfo.location) {
			location = packageInfo.location;
			if(packageInfo.requireStr) {
				requireStr = packageInfo.requireStr;
			} else {
				requireStr = location;
			}
			try {
				if(global.require) {
					global[gns][name] = global.require(requireStr);
					startPackage(packageInfo, name);
				} else {

					global[gns][name] = require(requireStr);
					startPackage(packageInfo, name);
				}
				global[gns][name].packageInfo = packageInfo;
				self.emit('loaded_package', name);
			} catch (err) {
				console.error('package_loader: Failed to load package', err);
			}
		}
	};
	var setPackage = function(packageInfo) {
		var name = packageInfo.name;
		var location;
		var requireStr;

		if(packageInfo.ref) {
			global[gns][name] = packageInfo.ref;
			self.emit('set_package', name);
		}
	};
	var managePackage = function(packageInfo) {
		var name = packageInfo.name;
		var location;
		var requireStr;
	};

	this.loadPackage = function(packageInfo) {
		try {
			var name = packageInfo.name;
			var location;
			var requireStr;
			var method = 'require';
			if(packageInfo.loadMethod) {
				method = packageInfo.loadMethod;
			}
			
			if(method === 'require') {
				requirePackage(packageInfo);
			} else if (method === 'set') {
				setPackage(packageInfo);
			} else if (method === 'manage') {
				managePackage(packageInfo);
			}
		} catch (err) {
			console.error('package_loader: loadPackage Error', err);
		}
	};

	var self = this;
}

util.inherits(createPackageLoader, EventEmitter);

var PACKAGE_LOADER = new createPackageLoader();

exports.on = function(eventName, callback) {
	PACKAGE_LOADER.on(eventName, callback);
};
exports.loadPackage = PACKAGE_LOADER.loadPackage;