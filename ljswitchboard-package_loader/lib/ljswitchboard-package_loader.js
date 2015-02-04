
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');
var q = require('q');

var unzip = require('unzip');
var semver = require('semver');

var fs = require('fs.extra');

var gns = 'ljswitchboard';
global[gns] = {};

var EVENTS = {
	// Events emitted during the loadPackage function, they all return the
	// name of the package being handled.
	OPENED_WINDOW: 'opened_window',
	LOADED_PACKAGE: 'loaded_package',
	SET_PACKAGE: 'set_package',
	OVERWRITING_MANAGED_PACKAGE: 'overwriting_managed_package',

	// Events emitted during the runPackageManager function, they all return the
	// 'bundle' object which is all of the data currently extracted/collected 
	// for an individual packaged being managed.  Within is a packageInfo object
	// that is +- what was passed to the package_loader in the loadPackage
	// function.
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

			// Emit an event indicating that a new window has been opened.
			self.emit(EVENTS.OPENED_WINDOW, packageInfo.name);
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
					console.error('  - Failed to load package data', err);
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
			console.error('  - package_loader: startPackage Error', err);
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
		return Object.keys(self.managedPackages);
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
		fs.exists(packageDataDir, function(exists) {
			if(exists) {
				fs.readFile(packageDataDir, function(err, data) {
					if(err) {
						defered.resolve(packageInfo);
					} else {
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
					}
				});
			} else {
				defered.resolve(packageInfo);
			}
		});
		return defered.promise;
	};

	var getPackageVersionOfZip = function(packageInfo) {
		var defered = q.defer();

		// Create a readable stream for the .zip file
		var readZipStream = fs.createReadStream(packageInfo.location);

		// Create an unzip parsing stream that will get piped the readable 
		// stream data.
		var parseZipStream = unzip.Parse();

		var foundPackageJsonFile = false;
		var packageString = '';

		// Define a function that saves the streamed package.json data to a 
		// string.
		var savePackageData = function(chunk) {
			packageString += chunk.toString('ascii');
		};

		// Define a function to be called when the .json file is finished being
		// parsed.
		var finishedReadingPackageData = function() {
			var data = JSON.parse(packageString);
			if(data.version) {
				if(semver.valid(data.version)) {
					packageInfo.version = data.version;
				}
			}
			if(data.ljswitchboardDependencies) {
				packageInfo.dependencies = data.ljswitchboardDependencies;
			}
			defered.resolve(packageInfo);
		};

		// Attach a variety of event listeners to the parse stream
		parseZipStream.on('entry', function(entry) {
			// console.log('Zip Info', entry.path);
			if(entry.path === 'package.json') {
				foundPackageJsonFile = true;
				entry.on('data', savePackageData);
				entry.on('end', finishedReadingPackageData);
			} else {
				entry.autodrain();
			}
		});
		parseZipStream.on('error', function(err) {
			console.error('  - .zip parsing finished with error', err);
			if(!foundPackageJsonFile) {
				defered.resolve(packageInfo);
			}
		});
		parseZipStream.on('close', function() {
			if(!foundPackageJsonFile) {
				defered.resolve(packageInfo);
			}
		});

		// Pipe the readStream into the parseStream
		readZipStream.pipe(parseZipStream);
		return defered.promise;
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
	        console.error('  - Finished Managing err', err);
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
		var defered = q.defer();

		var chosenUpgrade;
		// Pick the first-found package whose dependencies are met
        var foundValidUpgrade = bundle.availableUpgrades.forEach(function(upgrade) {
        	var isValid = true;

        	// Check to see if its dependencies are met by the objects currently
        	// managed by the package_loader, aka is the data in 
        	// the self.dependencyData object and are the versions compatable.
        	var requirementKeys = Object.keys(upgrade.dependencies);
        	requirementKeys.forEach(function(key) {
        		// Check to see if the dependency is found
        		if(self.dependencyData[key]) {
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
				console.error('  - Detected uninitialized package w/ no upgrade options');
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
	var resetPackageDirectory = function(bundle) {
		var defered = q.defer();
		if(bundle.resetPackage) {
			fs.exists(bundle.currentPackage.location, function(exists) {
				if(exists) {
					// Emit an event indicating that the package is being reset.
					self.emit(EVENTS.RESETTING_PACKAGE, bundle);
					fs.rmrf(bundle.currentPackage.location, function(err) {
						if(err) {
							console.error('  - Error resetPackageDirectory', err);
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

		fs.copyRecursive(upgradeFilesPath, destinationPath, function(err) {
			if(err) {
				console.error('  - Error performDirectoryUpgrade', err);
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
	
	var performZipFileUpgrade = function(bundle) {
		var defered = q.defer();
		var destinationPath = bundle.currentPackage.location;
		var upgradeZipFilePath = bundle.chosenUpgrade.location;

		var archiveStream = fs.createReadStream(upgradeZipFilePath);
		var unzipExtractor = unzip.Extract({ path: destinationPath });

		// Emit events indicating that a zip file extraction has started
		self.emit(EVENTS.STARTING_EXTRACTION, bundle);
		self.emit(EVENTS.STARTING_ZIP_FILE_EXTRACTION, bundle);
		
		unzipExtractor.on('error', function(err) {
			console.error('  - Error performZipFileUpgrade', err);
			var msg = 'Error performing a .zip file upgrade.  Verify ' +
			'the user-permissions for the directory and .zip file: ' + 
			upgradeZipFilePath + ', and ' + destinationPath;
			bundle.resultMessages.push({
				'step': 'performDirectoryUpgrade-copyRecursive',
				'message': msg,
				'isError': true,
				'error': JSON.stringify(err)
			});
			bundle.overallResult = false;
			bundle.isError = true;

			// Emit events indicating that a zip file extraction has finished
			// w/ an error
			self.emit(EVENTS.FINISHED_EXTRACTION_ERROR, bundle);
			self.emit(EVENTS.FINISHED_ZIP_FILE_EXTRACTION_ERROR, bundle);
			defered.resolve(bundle);
		});

		unzipExtractor.on('close', function() {
			// Emit events indicating that a zip file extraction has finished
			self.emit(EVENTS.FINISHED_EXTRACTION, bundle);
			self.emit(EVENTS.FINISHED_ZIP_FILE_EXTRACTION, bundle);
			defered.resolve(bundle);
		});
		archiveStream.pipe(unzipExtractor);
		return defered.promise;
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
				performDirectoryUpgrade(bundle)
				.then(defered.resolve, defered.reject);
			} else if(upgradeType === '.zip') {
				performZipFileUpgrade(bundle)
				.then(defered.resolve, defered.reject);
			} else {
				console.error('  - in performUpgrade, invalid upgradeType detected');
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

			defered.resolve(bundle);
		});

		return defered.promise;
	};
	var loadManagedPackage = function(bundle) {
		var defered = q.defer();
		// Verify that the packageManagement process went smoothly
		if(!bundle.isError) {
			if(bundle.managedPackage.isValid) {
				// If process succeeded load the package
				try {
					requirePackage(bundle.packageInfo);
					bundle.packageLoaded = true;
					bundle.overallResult = true;
				} catch(err) {
					console.error('  - Error in loadManagedPackage', err);
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
				console.error('  - Error requiring package, detected an error via isValid');
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
			console.error('  - Error requiring package, detected an error via isError');
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
	var manageSinglePackage = function(bundle) {
		var defered = q.defer();

		var getOnErr = function(msg) {
			return function(err) {
				var innerDefered = q.defer();
				console.log('manageSinglePackage err', msg, err, bundle);
				innerDefered.reject(err);
				return innerDefered.promise;
			};
		};

		checkForExistingPackage(bundle)
		.then(checkForUpgradeOptions, getOnErr('checkingForExistingPackage'))
		.then(chooseValidUpgrade, getOnErr('checkForUpgradeOptions'))
		.then(determineRequiredOperations, getOnErr('chooseValidUpgrade'))
		.then(resetPackageDirectory, getOnErr('determineRequiredOperations'))
		.then(performUpgrade, getOnErr('resetPackageDirectory'))
		.then(verifyPackageUpgrade, getOnErr('performUpgrade'))
		.then(loadManagedPackage, getOnErr('verifyPackageUpgrade'))
		.then(defered.resolve, defered.reject);
		return defered.promise;
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
			var bundle = {
				'name': packageName,
				'packageInfo': self.managedPackages[packageName],
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
			manageOps.push(manageSinglePackage(bundle));
		});

		// Wait for all of the operations to complete
	    q.allSettled(manageOps)
	    .then(function(res) {
	        var results = {};
	        res.forEach(function(re) {
	        	results[re.value.name] = re.value;
	        });
	        defered.resolve(results);
	    }, function(err) {
	        console.log('Finished Managing err', err);
	        defered.reject(err);
	    });
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
exports.runPackageManager = PACKAGE_LOADER.runPackageManager;