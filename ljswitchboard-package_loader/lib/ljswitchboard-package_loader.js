const EventEmitter = require('events').EventEmitter;
const path = require('path');

// Switch to using a minified local version of semver
// const semver = require('semver');
const semver = require('./semver_min');

const fs = require('fs');
const fse = require('fs-extra');
const {checkForValidPackage} = require('./utils');
const {debugSteps} = require('./utils');

const extract_with_yauzl = require('./extractors/extract_with_yauzl');
const extractWithYauzl = extract_with_yauzl.extractWithYauzl;

const EVENTS = {
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

const packageInfoFileName = 'package_loader_data.json';

class PackageLoader extends EventEmitter {

	constructor() {
		super();

		this._loadedPackages = [];

		this.extractionPath = '';
		this.managedPackages = {};
		this.managedPackagesList = [];
		this.dependencyData = {};

		// Load the package.json of the current module (ljswitchboard-package_loader)
		// to save its information in the dependencyData object incase other modules
		// require it as a dependency.
		const packageLoaderPackageInfo = require('../package.json');
		const selfName = packageLoaderPackageInfo.name;
		const selfVersion = packageLoaderPackageInfo.version;
		this.dependencyData[selfName] = {
			'name': selfName,
			'version': selfVersion
		};
	}

	_startNWApp(packageInfo, info) {
		console.log('nwApp detected', packageInfo, info);
		const gui = this.getPackage('gui');

		// Local reference to nw.gui
		const curApp = this._loadedPackages[packageInfo.name];

		// Get the module's data that should be used when opening the new window
		let newWindowData;
		if (curApp.data) {
			if (curApp.data.window) {
				newWindowData = curApp.data.window;
			}
		}

		// Build the url and moduleData path
		const windowPath = 'file:///' + path.join(packageInfo.location, info.main);

		// Open a new window and save its reference
		curApp.win = gui.Window.open(
			windowPath, Object.assign({}, newWindowData, {
				webPreferences: {
					additionalArguments: [
						'--packageName=' + packageInfo.name
					]
				}
			})
		);

		// If desired, open the window's devTools
		if (packageInfo.showDevTools) {
			curApp.win.showDevTools();
		}

		// Emit an event indicating that a new window has been opened.
		this.emit(EVENTS.OPENED_WINDOW, packageInfo.name);
	}

	_startPackage(packageInfo, name) {
		const loadedPackage = this._loadedPackages[name];

		try {
			if (loadedPackage.info) {
				// Load the moduleData (its package.json file) & save it to info.data;
				const moduleData = this._getRequiredPackageData(packageInfo.location);

				// Add module path to the global.module.paths index
				const extraPaths = [
					'node_modules',
					path.join('lib', 'node_modules')
				];
				if (loadedPackage.info.type) {
					if (loadedPackage.info.type === 'library') {
						extraPaths.push('..');
					}
				}
				extraPaths.forEach((extraPath) => {
					const dirToAdd = packageInfo.location;
					const modulesDirToAdd = path.normalize(path.join(dirToAdd, extraPath));
					if (global.module) {
						if (global.module.paths) {
							global.module.paths.splice(2, 0, modulesDirToAdd);
						}
					}
				});

				loadedPackage.data = moduleData;
				if (loadedPackage.info.type) {
					if (loadedPackage.info.type === 'nwApp') {
						// Determine if the app should be started.
						let startApp = false;
						if (typeof (packageInfo.startApp) !== 'undefined') {
							if (packageInfo.startApp) {
								startApp = true;
							}
						} else {
							startApp = true;
						}

						// If desired, start the application.
						if (startApp) {
							this._startNWApp(packageInfo, loadedPackage.info);
						} else {
							// Emit an event indicating that we aren't
							// starting the detected nwApp
							this.emit(EVENTS.NOT_STARTING_NW_APP, packageInfo.name);
						}
					}
				}
			} else {
				console.warn('Info Object does not exist, not doing anything special', packageInfo, name);
			}

			if (loadedPackage.initializePackage) {
				loadedPackage.initializePackage(this);
			}
		} catch (err) {
			console.error('  - package_loader: _startPackage Error', err, name);
		}
	}

	_getRequiredPackageData(moduleLocation) {
		try {
			// Build package.json path
			const moduleDataPath = path.join(moduleLocation, 'package.json');

			// Load the moduleData (its package.json file) & save it to info.data;
			return require(moduleDataPath);
		} catch (err) {
			console.error('  - Failed to load package data', err, name);
		}
		return {};
	}

	_requirePackage(packageInfo) {
		const name = packageInfo.name;
		const loadedPackages = Object.keys(this._loadedPackages);
		// Make sure that we aren't over-writing a global variable by requiring
		// the new lib.
		if (loadedPackages.indexOf(name) < 0) {
			if (packageInfo.location) {
				let requireStr;
				const location = packageInfo.location;

				if (packageInfo.requireStr) {
					requireStr = packageInfo.requireStr;
				} else {
					requireStr = location;
				}

				if (global.require) {
					this._loadedPackages[name] = global.require(requireStr);
				} else {
					this._loadedPackages[name] = require(requireStr);
				}
				this._startPackage(packageInfo, name);

				this._loadedPackages[name].packageInfo = packageInfo;
				this.emit(EVENTS.LOADED_PACKAGE, packageInfo);
			}
		} else {
			this.emit(EVENTS.NOT_LOADING_PACKAGE, packageInfo);
		}
	}

	getPackage(name) {
		if (!this._loadedPackages[name]) {
			console.trace();
			console.error('Package ' + name + ' not found');
			throw 'Package ' + name + ' not found';
		}

		return this._loadedPackages[name];
	}

	_setPackage(packageInfo) {
		const name = packageInfo.name;

		if (packageInfo.ref) {
			this._loadedPackages[name] = packageInfo.ref;
			this.emit(EVENTS.SET_PACKAGE, name);
			this.emit(EVENTS.LOADED_PACKAGE, packageInfo);
		}
	}

	_managePackage(packageInfo) {
		const name = packageInfo.name;

		if (this.managedPackages[name]) {
			this.emit(EVENTS.OVERWRITING_MANAGED_PACKAGE, packageInfo);
		} else {
			this.managedPackagesList.push(name);
			// console.log('Adding a managed package', name);
		}
		this.managedPackages[name] = packageInfo;
		this.managedPackages[name].version = '';
		this.managedPackages[name].location = '';
	}

	/**
	 * Loads packages and saves them to the global scope.  It also prepares a
	 * list of managedPackages that have to get started separately due to their
	 * async loading requirements.
	 */
	loadPackage(packageInfo) {
		return new Promise((resolve, reject) => {
			try {
				let method = 'require';
				if (packageInfo.loadMethod) {
					method = packageInfo.loadMethod;
				}

				if (method === 'require') {
					try {
						this._requirePackage(packageInfo);
					} catch (err) {
						console.error('  - package_loader: Failed to require package', err);
					}
				} else if (method === 'set') {
					this._setPackage(packageInfo);
				} else if (method === 'managed') {
					this._managePackage(packageInfo);
				}
				resolve();
			} catch (err) {
				console.error('  - package_loader: loadPackage Error', err);
				reject();
			}
		});
	}

	/**
	 * Returns a list of the packages managed by the package_loader
	 */
	getManagedPackages() {
		return this.managedPackagesList;
	}

	getDependencyList() {
		return Object.keys(this.dependencyData);
	}

	getDependencyData() {
		try {
			return JSON.parse(JSON.stringify(this.dependencyData));
		} catch (err) {
			return {};
		}
	}

	deleteManagedPackage(name) {
		let isValid = false;
		if (this.managedPackages[name]) {
			// Delete the item from the managedPackagesList
			const newList = [];
			this.managedPackagesList.forEach((item) => {
				if (item !== name) {
					newList.push(item);
				}
			});
			this.managedPackagesList = newList;

			this.managedPackages[name] = null;
			this.managedPackages[name] = undefined;
			delete this.managedPackages[name];

			isValid = true;
		}
		// Only delete managedObjects from the global scope & dependency obj.
		if (isValid) {
			if (this.dependencyData[name]) {
				this.dependencyData[name] = null;
				this.dependencyData[name] = undefined;
				delete this.dependencyData[name];
			}
			if (this._loadedPackages[name]) {
				this._loadedPackages[name] = null;
				this._loadedPackages[name] = undefined;
				delete this._loadedPackages[name];
			}
		}
	}

	deleteAllManagedPackages() {
		const packagesToDelete = [];
		this.managedPackagesList.forEach((packageToDelete) => {
			packagesToDelete.push(packageToDelete);
		});
		packagesToDelete.forEach(this.deleteManagedPackage);
	}

	_initializeInfoFile(bundle) {
		return new Promise((resolve) => {
			const filePath = path.normalize(path.join(
				this.extractionPath,
				packageInfoFileName
			));
			fs.writeFile(filePath, JSON.stringify({}), (err) => {
				if (err) {
					if (err.code === 'ENOENT') {
						const errPath = err.path;
						console.error('Error Initializing package_loader info file b/c of permissions', err);
						const message = 'Write-access required for: ' + path.dirname(errPath);
						console.error(message);
						this.emit(EVENTS.FAILED_TO_INITIALIZE_PACKAGE_MANAGER, message);
					} else {
						console.error('Error Initializing package_loader info file', err);
					}
					resolve(bundle);
				} else {
					resolve(bundle);
				}
			});
		});
	}

	_readInfoFile(defaultData) {
		return new Promise((resolve) => {
			const filePath = path.normalize(path.join(
				this.extractionPath,
				packageInfoFileName
			));
			const finishFunc = (fileData) => {
				try {
					const parsedFileData = JSON.parse(fileData.toString('ascii'));
					// If the file is only "{}" the obj will be 'null'.
					// force it to be an object.
					if (parsedFileData === null) {
						resolve({});
						return;
					}
					resolve(parsedFileData);
				} catch (jsonParseError) {
					// Error parsing the JSON file so it should be
					// re-initialized and assume data is invalid/what was
					// passed into the function.
					this._initializeInfoFile(defaultData)
						.then(resolve);
				}
			};
			if (!fs.existsSync(filePath)) {
				// Error finding the file so try to re-initialize it and assume
				// data is invalid/what was passed into the function.
				this._initializeInfoFile(defaultData)
					.then(resolve);
				return;
			}

			try {
				const fileData = fs.readFileSync(filePath);
				finishFunc(fileData);
			} catch (err) {
				this._initializeInfoFile(defaultData)
					.then(resolve);
			}
		});
	}

	_writeInfoFile(dataToWrite) {
		return new Promise((resolve) => {
			const filePath = path.normalize(path.join(
				this.extractionPath,
				packageInfoFileName
			));
			// Create a string that is readable.
			dataToWrite = JSON.stringify(dataToWrite, null, 2);
			fs.exists(filePath, (exists) => {
				if (exists) {
					fs.writeFile(filePath, dataToWrite, (err) => {
						if (err) {
							this._initializeInfoFile({})
								.then(resolve);
						} else {
							resolve({});
						}
					});
				} else {
					// Error finding the file so try to re-initialize it and assume
					// data is invalid/what was passed into the function.
					this._initializeInfoFile({})
						.then(resolve);
				}
			});
		});
	}

	_declarePackageInvalid(bundle) {
		return new Promise((resolve) => {
			const defaultData = {};

			// Store information about packages by their folderName
			const packageName = bundle.packageInfo.folderName;

			// Read the existing file contents
			this._readInfoFile(defaultData)
				.then((data) => {
					// If the packageInfo.name object dats is already there, declare the
					// validity attribute to be false.

					if (data[packageName]) {
						data[packageName].isValid = false;
						data[packageName].version = bundle.currentPackage.version;
					} else {
						// Otherwise, initialize it to be false.
						data[packageName] = {
							'isValid': false,
							'name': packageName,
							'location': bundle.currentPackage.location,
							'version': bundle.currentPackage.version
						};
					}

					// Write the data back to the file.
					this._writeInfoFile(data)
						.then(() => {
							resolve(bundle);
						});
				});
		});
	}

	_declarePackageValid(bundle) {
		return new Promise((resolve) => {
			const defaultData = {};

			// Store information about packages by their folderName
			const packageName = bundle.packageInfo.folderName;

			// Read the existing file contents
			this._readInfoFile(defaultData)
				.then((data) => {
					// If the packageInfo.name object dats is already there, declare the
					// validity attribute to be false.
					if (data[packageName]) {
						data[packageName].isValid = true;
						data[packageName].version = bundle.managedPackage.version;
					} else {
						// Otherwise, initialize it to be true.
						data[packageName] = {
							'isValid': true,
							'name': packageName,
							'location': bundle.currentPackage.location,
							'version': bundle.managedPackage.version
						};
					}
					// Write the data back to the file.
					this._writeInfoFile(data)
						.then(() => {
							resolve(bundle);
						});
				});
		});
	}

	checkForExtractionErrors(bundle) {
		debugSteps('in checkForExtractionErrors');
		return new Promise((resolve) => {
			const defaultData = {};

			// Information about packages is stored by their folderName.
			const packageName = bundle.packageInfo.folderName;

			// console.log('currentPackage', bundle.currentPackage)
			// Read the existing file contents
			this._readInfoFile(defaultData)
				.then((data) => {
					// console.log('Read Data', data);
					// If the packageInfo.name object data is there then read the
					// isValid attribute, otherwise say that there are extraction errors.
					if (data) {
						if (data[packageName]) {
							if (data[packageName].isValid) {
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
					resolve(bundle);
				});
		});
	}

	_checkForManagedPackageExtractionErrors(bundle) {
		return new Promise((resolve) => {
			const defaultData = {};

			// Information about packages is stored by their folderName.
			const packageName = bundle.packageInfo.folderName;

			// console.log('currentPackage', bundle.currentPackage)
			// Read the existing file contents
			this._readInfoFile(defaultData)
				.then((data) => {
					// console.log('Read Data', data);
					// If the packageInfo.name object data is there then read the
					// isValid attribute, otherwise say that there are extraction errors.
					if (data) {
						if (data[packageName]) {
							if (data[packageName].isValid) {
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
					resolve(bundle);
				});
		});
	}

	checkForUpgradeOptions(bundle) {
		debugSteps('in checkForUpgradeOptions');

		return new Promise((resolve, reject) => {
			const dirsToCheck = bundle.packageInfo.locations;

			const checkDirOps = [];
			dirsToCheck.forEach((dir) => {
				checkDirOps.push(checkForValidPackage(dir));
			});

			// Wait for all of the operations to complete
			Promise.allSettled(checkDirOps)
				.then((upgradeOptions) => {
					const validUpgrades = [];

					// Loop through and pick out the valid upgrades
					upgradeOptions.forEach((upgradeOption) => {
						if (upgradeOption.value) {
							if (upgradeOption.value.isValid) {
								validUpgrades.push(upgradeOption.value);
							}
						}
					});

					// Save the information about the currently available upgrades
					bundle.availableUpgrades = validUpgrades;

					resolve(bundle);

				}, (err) => {
					console.error('  - Finished Managing err', err, bundle.name);
					reject(err);
				});
		});
	}

	checkForExistingPackage(bundle) {
		return new Promise((resolve) => {
			const dirToCheck = path.join(this.extractionPath, bundle.packageInfo.folderName);

			checkForValidPackage(dirToCheck)
				.then((currentPackage) => {
					// Save the information about the currently installed package
					bundle.currentPackage = currentPackage;

					// Also save the found version number to the managed packages
					// object and the dependencyData object.  (create it if it doesn't
					// exist).
					this.managedPackages[bundle.name].version = currentPackage.version;

					if (this.dependencyData[bundle.name]) {
						this.dependencyData[bundle.name].version = currentPackage.version;
						this.dependencyData[bundle.name].name = bundle.name;
					} else {
						this.dependencyData[bundle.name] = {};
						this.dependencyData[bundle.name].version = currentPackage.version;
						this.dependencyData[bundle.name].name = bundle.name;
					}

					resolve(bundle);
				});
		});
	}

	chooseValidUpgrade(bundle) {
		debugSteps('in chooseValidUpgrade');

		return new Promise((resolve) => {
			let chosenUpgrade;
			// Pick the first-found package whose dependencies are met
			bundle.availableUpgrades.forEach((upgrade) => {
				let isValid = true;

				// Check to see if its dependencies are met by the objects currently
				// managed by the package_loader, aka is the data in
				// the this.dependencyData object and are the versions compatible.
				const requirementKeys = Object.keys(upgrade.dependencies);
				requirementKeys.every((key) => {
					// Check to see if the dependency is found
					if (typeof (this.dependencyData[key]) !== 'undefined') {
						// Make sure that the dependency has a valid version number
						if (this.dependencyData[key].version) {
							isValid = semver.satisfies(
								this.dependencyData[key].version,
								upgrade.dependencies[key]
							);
						} else {
							isValid = false;
						}
					} else {
						isValid = false;
					}
					return isValid;
				});
				// Check to make sure that the available upgrade has a valid type
				if (isValid) {
					isValid = false;
					if (upgrade.type) {
						if (upgrade.type === 'directory' || upgrade.type === '.zip') {
							isValid = true;
						}
					}
				}
				if (isValid) {
					if (typeof (chosenUpgrade) === 'undefined') {
						// Save the selected upgrade option
						chosenUpgrade = upgrade;
					} else {
						// Only replace the chosenUpgrade obj if the newer one has a
						// newer verion number

						const isNewer = semver.lt(
							chosenUpgrade.version,
							upgrade.version
						);
						// console.log(isNewer, chosenUpgrade.version, upgrade.version, upgrade.type);
						if (isNewer) {
							chosenUpgrade = upgrade;
						}
					}
				}
			});

			if (typeof (chosenUpgrade) === 'undefined') {
				// Emit an event indicating that a valid upgrade has been
				// detected.
				this.emit(EVENTS.NO_VALID_UPGRADE_DETECTED, bundle);
			} else {
				// Emit an event indicating that a valid upgrade has been
				// detected.
				this.emit(EVENTS.VALID_UPGRADE_DETECTED, bundle);
			}

			bundle.chosenUpgrade = chosenUpgrade;
			resolve(bundle);
		});
	}

	determineRequiredOperations(bundle) {
		return new Promise((resolve) => {
			const isCurrentValid = bundle.currentPackage.isValid;
			const isUpgradeAvailable = !!(bundle.chosenUpgrade && bundle.chosenUpgrade.isValid);

			// If there is a valid current installation then see if it needs to be
			// upgraded.
			if (isCurrentValid) {
				// Check to see if the upgrade version is newer than what is
				// installed.
				if (isUpgradeAvailable) {
					let performUpgrade = semver.lt(
						bundle.currentPackage.version,
						bundle.chosenUpgrade.version
					);
					// If the package indicates that it should be forced to refresh
					// then handle that flag here.
					if (bundle.packageInfo.forceRefresh) {
						performUpgrade = true;
					}
					if (performUpgrade) {
						bundle.resetPackage = true;
						bundle.performUpgrade = true;
					} else {
						this.emit(EVENTS.DETECTED_UP_TO_DATE_PACKAGE, bundle);
					}
				} else {
					this.emit(EVENTS.DETECTED_UP_TO_DATE_PACKAGE, bundle);
				}
			} else {
				// If the current installation isn't valid then force it to be
				// upgraded. unless there are no valid upgrades.
				if (isUpgradeAvailable) {
					bundle.resetPackage = true;
					bundle.performUpgrade = true;

					// Emit an event indicating that an unitialized package has been
					// detected
					this.emit(EVENTS.DETECTED_UNINITIALIZED_PACKAGE, bundle);
				} else {
					console.error('  - Detected uninitialized package w/ no upgrade options', bundle.name);
					const msg = 'Detected an uninitialized package with no upgrade ' +
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

			resolve(bundle);
		});
	}

	_performPackageReset(bundle) {
		return new Promise((resolve) => {
			fs.exists(bundle.currentPackage.location, (exists) => {
				if (exists) {
					// Emit an event indicating that the package is being reset.
					this.emit(EVENTS.RESETTING_PACKAGE, bundle);
					fse.remove(bundle.currentPackage.location, (err) => {
						if (err) {
							console.error('  - Error resetPackageDirectory', err, bundle.name);
							const msg = 'Error resetting the package-cache, try' +
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
							this.emit(EVENTS.FINISHED_RESETTING_PACKAGE_ERROR, bundle);

							resolve(bundle);
						} else {
							// Emit an event indicating that the package is
							// finished being reset.
							this.emit(EVENTS.FINISHED_RESETTING_PACKAGE, bundle);
							resolve(bundle);
						}
					});

				} else {
					bundle.resultMessages.push({
						'step': 'resetPackageDirectory',
						'message': 'Package directory not deleted b/c it does not exist'
					});
					// The folder doesn't exist so don't remove it
					resolve(bundle);
				}
			});
		});
	}

	resetPackageDirectory(bundle) {
		return new Promise((resolve, reject) => {
			if (bundle.resetPackage) {
				this._declarePackageInvalid(bundle)
					.then(res => this._performPackageReset(res))
					.then(resolve, reject);
			} else {
				this.emit(EVENTS.SKIPPING_PACKAGE_RESET, bundle);
				resolve(bundle);
			}
		});
	}

	_performDirectoryUpgrade(bundle) {
		return new Promise((resolve) => {
			// Save info to shorter variables
			const destinationPath = bundle.currentPackage.location;
			const upgradeFilesPath = bundle.chosenUpgrade.location;

			// Emit events indicating that a directory extraction has started
			this.emit(EVENTS.STARTING_EXTRACTION, bundle);
			this.emit(EVENTS.STARTING_DIRECTORY_EXTRACTION, bundle);

			// fs.copyRecursive(upgradeFilesPath, destinationPath, function(err) {
			fse.copy(upgradeFilesPath, destinationPath, (err) => {
				if (err) {
					console.error('  - Error performDirectoryUpgrade', err, bundle.name);
					const msg = 'Error performing a directory upgrade.  Verify' +
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
					this.emit(EVENTS.FINISHED_EXTRACTION_ERROR, bundle);
					this.emit(EVENTS.FINISHED_DIRECTORY_EXTRACTION_ERROR, bundle);
					resolve(bundle);
				} else {
					// Emit events indicating that a directory extraction has finished
					this.emit(EVENTS.FINISHED_EXTRACTION, bundle);
					this.emit(EVENTS.FINISHED_DIRECTORY_EXTRACTION, bundle);

					resolve(bundle);
				}
			});
		});
	}

	_performZipFileUpgrade(bundle) {
		// return extractWithUnzip(bundle, this, EVENTS);
		return extractWithYauzl(bundle, this, EVENTS);
	}

	async performUpgrade(bundle) {
		if (bundle.performUpgrade) {
			// Save info to shorter variables
			const upgradeType = bundle.chosenUpgrade ? bundle.chosenUpgrade.type : '';

			// Determine what kind of upgrade process we need to perform
			if (upgradeType === 'directory') {
				let res = await this._declarePackageInvalid(bundle);
				res = await this._performDirectoryUpgrade(res);
				return res;
			} else if (upgradeType === '.zip') {
				return this._declarePackageInvalid(bundle)
					.then(res => this._performZipFileUpgrade(res));
			} else {
				console.error('  - in performUpgrade, invalid upgradeType detected', bundle.name, upgradeType);
				const msg = 'Failed to perform upgrade, invalid upgradeType ' +
					'detected: ' + upgradeType;
				bundle.resultMessages.push({
					'step': 'performUpgrade',
					'message': msg
				});

				// If the current installation isn't valid and we reset the
				// package directory, we have issues because we can't
				// load/upgrade/install this library...
				const isCurrentValid = bundle.currentPackage.isValid;
				if ((!isCurrentValid) && (bundle.resetPackage)) {
					bundle.overallResult = false;
					bundle.isError = true;
				}
				return bundle;
			}
		} else {
			this.emit(EVENTS.SKIPPING_PACKAGE_UPGRADE, bundle);
			return bundle;
		}
	}

	verifyPackageUpgrade(bundle) {
		return new Promise((resolve, reject) => {
			const dirToCheck = path.join(this.extractionPath, bundle.packageInfo.folderName);
			checkForValidPackage(dirToCheck)
				.then((managedPackage) => {
					// Save the information about the currently installed package
					bundle.managedPackage = managedPackage;

					// Also save the found version number to the managed packages
					// object and the dependencyData object.  (create it if it doesn't
					// exist).
					this.managedPackages[bundle.name].version = managedPackage.version;
					this.managedPackages[bundle.name].location = managedPackage.location;

					// Also save that information to the local packageInfo object
					bundle.packageInfo.version = managedPackage.version;
					bundle.packageInfo.location = managedPackage.location;

					if (this.dependencyData[bundle.name]) {
						this.dependencyData[bundle.name].version = managedPackage.version;
						this.dependencyData[bundle.name].name = bundle.name;
					} else {
						this.dependencyData[bundle.name] = {};
						this.dependencyData[bundle.name].version = managedPackage.version;
						this.dependencyData[bundle.name].name = bundle.name;
					}

					this._declarePackageValid(bundle)
						.then(res => this._checkForManagedPackageExtractionErrors(res))
						.then(resolve, reject);
				});

		});
	}

	extendedLoadManagedPackage(bundle) {
		this._requirePackage(bundle.packageInfo);
		bundle.packageData = this._getRequiredPackageData(
			bundle.packageInfo.location
		);
		bundle.packageLoaded = true;
		bundle.overallResult = true;
		return bundle;
	}

	loadManagedPackage(bundle) {
		return new Promise((resolve) => {
			// Verify that the packageManagement process went smoothly
			if (!bundle.isError) {
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
						bundle = this.extendedLoadManagedPackage(bundle);

					} catch(err) {
						console.error('  - Error in loadManagedPackage', err, bundle.name, err.stack);
						const errMsg = 'Error requiring managedPackage during the ' +
							'loadManagedPackage step.';
						bundle.resultMessages.push({
							'step': 'loadManagedPackage',
							'message': errMsg,
							'isError': true,
							'error': JSON.stringify(err)
						});
						bundle.overallResult = false;
						bundle.isError = true;
						this.emit(EVENTS.FAILED_TO_LOAD_MANAGED_PACKAGE, bundle);
					}
				} else {
					console.error('  - Error requiring package, detected an error via isValid', bundle.name);
					const isValidMsg = 'Error requiring managedPackage during the ' +
						'loadManagedPackage step. managedPackage is not valid';
					bundle.resultMessages.push({
						'step': 'loadManagedPackage',
						'message': isValidMsg,
						'isError': true,
						'error': 'bundle.managedPackage.isValid is not true'
					});
					bundle.overallResult = false;
					bundle.isError = true;
					this.emit(EVENTS.FAILED_TO_LOAD_MANAGED_PACKAGE, bundle);
				}
			} else {
				console.error('  - Error requiring package, detected an error via isError', bundle.name);
				const isErrorMsg = 'Error requiring managedPackage during the ' +
					'loadManagedPackage step. Previous error detected';
				bundle.resultMessages.push({
					'step': 'loadManagedPackage',
					'message': isErrorMsg,
					'isError': true,
					'error': 'bundle.isError is true, previous error detected'
				});
				bundle.overallResult = false;
				bundle.isError = true;
				this.emit(EVENTS.FAILED_TO_LOAD_MANAGED_PACKAGE, bundle);
			}
			resolve(bundle);
		});
	}

	async getManageSinglePackage(bundle) {
 		// Event a message indicating that we are starting to manage a
		// package.
		this.emit(EVENTS.PACKAGE_MANAGEMENT_STARTED, bundle);

		let res;

		try {
			res = await this.checkForExistingPackage(bundle);
		} catch (err) {
			console.error('manageSinglePackage err checkForExistingPackage', err);
			throw err;
		}

		try {
			res = await this.checkForUpgradeOptions(res);
		} catch (err) {
			console.error('manageSinglePackage err checkForExistingPackage', err);
			throw err;
		}

		try {
			res = await this.chooseValidUpgrade(res);
		} catch (err) {
			console.error('manageSinglePackage err chooseValidUpgrade', err);
			throw err;
		}

		try {
			res = await this.checkForExtractionErrors(res);
		} catch (err) {
			console.error('manageSinglePackage err checkForExtractionErrors', err);
			throw err;
		}

		try {
			res = await this.determineRequiredOperations(res);
		} catch (err) {
			console.error('manageSinglePackage err determineRequiredOperations', err);
			throw err;
		}

		try {
			res = await this.resetPackageDirectory(res);
		} catch (err) {
			console.error('manageSinglePackage err resetPackageDirectory', err);
			throw err;
		}

		try {
			res = await this.performUpgrade(res);
		} catch (err) {
			console.error('manageSinglePackage err performUpgrade', err);
			throw err;
		}

		try {
			res = await this.verifyPackageUpgrade(res);
		} catch (err) {
			console.error('manageSinglePackage err verifyPackageUpgrade', err);
			throw err;
		}

		try {
			res = await this.loadManagedPackage(res);
		} catch (err) {
			console.error('manageSinglePackage err loadManagedPackage', err);
			throw err;
		}

		return res;
	}

	/**
	 * runPackageManager instructs the package manager to start its async
	 * loading operations to load packages.
	 * arg: packageNamesToLoad is an optional array of packageNames to load.  If
	 *     it isn't given the manager performs its operations on all managed
	 *     packages.
	 */
	runPackageManager(packageNamesToLoad) {
		return new Promise(async (resolve, reject) => {
			const packageNames = packageNamesToLoad ? packageNamesToLoad : this.getManagedPackages();

			const bundles = [];

			packageNames.forEach((packageName) => {
				// Only add packages that aren't in the global name space;
				const gnsObjs = Object.keys(this._loadedPackages);
				if(gnsObjs.indexOf(packageName) < 0) {
					const bundle = {
						'name': packageName,
						'packageInfo': this.managedPackages[packageName],
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
					bundles.push(bundle);
				}
			});

			if (bundles.length > 0) {
				try {
					const result = {};
					for (const bundle of bundles) {
						result[bundle.name] = await this.getManageSinglePackage(bundle);
					}
					resolve(result);
				} catch (err) {
					console.error('Finished managing err', err);
					reject(err);
				}
			} else {
				resolve({});
			}
		});
	}

	/**
	 * Configures the extraction path of the package_loader.  If this hasn't
	 * been done before running the package manager it will fail as the default
	 * path is invalid.
	 */
	setExtractionPath(path) {
		this.extractionPath = path;
	}
	getExtractionPath() {
		return this.extractionPath;
	}

}

// const PACKAGE_LOADER = new PackageLoader();

exports.PackageLoader = PackageLoader;
/*

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
*/
