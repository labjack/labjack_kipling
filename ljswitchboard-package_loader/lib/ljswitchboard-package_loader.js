
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');
var q = require('q');

// Switch to using a minified local version of semver
// var semver = require('semver');
var semver = require('./semver_min');

var fs = require('fs.extra');
var fse = require('fs-extra');

var gns = 'ljswitchboard';
global[gns] = {};

var useYauzl = true;

var DEBUG_PACKAGE_EXTRACTION_STEPS = false;
function debugSteps () {
    if(DEBUG_PACKAGE_EXTRACTION_STEPS) {
        console.log.apply(console, arguments);
    }
}
function debugPackageChecking () {
    if(DEBUG_PACKAGE_EXTRACTION_STEPS) {
        console.log.apply(console, arguments);
    }
}

var EVENTS = {
	// Events emitted during the loadPackage function, they all return the
	// name of the package being handled.
	OPENED_WINDOW: 'opened_window',
	NOT_STARTING_NW_APP: 'not_starting_nw_app',
	LOADED_PACKAGE: 'loaded_package',
	NOT_LOADING_PACKAGE: 'not_loading_package',
	SET_PACKAGE: 'set_package',
	OVERWRITING_MANAGED_PACKAGE: 'overwriting_managed_package',

	// Events emitted during the runPackageManager function, they all return the
	// 'bundle' object which is all of the data currently extracted/collected 
	// for an individual packaged being managed.  Within is a packageInfo object
	// that is +- what was passed to the package_loader in the loadPackage
	// function.
	PACKAGE_MANAGEMENT_STARTED: 'package_management_started',
	VALID_UPGRADE_DETECTED: 'valid_upgrade_detected',
	NO_VALID_UPGRADE_DETECTED: 'no_valid_upgrade_detected',
	DETECTED_UNINITIALIZED_PACKAGE: 'detected_uninitialized_package',
	
	RESETTING_PACKAGE: 'resetting_package',
	FINISHED_RESETTING_PACKAGE: 'finished_resetting_package',
	FINISHED_RESETTING_PACKAGE_ERROR: 'finished_resetting_package_error',

	DETECTED_UP_TO_DATE_PACKAGE: 'detected_up_to_date_package',
	SKIPPING_PACKAGE_RESET: 'skipping_package_reset',
	SKIPPING_PACKAGE_UPGRADE: 'skipping_package_upgrade',

	STARTING_EXTRACTION: 'starting_extraction',
	STARTING_ZIP_FILE_EXTRACTION: 'starting_zip_file_extraction',
	STARTING_DIRECTORY_EXTRACTION: 'starting_directory_extraction',
	
	FINISHED_EXTRACTION: 'finished_extraction',
	FINISHED_ZIP_FILE_EXTRACTION: 'finished_zip_file_extraction',
	FINISHED_DIRECTORY_EXTRACTION: 'finished_directory_extraction',
	
	FINISHED_EXTRACTION_ERROR: 'finished_extraction_error',
	FINISHED_ZIP_FILE_EXTRACTION_ERROR: 'finished_zip_file_extraction_error',
	FINISHED_DIRECTORY_EXTRACTION_ERROR: 'finished_directory_extraction_error',

	FAILED_TO_LOAD_MANAGED_PACKAGE: 'failed_to_load_managed_package',

	FAILED_TO_INITIALIZE_PACKAGE_MANAGER: 'failed_to_initialize_package_manager',
};
exports.eventList = EVENTS;



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
exports.getNameSpace = function() {
	return gns;
};

function createPackageLoader() {
	this.extractionPath = '';
	this.managedPackages = {};
	this.managedPackagesList = [];
	this.dependencyData = {};

	// Load the package.json of the current module (ljswitchboard-package_loader)
	// to save its information in the dependencyData object incase other modules
	// require it as a dependency.
	var packageLoaderPackageInfo = require('../package.json');
	var selfName = packageLoaderPackageInfo.name;
	var selfVersion = packageLoaderPackageInfo.version;
	this.dependencyData[selfName] = {
		'name': selfName,
		'version': selfVersion
	};

	var packageInfoFileName = 'package_loader_data.json';


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

			// If desired, open the window's devTools
			if(packageInfo.showDevTools) {
				curApp.win.showDevTools();
			}

			// Emit an event indicating that a new window has been opened.
			self.emit(EVENTS.OPENED_WINDOW, packageInfo.name);
		}
	};

	var startPackage = function(packageInfo, name) {
		try {
			if(global[gns][name].info) {
				// Load the moduleData (its package.json file) & save it to info.data;
				var moduleData = getRequiredPackageData(packageInfo.location);

				// Add module path to the global.module.paths index
				var extraPaths = [
					'node_modules',
					path.join('lib', 'node_modules')
				];
				if(global[gns][name].info.type) {
					if(global[gns][name].info.type === 'library') {
						extraPaths.push('..');
					}
				}
				extraPaths.forEach(function(extraPath) {
					var dirToAdd = packageInfo.location;
					var modulesDirToAdd = path.join(dirToAdd, extraPath);
					modulesDirToAdd = path.normalize(modulesDirToAdd);
					if(global.module) {
						if(global.module.paths) {
							global.module.paths.splice(2,0,modulesDirToAdd);
						}
					}
				});
				
				global[gns][name].data = moduleData;
				if(global[gns][name].info.type) {
					if(global[gns][name].info.type === 'nwApp') {
						// Determine if the app should be started.
						var startApp = false;
						if(typeof(packageInfo.startApp) !== 'undefined') {
							if(packageInfo.startApp) {
								startApp = true;
							}
						} else {
							startApp = true;
						}

						// If desired, start the application.
						if(startApp) {
							startNWApp(packageInfo, global[gns][name].info);
						} else {
							// Emit an event indicating that we aren't
							// starting the detected nwApp
							self.emit(EVENTS.NOT_STARTING_NW_APP, packageInfo.name);
						}
					}
				}
			} else {
				console.warn('Info Object does not exist, not doing anything special', packageInfo, name);
			}
		} catch (err) {
			console.error('  - package_loader: startPackage Error', err, name);
		}
	};
	var getRequiredPackageData = function(moduleLocation) {
		var moduleData = {};
		try {
			// Build package.json path
			var moduleDataPath = path.join(moduleLocation, 'package.json');

			// Load the moduleData (its package.json file) & save it to info.data;
			moduleData = require(moduleDataPath);
		} catch(err) {
			console.error('  - Failed to load package data', err, name);
		}
		return moduleData;
	};
	var requirePackage = function(packageInfo) {
		var name = packageInfo.name;
		var location;
		var requireStr;
		var loadedPackages = Object.keys(global[gns]);
		// Make sure that we aren't over-writing a global variable by requiring
		// the new lib.
		if(loadedPackages.indexOf(name) < 0) {
			if(packageInfo.location) {
				location = packageInfo.location;
				if(packageInfo.requireStr) {
					requireStr = packageInfo.requireStr;
				} else {
					requireStr = location;
				}
				if(global.require) {
					global[gns][name] = global.require(requireStr);
					startPackage(packageInfo, name);
				} else {

					global[gns][name] = require(requireStr);
					startPackage(packageInfo, name);
				}
				global[gns][name].packageInfo = packageInfo;
				self.emit(EVENTS.LOADED_PACKAGE, packageInfo);
			}
		} else {
			self.emit(EVENTS.NOT_LOADING_PACKAGE, packageInfo);
		}
	};
	var setPackage = function(packageInfo) {
		var name = packageInfo.name;
		var location;
		var requireStr;

		if(packageInfo.ref) {
			global[gns][name] = packageInfo.ref;
			self.emit(EVENTS.SET_PACKAGE, name);
			self.emit(EVENTS.LOADED_PACKAGE, packageInfo);
		}
	};
	var managePackage = function(packageInfo) {
		var name = packageInfo.name;
		var location;
		var requireStr;

		
		if(self.managedPackages[name]) {
			self.emit(EVENTS.OVERWRITING_MANAGED_PACKAGE, packageInfo);
		} else {
			self.managedPackagesList.push(name);
			// console.log('Adding a managed package', name);
		}
		self.managedPackages[name] = packageInfo;
		self.managedPackages[name].version = '';
		self.managedPackages[name].location = '';
	};


	/**
	 * Loads packages and saves them to the global scope.  It also prepares a 
	 * list of managedPackages that have to get started separately due to their
	 * async loading requirements.
	 */
	this.loadPackage = function(packageInfo) {
		var defered = q.defer();
		try {
			var name = packageInfo.name;
			var location;
			var requireStr;
			var method = 'require';
			if(packageInfo.loadMethod) {
				method = packageInfo.loadMethod;
			}
			
			if(method === 'require') {
				try {
					requirePackage(packageInfo);
				} catch (err) {
					console.error('  - package_loader: Failed to require package', err);
				}
			} else if (method === 'set') {
				setPackage(packageInfo);
			} else if (method === 'managed') {
				managePackage(packageInfo);
			}
		} catch (err) {
			console.error('  - package_loader: loadPackage Error', err);
		}
	};

	/**
	 * Returns a list of the packages managed by the package_loader
	 */
	this.getManagedPackages = function() {
		return self.managedPackagesList;
	};
	this.getDependencyList = function() {
		return Object.keys(self.dependencyData);
	};
	this.getDependencyData = function() {
		var retData = {};
		try {
			retData = JSON.parse(JSON.stringify(self.dependencyData));
		} catch(err) {
			retData = {};
		}
		return retData;
	};
	this.deleteManagedPackage = function(name) {
		var isValid = false;
		if(self.managedPackages[name]) {
			// Delete the item from the managedPackagesList
			var newList = [];
			self.managedPackagesList.forEach(function(item) {
				if(item !== name) {
					newList.push(item);
				}
			});
			self.managedPackagesList = newList;

			self.managedPackages[name] = null;
			self.managedPackages[name] = undefined;
			delete self.managedPackages[name];

			isValid = true;
		}
		// Only delete managedObjects from the global scope & dependency obj.
		if(isValid) {
			if(self.dependencyData[name]) {
				self.dependencyData[name] = null;
				self.dependencyData[name] = undefined;
				delete self.dependencyData[name];
			}
			if(global[gns][name]) {
				global[gns][name] = null;
				global[gns][name] = undefined;
				delete global[gns][name];
			}
		}
	};
	this.deleteAllManagedPackages = function() {
		var packagesToDelete = [];
		self.managedPackagesList.forEach(function(packageToDelete) {
			packagesToDelete.push(packageToDelete);
		});

		packagesToDelete.forEach(self.deleteManagedPackage);
	};

	var initializeInfoFile = function(bundle) {
		var defered = q.defer();
		var filePath = path.normalize(path.join(
			self.extractionPath,
			packageInfoFileName
		));
		fs.writeFile(filePath, JSON.stringify({}), function(err) {
			if(err) {
				if(err.code === 'ENOENT') {
					var errPath = err.path;
					console.error('Error Initializing package_loader info file b/c of permissions', err);
					var message = '';
					message += 'Write-access required for: ' + path.dirname(errPath);
					console.error('Message:', message);
					self.emit(EVENTS.FAILED_TO_INITIALIZE_PACKAGE_MANAGER, message);
					
				} else {
					console.error('Error Initializing package_loader info file', err);
				}
				defered.resolve(bundle);
			} else {
				defered.resolve(bundle);
			}
		});
		return defered.promise;
	};
	var readInfoFile = function(defaultData) {
		var defered = q.defer();
		var filePath = path.normalize(path.join(
			self.extractionPath,
			packageInfoFileName
		));
		var finishFunc = function(fileData) {
			var parsedFileData = {};
			try {
				parsedFileData = JSON.parse(
					fileData.toString('ascii'));
				// If the file is only "{}" the obj will be 'null'.
				// force it to be an object.
				if(parsedFileData === null) {
					parsedFileData = {};
				}
				defered.resolve(parsedFileData);
			} catch(jsonParseError) {
				// Error parsing the JSON file so it should be 
				// re-initialized and assume data is invalid/what was
				// passed into the function.
				initializeInfoFile(defaultData)
				.then(defered.resolve);
			}
		};
		fs.exists(filePath, function(exists) {
			if(exists) {
				fs.readFile(filePath, function(err, fileData) {
					if(err) {
						fs.readFile(filePath, function(errB, fileData) {
							if(errB) {
								fs.readFile(filePath, function(errB, fileData) {
									if(errB) {
										initializeInfoFile(defaultData)
										.then(defered.resolve);
									} else {
										finishFunc(fileData);
									}
								});
							} else {
								finishFunc(fileData);
							}
						});
					} else {
						finishFunc(fileData);
					}
				});
			} else {
				// Error finding the file so try to re-initialize it and assume 
				// data is invalid/what was passed into the function.
				initializeInfoFile(defaultData)
				.then(defered.resolve);
			}
		});
		return defered.promise;
	};
	var writeInfoFile = function(dataToWrite) {
		var defered = q.defer();
		var filePath = path.normalize(path.join(
			self.extractionPath,
			packageInfoFileName
		));
		// Create a string that is readable.
		dataToWrite = JSON.stringify(dataToWrite, null, 2);
		fs.exists(filePath, function(exists) {
			if(exists) {
				fs.writeFile(filePath, dataToWrite, function(err) {
					if(err) {
						initializeInfoFile({})
						.then(defered.resolve);
					} else {
						defered.resolve({});
					}
				});
			} else {
				// Error finding the file so try to re-initialize it and assume 
				// data is invalid/what was passed into the function.
				initializeInfoFile({})
				.then(defered.resolve);
			}
		});
		return defered.promise;
	};

	var declarePackageInvalid = function(bundle) {
		var defered = q.defer();
		var defaultData = {};

		// Store information about packages by their folderName
		var packageName = bundle.packageInfo.folderName;

		// Read the existing file contents
		readInfoFile(defaultData)
		.then(function(data) {
			// If the packageInfo.name object dats is already there, declare the
			// validity attribute to be false.
			
			if(data[packageName]) {
				data[packageName].isValid = false;
				data[packageName].version = bundle.currentPackage.version;
			} else {
				// Otherwise, initialize it to be false.
				var initData = {
					'isValid': false,
					'name': packageName,
					'location': bundle.currentPackage.location,
					'version': bundle.currentPackage.version
				};
				data[packageName] = initData;
			}
			
			// Write the data back to the file.
			writeInfoFile(data)
			.then(function(res) {
				defered.resolve(bundle);
			});
		});
		return defered.promise;
	};
	var declarePackageValid = function(bundle) {
		var defered = q.defer();
		var defaultData = {};

		// Store information about packages by their folderName
		var packageName = bundle.packageInfo.folderName;

		// Read the existing file contents
		readInfoFile(defaultData)
		.then(function(data) {
			// If the packageInfo.name object dats is already there, declare the
			// validity attribute to be false.
			if(data[packageName]) {
				data[packageName].isValid = true;
				data[packageName].version = bundle.managedPackage.version;
			} else {
				// Otherwise, initialize it to be true.
				var initData = {
					'isValid': true,
					'name': packageName,
					'location': bundle.currentPackage.location,
					'version': bundle.managedPackage.version
				};
				data[packageName] = initData;
			}
			// Write the data back to the file.
			writeInfoFile(data)
			.then(function(res) {
				defered.resolve(bundle);
			});
		});
		return defered.promise;
	};

	var checkForExtractionErrors = function(bundle) {
		debugSteps('in checkForExtractionErrors');
		var defered = q.defer();
		var defaultData = {};

		// Information about packages is stored by their folderName.
		var packageName = bundle.packageInfo.folderName;

		// console.log('currentPackage', bundle.currentPackage)
		// Read the existing file contents
		readInfoFile(defaultData)
		.then(function(data) {
			// console.log('Read Data', data);
			// If the packageInfo.name object data is there then read the
			// isValid attribute, otherwise say that there are extraction errors.
			if(data) {
				if(data[packageName]) {
					if(data[packageName].isValid) {
						// Current Package is valid (should already be true).
					} else {
						// Current package isn't valid.
						bundle.currentPackage.isValid = false;
					}
				} else {
					// Current package isn't valid.
					bundle.currentPackage.isValid = false;
				}
			} else {
				bundle.currentPackage.isValid = false;
			}
			defered.resolve(bundle);
		});
		return defered.promise;
	};
	var checkForManagedPackageExtractionErrors = function(bundle) {
		var defered = q.defer();
		var defaultData = {};

		// Information about packages is stored by their folderName.
		var packageName = bundle.packageInfo.folderName;

		// console.log('currentPackage', bundle.currentPackage)
		// Read the existing file contents
		readInfoFile(defaultData)
		.then(function(data) {
			// console.log('Read Data', data);
			// If the packageInfo.name object data is there then read the
			// isValid attribute, otherwise say that there are extraction errors.
			if(data) {
				if(data[packageName]) {
					if(data[packageName].isValid) {
						// Current Package is valid (should already be true).
					} else {
						// Current package isn't valid.
						bundle.managedPackage.isValid = false;
					}
				} else {
					// Current package isn't valid.
					bundle.managedPackage.isValid = false;
				}
			} else {
				bundle.managedPackage.isValid = false;
			}
			defered.resolve(bundle);
		});
		return defered.promise;
	};
	var checkforExistingDirectory = function(packageInfo) {
		var defered = q.defer();
		fs.exists(packageInfo.location, function(exists) {
			packageInfo.exists = exists;
			defered.resolve(packageInfo);
		});
		return defered.promise;
	};
	var checkPackageType = function(packageInfo) {
		var defered = q.defer();
		if(packageInfo.exists) {
			fs.stat(packageInfo.location, function(err, stats) {
				if(err) {
					packageInfo.type = '';
					defered.resolve(packageInfo);
				} else {
					var isFile = stats.isFile();
					var isDirectory = stats.isDirectory();

					packageInfo.type = '';
					if(isFile) {
						packageInfo.type = path.extname(packageInfo.location);
					}
					if(isDirectory) {
						packageInfo.type = 'directory';
					}
					defered.resolve(packageInfo);
				}
			});
		} else {
			packageInfo.type = '';
			defered.resolve(packageInfo);
		}
		return defered.promise;
	};

	var getPackageVersionOfDirectory = function(packageInfo) {
		var defered = q.defer();

		var packageDataDir = path.join(packageInfo.location, 'package.json');
		var finishFunc = function(data) {
			try {
				var packageData = JSON.parse(data);
				if(packageData.version) {
					if(semver.valid(packageData.version)) {
						packageInfo.version = packageData.version;
					}
				}
				if(packageData.ljswitchboardDependencies) {
					packageInfo.dependencies = packageData.ljswitchboardDependencies;
				}
				defered.resolve(packageInfo);
			} catch(jsonParseError) {
				defered.resolve(packageInfo);
			}
		};
		fs.exists(packageDataDir, function(exists) {
			if(exists) {
				fs.readFile(packageDataDir, function(err, data) {
					if(err) {
						fs.readFile(packageDataDir, function(err, data) {
							if(err) {
								fs.readFile(packageDataDir, function(err, data) {
									if(err) {
										defered.resolve(packageInfo);
									} else {
										finishFunc(data);
									}
								});
							} else {
								finishFunc(data);
							}
						});
					} else {
						finishFunc(data);
					}
				});
			} else {
				defered.resolve(packageInfo);
			}
		});
		return defered.promise;
	};

	try {
		// var parse_with_unzip = require('./parsers/parse_with_unzip');
		// var parseWithUnzip = parse_with_unzip.parseWithUnzip;
		var parse_with_yauzl = require('./parsers/parse_with_yauzl');
		var parseWithYauzl = parse_with_yauzl.parseWithYauzl;
	} catch(err) {
		console.log('ERROR requiring parsers', err);
	}
	var getPackageVersionOfZip = function(packageInfo) {
		// return parseWithUnzip(packageInfo);
		debugPackageChecking('in getPackageVersionOfZip', packageInfo);
		return parseWithYauzl(packageInfo);
	};
	var checkPackageVersion = function(packageInfo) {
		var defered = q.defer();
		packageInfo.version = '';
		if(packageInfo.exists) {
			if(packageInfo.type === 'directory') {
				getPackageVersionOfDirectory(packageInfo)
				.then(defered.resolve);
			} else if(packageInfo.type === '.zip') {
				getPackageVersionOfZip(packageInfo)
				.then(defered.resolve);
			} else {
				defered.resolve(packageInfo);
			}
		} else {
			defered.resolve(packageInfo);
		}
		return defered.promise;
	};
	var checkPackageValidity = function(packageInfo) {
		debugPackageChecking('in checkPackageValidity');
		var defered = q.defer();

		if(packageInfo.exists) {
			if(packageInfo.type) {
				if(packageInfo.version) {
					packageInfo.isValid = true;
				}
			}
		}
		defered.resolve(packageInfo);
		return defered.promise;
	};

	var checkForValidPackage = function(location) {
		debugPackageChecking('in checkForValidPackage', location);
		var defered = q.defer();

		var packageInfo = {
			'location': location,
			'exists': null,
			'version': null,
			'type': null,
			'isValid': false,
			'dependencies': {}
		};

		checkforExistingDirectory(packageInfo)
		.then(checkPackageType)
		.then(checkPackageVersion)
		.then(checkPackageValidity)
		.then(function(info) {
			defered.resolve(info);
		});
		return defered.promise;
	};

	var checkForUpgradeOptions = function(bundle) {
		debugSteps('in checkForUpgradeOptions');

		var defered = q.defer();
		var dirsToCheck = bundle.packageInfo.locations;

		var checkDirOps = [];
		dirsToCheck.forEach(function(dir) {
			checkDirOps.push(checkForValidPackage(dir));
		});

		// Wait for all of the operations to complete
		q.allSettled(checkDirOps)
		.then(function(opgradeOptions) {
			var validUpgrades = [];

			// Loop through and pick out the valid upgrades
			opgradeOptions.forEach(function(opgradeOption) {
				if(opgradeOption.value) {
					if(opgradeOption.value.isValid) {
						validUpgrades.push(opgradeOption.value);
					}
				}
			});

			// Save the information about the currently available upgrades
			bundle.availableUpgrades = validUpgrades;
			defered.resolve(bundle);

		}, function(err) {
			console.error('  - Finished Managing err', err, bundle.name);
			defered.reject(err);
		});
		return defered.promise;
	};
	

	var checkForExistingPackage = function(bundle) {
		var defered = q.defer();
		var dirToCheck = path.join(self.extractionPath, bundle.packageInfo.folderName);
		
		checkForValidPackage(dirToCheck)
		.then(function(currentPackage) {
			// Save the information about the currently installed package
			bundle.currentPackage = currentPackage;

			// Also save the found version number to the managed packages
			// object and the dependencyData object.  (create it if it doesn't
			// exist).
			self.managedPackages[bundle.name].version = currentPackage.version;

			if(self.dependencyData[bundle.name]) {
				self.dependencyData[bundle.name].version = currentPackage.version;
				self.dependencyData[bundle.name].name = bundle.name;
			} else {
				self.dependencyData[bundle.name] = {};
				self.dependencyData[bundle.name].version = currentPackage.version;
				self.dependencyData[bundle.name].name = bundle.name;
			}

			defered.resolve(bundle);
		});

		return defered.promise;
	};

	var chooseValidUpgrade = function(bundle) {
		debugSteps('in chooseValidUpgrade');
		
		var defered = q.defer();

		var chosenUpgrade;
		// Pick the first-found package whose dependencies are met
		var foundValidUpgrade = bundle.availableUpgrades.forEach(function(upgrade) {
			var isValid = true;

			// Check to see if its dependencies are met by the objects currently
			// managed by the package_loader, aka is the data in 
			// the self.dependencyData object and are the versions compatable.
			var requirementKeys = Object.keys(upgrade.dependencies);
			requirementKeys.every(function(key) {
				// Check to see if the dependency is found
				if(typeof(self.dependencyData[key]) !== 'undefined') {
					// Make sure that the dependency has a valid version number
					if(self.dependencyData[key].version) {
						var satisfies = semver.satisfies(
							self.dependencyData[key].version,
							upgrade.dependencies[key]
							);
						if(satisfies) {
							isValid = true;
						} else {
							isValid = false;
						}
					} else {
						isValid = false;
					}
				} else {
					isValid = false;
				}
				return isValid;
			});
			// Check to make sure that the available upgrade has a valid type
			if(isValid) {
				if(upgrade.type) {
					if(upgrade.type === 'directory') {
						isValid = true;
					} else if (upgrade.type === '.zip') {
						isValid = true;
					} else {
						isValid = false;
					}
				} else {
					isValid = false;
				} 
			}
			if(isValid) {
				if(typeof(chosenUpgrade) === 'undefined') {
					// Save the selected upgrade option
					chosenUpgrade = upgrade;
				} else {
					// Only replace the chosenUpgrade obj if the newer one has a
					// newer verion number

					var isNewer = semver.lt(
						chosenUpgrade.version,
						upgrade.version
					);
					// console.log(isNewer, chosenUpgrade.version, upgrade.version, upgrade.type);
					if(isNewer) {
						chosenUpgrade = upgrade;
					}
				}
			}
		});
		if(typeof(chosenUpgrade) === 'undefined') {
			// Emit an event indicating that a valid upgrade has been
			// detected.
			self.emit(EVENTS.NO_VALID_UPGRADE_DETECTED, bundle);
		} else {
			// Emit an event indicating that a valid upgrade has been
			// detected.
			self.emit(EVENTS.VALID_UPGRADE_DETECTED, bundle);
		}
		bundle.chosenUpgrade = chosenUpgrade;
		defered.resolve(bundle);
		return defered.promise;
	};
	var determineRequiredOperations = function(bundle) {
		var defered = q.defer();
		var isCurrentValid = bundle.currentPackage.isValid;
		var isUpgradeValid = false;
		var isUpgradeAvailable = false;
		if(bundle.chosenUpgrade) {
			if(bundle.chosenUpgrade.isValid) {
				isUpgradeAvailable = true;
			}
		}


		// If there is a valid current installation then see if it needs to be
		// upgraded.
		if(isCurrentValid) {
			// Check to see if the upgrade version is newer than what is 
			// installed.
			if(isUpgradeAvailable) {
				var performUpgrade = semver.lt(
					bundle.currentPackage.version,
					bundle.chosenUpgrade.version
				);
				// If the package indicates that it should be forced to refresh
				// then handle that flag here.
				if(bundle.packageInfo.forceRefresh) {
					performUpgrade = true;
				}
				if(performUpgrade) {
					bundle.resetPackage = true;
					bundle.performUpgrade = true;
				} else {
					self.emit(EVENTS.DETECTED_UP_TO_DATE_PACKAGE, bundle);
				}
			} else {
				self.emit(EVENTS.DETECTED_UP_TO_DATE_PACKAGE, bundle);
			}
		} else {
			// If the current installation isn't valid then force it to be
			// upgraded. unless there are no valid upgrades.
			if(isUpgradeAvailable) {
				bundle.resetPackage = true;
				bundle.performUpgrade = true;

				// Emit an event indicating that an unitialized package has been 
				// detected
				self.emit(EVENTS.DETECTED_UNINITIALIZED_PACKAGE, bundle);
			} else {
				console.error('  - Detected uninitialized package w/ no upgrade options', bundle.name);
				var msg = 'Detected an uninitialized package with no upgrade ' +
				'options';
				bundle.resultMessages.push({
					'step': 'resetPackageDirectory',
					'message': msg,
					'isError': true,
				});
				bundle.overallResult = false;
				bundle.isError = true;
			}
		}
		defered.resolve(bundle);
		return defered.promise;
	};
	var performPackageReset = function(bundle) {
		var defered = q.defer();
		fs.exists(bundle.currentPackage.location, function(exists) {
		if(exists) {
			// Emit an event indicating that the package is being reset.
			self.emit(EVENTS.RESETTING_PACKAGE, bundle);
			fs.rmrf(bundle.currentPackage.location, function(err) {
				if(err) {
					console.error('  - Error resetPackageDirectory', err, bundle.name);
					var msg = 'Error resetting the package-cache, try' +
						'manually deleting the folder:' +
						bundle.currentPackage.location;
					bundle.resultMessages.push({
						'step': 'resetPackageDirectory',
						'message': msg,
						'isError': true,
						'error': JSON.stringify(err)
					});
					bundle.overallResult = false;
					bundle.isError = true;

					// Emit an event indicating that the package is 
					// finished being reset with an error.
					self.emit(EVENTS.FINISHED_RESETTING_PACKAGE_ERROR, bundle);
					
					defered.resolve(bundle);
				} else {
					// Emit an event indicating that the package is 
					// finished being reset.
					self.emit(EVENTS.FINISHED_RESETTING_PACKAGE, bundle);
					defered.resolve(bundle);
				}
			});
			
		} else {
			bundle.resultMessages.push({
				'step': 'resetPackageDirectory',
				'message': 'Package directory not deleted b/c it does not exist'
			});
			// The folder doesn't exist so don't remove it
			defered.resolve(bundle);
		}
	});
		return defered.promise;
	};

	var resetPackageDirectory = function(bundle) {
		var defered = q.defer();
		if(bundle.resetPackage) {
			declarePackageInvalid(bundle)
			.then(performPackageReset)
			.then(defered.resolve, defered.reject);
		} else {
			self.emit(EVENTS.SKIPPING_PACKAGE_RESET, bundle);
			defered.resolve(bundle);
		}
		return defered.promise;
	};

	var performDirectoryUpgrade = function(bundle) {
		var defered = q.defer();
		// Save info to shorter variables
		var destinationPath = bundle.currentPackage.location;
		var upgradeFilesPath = bundle.chosenUpgrade.location;

		// Emit events indicating that a directory extraction has started
		self.emit(EVENTS.STARTING_EXTRACTION, bundle);
		self.emit(EVENTS.STARTING_DIRECTORY_EXTRACTION, bundle);

		// fs.copyRecursive(upgradeFilesPath, destinationPath, function(err) {
			fse.copy(upgradeFilesPath, destinationPath, function(err) {
			if(err) {
				console.error('  - Error performDirectoryUpgrade', err, bundle.name);
				var msg = 'Error performing a directory upgrade.  Verify' +
				'the user-permissions for the two directories: ' + 
				upgradeFilesPath + ', and ' + destinationPath;
				bundle.resultMessages.push({
					'step': 'performDirectoryUpgrade-copyRecursive',
					'message': msg,
					'isError': true,
					'error': JSON.stringify(err)
				});
				bundle.overallResult = false;
				bundle.isError = true;
				// Emit events indicating that a zip file extraction has 
				// finished w/ an error
				self.emit(EVENTS.FINISHED_EXTRACTION_ERROR, bundle);
				self.emit(EVENTS.FINISHED_DIRECTORY_EXTRACTION_ERROR, bundle);
				defered.resolve(bundle);
			} else {
				// Emit events indicating that a directory extraction has finished
				self.emit(EVENTS.FINISHED_EXTRACTION, bundle);
				self.emit(EVENTS.FINISHED_DIRECTORY_EXTRACTION, bundle);
				
				defered.resolve(bundle);
			}
		});
		return defered.promise;
	};
	
	try {
		// var extract_with_unzip = require('./extractors/extract_with_unzip');
		// var extractWithUnzip = extract_with_unzip.extractWithUnzip;
		var extract_with_yauzl = require('./extractors/extract_with_yauzl');
		var extractWithYauzl = extract_with_yauzl.extractWithYauzl;
	} catch(err) {
		console.log('Error including extractors', err);
	}
	var performZipFileUpgrade = function(bundle) {
		// return extractWithUnzip(bundle, self, EVENTS);
		return extractWithYauzl(bundle, self, EVENTS);
	};

	var performUpgrade = function(bundle) {
		var defered = q.defer();

		if(bundle.performUpgrade) {
			// Save info to shorter variables
			var destination = bundle.currentPackage.location;
			var upgradePath = '';
			var upgradeType = '';
			if(bundle.chosenUpgrade) {
				upgradePath = bundle.chosenUpgrade.location;
				upgradeType = bundle.chosenUpgrade.type;
			}
			
			

			// Determine what kind of upgrade process we need to perform
			if(upgradeType === 'directory') {
				declarePackageInvalid(bundle)
				.then(performDirectoryUpgrade)
				.then(defered.resolve, defered.reject);
			} else if(upgradeType === '.zip') {
				declarePackageInvalid(bundle)
				.then(performZipFileUpgrade)
				.then(defered.resolve, defered.reject);
			} else {
				console.error('  - in performUpgrade, invalid upgradeType detected', bundle.name);
				var msg = 'Failed to perform upgrade, invalid upgradeType ' + 
				'detected: ' + upgradeType;
				bundle.resultMessages.push({
					'step': 'performUpgrade',
					'message': msg
				});

				// If the current installation isn't valid and we reset the
				// package directory, we have issues because we can't 
				// load/upgrade/install this library...
				var isCurrentValid = bundle.currentPackage.isValid;
				if((!isCurrentValid) && (bundle.resetPackage)) {
					bundle.overallResult = false;
					bundle.isError = true;
				}
				defered.resolve(bundle);
			}
		} else {
			self.emit(EVENTS.SKIPPING_PACKAGE_UPGRADE, bundle);
			defered.resolve(bundle);
		}
		
		return defered.promise;
	};

	var verifyPackageUpgrade = function(bundle) {
		var defered = q.defer();
		var dirToCheck = path.join(self.extractionPath, bundle.packageInfo.folderName);
		checkForValidPackage(dirToCheck)
		.then(function(managedPackage) {
			// Save the information about the currently installed package
			bundle.managedPackage = managedPackage;

			// Also save the found version number to the managed packages
			// object and the dependencyData object.  (create it if it doesn't
			// exist).
			self.managedPackages[bundle.name].version = managedPackage.version;
			self.managedPackages[bundle.name].location = managedPackage.location;

			// Also save that information to the local packageInfo object
			bundle.packageInfo.version = managedPackage.version;
			bundle.packageInfo.location = managedPackage.location;

			if(self.dependencyData[bundle.name]) {
				self.dependencyData[bundle.name].version = managedPackage.version;
				self.dependencyData[bundle.name].name = bundle.name;
			} else {
				self.dependencyData[bundle.name] = {};
				self.dependencyData[bundle.name].version = managedPackage.version;
				self.dependencyData[bundle.name].name = bundle.name;
			}

			declarePackageValid(bundle)
			.then(checkForManagedPackageExtractionErrors)
			.then(defered.resolve, defered.reject);
		});

		return defered.promise;
	};
	var extendedLoadManagedPackage = function(bundle) {
		requirePackage(bundle.packageInfo);
		bundle.packageData = getRequiredPackageData(
			bundle.packageInfo.location
		);
		bundle.packageLoaded = true;
		bundle.overallResult = true;
		return bundle;
	};
	var loadManagedPackage = function(bundle) {
		var defered = q.defer();
		// Verify that the packageManagement process went smoothly
		if(!bundle.isError) {
			if(bundle.managedPackage.isValid) {
				// If process succeeded load the package
				try {
					if(bundle.packageInfo.directLoad) {
						if(bundle.chosenUpgrade) {
							if(bundle.chosenUpgrade.type) {
								if(bundle.chosenUpgrade.type === 'directory') {
									if(bundle.chosenUpgrade.exists && bundle.chosenUpgrade.isValid) {
										bundle.packageInfo.location = bundle.chosenUpgrade.location;
									}
								}
							}
						}
					}
					bundle = extendedLoadManagedPackage(bundle);
					
				} catch(err) {
					console.error('  - Error in loadManagedPackage', err, bundle.name, err.stack);
					var errMsg = 'Error requiring managedPackage during the ' +
					'loadManagedPackage step.';
					bundle.resultMessages.push({
						'step': 'loadManagedPackage',
						'message': errMsg,
						'isError': true,
						'error': JSON.stringify(err)
					});
					bundle.overallResult = false;
					bundle.isError = true;
					self.emit(EVENTS.FAILED_TO_LOAD_MANAGED_PACKAGE, bundle);
				}
			} else {
				console.error('  - Error requiring package, detected an error via isValid', bundle.name);
				var isValidMsg = 'Error requiring managedPackage during the ' +
				'loadManagedPackage step. managedPackage is not valid';
				bundle.resultMessages.push({
					'step': 'loadManagedPackage',
					'message': isValidMsg,
					'isError': true,
					'error': 'bundle.managedPackage.isValid is not true'
				});
				bundle.overallResult = false;
				bundle.isError = true;
				self.emit(EVENTS.FAILED_TO_LOAD_MANAGED_PACKAGE, bundle);
			}
		} else {
			console.error('  - Error requiring package, detected an error via isError', bundle.name);
			var isErrorMsg = 'Error requiring managedPackage during the ' +
			'loadManagedPackage step. Previous error detected';
			bundle.resultMessages.push({
				'step': 'loadManagedPackage',
				'message': isErrorMsg,
				'isError': true,
				'error': 'bundle.isError is true, previous error detected'
			});
			bundle.overallResult = false;
			bundle.isError = true;
			self.emit(EVENTS.FAILED_TO_LOAD_MANAGED_PACKAGE, bundle);
		}
		defered.resolve(bundle);
		return defered.promise;
	};
	var getManageSinglePackage = function(bundle) {
		var manageSinglePackage = function(results) {
			var defered = q.defer();
			var getOnErr = function(msg) {
				return function(err) {
					var innerDefered = q.defer();
					console.error('manageSinglePackage err', msg, err, bundle);
					innerDefered.reject(err);
					return innerDefered.promise;
				};
			};

			// Event a message indicating that we are starting to manage a
			// package.
			self.emit(EVENTS.PACKAGE_MANAGEMENT_STARTED, bundle);

			checkForExistingPackage(bundle)
			.then(checkForUpgradeOptions, getOnErr('checkingForExistingPackage'))
			.then(chooseValidUpgrade, getOnErr('checkForUpgradeOptions'))
			.then(checkForExtractionErrors, getOnErr('chooseValidUpgrade'))
			.then(determineRequiredOperations, getOnErr('checkForExtractionErrors'))
			.then(resetPackageDirectory, getOnErr('determineRequiredOperations'))
			.then(performUpgrade, getOnErr('resetPackageDirectory'))
			.then(verifyPackageUpgrade, getOnErr('performUpgrade'))
			.then(loadManagedPackage, getOnErr('verifyPackageUpgrade'))
			.then(function(res) {
				results[res.name] = res;
				defered.resolve(results);
			}, defered.reject);
			return defered.promise;
		};
		return manageSinglePackage;
	};

	/**
	 * runPackageManager instructs the package manager to start its async
	 * loading operations to load packages.
	 * arg: packageNamesToLoad is an optional array of packageNames to load.  If
	 *     it isn't given the manager performs its operations on all managed 
	 *     packages.
	 */
	this.runPackageManager = function(packageNamesToLoad) {
		var defered = q.defer();
		var packageNames;
		if(packageNamesToLoad) {
			packageNames = packageNamesToLoad;
		} else {
			packageNames = self.getManagedPackages();
		}

		var manageOps = [];
		packageNames.forEach(function(packageName) {
			// Only add packages that aren't in the global name space;
			var gnsObjs = Object.keys(global[gns]);
			if(gnsObjs.indexOf(packageName) < 0) {
				var bundle = {
					'name': packageName,
					'packageInfo': self.managedPackages[packageName],
					'packageData': null,
					'currentPackage': null,
					'availableUpgrades': null,
					'managedPackage': null,
					'resetPackage': false,
					'performUpgrade': false,
					'chosenUpgrade': null,
					'overallResult': false,
					'resultMessages': [],
					'isError': false,
					'packageLoaded': false
				};
				// Commented out async operation
				// manageOps.push(manageSinglePackage(bundle));
				manageOps.push(getManageSinglePackage(bundle));
			}
		});

		// Wait for all of the operations to complete
		// q.allSettled(manageOps)
		// .then(function(res) {
		//     var results = {};
		//     res.forEach(function(re) {
		//     	results[re.value.name] = re.value;
		//     });
		//     defered.resolve(results);
		// }, function(err) {
		//     console.log('Finished Managing err', err);
		//     defered.reject(err);
		// });
		// Execute each operation one at a time
		if(manageOps.length > 0) {
			var results = {};
			manageOps.reduce(function(soFar, f) {
				 return soFar.then(f);
			}, q(results))
			.then(function(res) {
				// console.log('Finished Managing success!', res);
				defered.resolve(res);
			}, function(err) {
				console.log('Finished managing err', err);
				defered.reject(err);
			});
		} else {
			defered.resolve({});
		}
		return defered.promise;
	};

	/**
	 * Configures the extraction path of the package_loader.  If this hasn't
	 * been done before running the package manager it will fail as the default
	 * path is invalid.
	 */
	this.setExtractionPath = function(path) {
		self.extractionPath = path;
	};
	this.getExtractionPath = function() {
		return self.extractionPath;
	};

	var self = this;
}

util.inherits(createPackageLoader, EventEmitter);

var PACKAGE_LOADER = new createPackageLoader();


// Define the functions to be exported
exports.on = function(eventName, callback) {
	PACKAGE_LOADER.on(eventName, callback);
};
exports.loadPackage = PACKAGE_LOADER.loadPackage;
exports.setExtractionPath = PACKAGE_LOADER.setExtractionPath;

exports.getExtractionPath = PACKAGE_LOADER.getExtractionPath;
exports.getManagedPackages = PACKAGE_LOADER.getManagedPackages;
exports.getDependencyList = PACKAGE_LOADER.getDependencyList;
exports.getDependencyData = PACKAGE_LOADER.getDependencyData;

exports.deleteManagedPackage = PACKAGE_LOADER.deleteManagedPackage;
exports.deleteAllManagedPackages = PACKAGE_LOADER.deleteAllManagedPackages;
exports.runPackageManager = PACKAGE_LOADER.runPackageManager;