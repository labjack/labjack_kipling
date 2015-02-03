
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');
var q = require('q');

var unzip = require('unzip');
var semver = require('semver');

var fs = require('fs.extra');

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
			self.emit('opened_window', packageInfo.name);
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

		
		if(self.managedPackages[name]) {
			console.warn('Replacing a managed package', name);
		} else {
			// console.log('Adding a managed package', name);
		}
		self.managedPackages[name] = packageInfo;
		self.managedPackages[name].version = '';
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
				requirePackage(packageInfo);
			} else if (method === 'set') {
				setPackage(packageInfo);
			} else if (method === 'managed') {
				managePackage(packageInfo);
			}
		} catch (err) {
			console.error('package_loader: loadPackage Error', err);
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
			console.error('.zip parsing finished with error');
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
	        console.log('Finished Managing err', err);
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
        var foundValidUpgrade = bundle.availableUpgrades.some(function(upgrade) {
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
        		chosenUpgrade = upgrade;
        	}
        	return isValid;
        });
		bundle.chosenUpgrade = chosenUpgrade;
		defered.resolve(bundle);
		return defered.promise;
	};
	var determineRequiredOperations = function(bundle) {
		var defered = q.defer();
		var isCurrentValid = bundle.currentPackage.isValid;
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
			var performUpgrade = semver.lt(
				bundle.currentPackage.version,
				bundle.chosenUpgrade.version
			);
			if(performUpgrade) {
				bundle.resetPackage = true;
				bundle.performUpgrade = true;
			}
		} else {
			// If the current installation isn't valid then force it to be
			// upgraded.
			bundle.resetPackage = true;
			bundle.performUpgrade = true;

		}
		defered.resolve(bundle);
		return defered.promise;
	};
	var resetPackageDirectory = function(bundle) {
		var defered = q.defer();
		if(bundle.resetPackage) {
			fs.exists(bundle.currentPackage.location, function(exists) {
				if(exists) {
					fs.rmrf(bundle.currentPackage.location, function(err) {
						if(err) {
							console.error('Error resetPackageDirectory', err);
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
							defered.resolve(bundle);
						} else {
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
			console.log('Skipping package-reset');
			defered.resolve(bundle);
		}
		return defered.promise;
	};

	var performDirectoryUpgrade = function(bundle) {
		var defered = q.defer();
		// Save info to shorter variables
		var destinationPath = bundle.currentPackage.location;
		var upgradeFilesPath = bundle.chosenUpgrade.location;

		fs.copyRecursive(upgradeFilesPath, destinationPath, function(err) {
			if(err) {
				console.error('Error performDirectoryUpgrade', err);
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
				defered.resolve(bundle);
			} else {
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

		unzipExtractor.on('error', function(err) {
			console.error('Error performZipFileUpgrade', err);
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
			defered.resolve(bundle);
		});

		unzipExtractor.on('close', function() {
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
			var upgradePath = bundle.chosenUpgrade.location;
			var upgradeType = bundle.chosenUpgrade.type;

			// Determine what kind of upgrade process we need to perform
			if(upgradeType === 'directory') {
				performDirectoryUpgrade(bundle)
				.then(defered.resolve, defered.reject);
			} else if(upgradeType === '.zip') {
				performZipFileUpgrade(bundle)
				.then(defered.resolve, defered.reject);
			} else {
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
			console.log('Skipping upgrade');
			defered.resolve(bundle);
		}
		
		return defered.promise;
	};

	var verifyPackageUpgrade = function(bundle) {
		var defered = q.defer();
		var dirToCheck = path.join(self.extractionPath, bundle.packageInfo.folderName);
		
		checkForValidPackage(dirToCheck)
		.then(function(upgradedPackage) {
			// Save the information about the currently installed package
			bundle.upgradedPackage = upgradedPackage;

			// Also save the found version number to the managed packages
			// object and the dependencyData object.  (create it if it doesn't
			// exist).
			self.managedPackages[bundle.name].version = upgradedPackage.version;

			if(self.dependencyData[bundle.name]) {
				self.dependencyData[bundle.name].version = upgradedPackage.version;
				self.dependencyData[bundle.name].name = bundle.name;
			} else {
				self.dependencyData[bundle.name] = {};
				self.dependencyData[bundle.name].version = upgradedPackage.version;
				self.dependencyData[bundle.name].name = bundle.name;
			}

			defered.resolve(bundle);
		});

		return defered.promise;
	};
	var manageSinglePackage = function(bundle) {
		var defered = q.defer();

		var getOnErr = function(msg) {
			return function(err) {
				var innerDefered = q.defer();
				console.log('manageSinglePackage err', msg, err);
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
				'upgradedPackage': null,
				'resetPackage': false,
				'performUpgrade': false,
				'chosenUpgrade': null,
				'overallResult': false,
				'resultMessages': [],
				'isError': false
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