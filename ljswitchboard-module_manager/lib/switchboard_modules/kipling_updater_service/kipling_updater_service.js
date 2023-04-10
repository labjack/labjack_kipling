'use strict';

/* jshint undef: true, unused: true, undef: true */
/* global console, TASK_LOADER, process */
/* exported activeModule */

console.log('in kipling_updater_service.js');

const async = require('async');
const package_loader = global.package_loader;
const io_manager = package_loader.getPackage('io_manager');
const io_interface = io_manager.io_interface();
const driver = io_interface.getDriverController();
const semver = package_loader.getPackage('semver');
const modbus_map = require('ljswitchboard-modbus_map').getConstants();

const replacementOverrides = {
	'io_manager': 'IO Manager',
};
const dataOrder = [
	'Kipling',
	'Splash Screen',
	'Core',
	'Module Manager',
	'Static Files',
	'IO Manager',
];
const requiredLJMInfo = [
	{'func': 'readLibrary', 'attr': 'LJM_LIBRARY_VERSION', 'formatFunc': (val) => {
		return val.toFixed(4);
	}},
	{'func': 'readLibraryS', 'attr': 'LJM_MODBUS_MAP_CONSTANTS_FILE'},
	{'func': 'readLibraryS', 'attr': 'LJM_ERROR_CONSTANTS_FILE'},
];

function toTitleCase(str) {
	return str.replace(/\w\S*/g, function(txt) {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	});
}

function librarySorter(a, b) {
	const defaultVal = 100;

	let indexA = dataOrder.indexOf(a.name);
	if(indexA < 0) {
		indexA = defaultVal;
	}

	let indexB = dataOrder.indexOf(b.name);
	if(indexB < 0) {
		indexB = defaultVal;
	}

	if (indexA > indexB) {
		return 1;
	}
	if (indexA < indexB) {
		return -1;
	}
	return 0;
}

class KiplingUpdaterService {

	constructor() {
		console.log('Available tasks', Object.keys(TASK_LOADER.tasks));
		this.tab_notification_manager = TASK_LOADER.tasks.tab_notification_manager;
		this.update_manager = TASK_LOADER.tasks.update_manager;
		this.update_manager_events = this.update_manager.eventList;
		this.update_manager_vm = this.update_manager.vm;

		this.cachedVersionData = undefined;
		this.currentVersionData = undefined;

		this.update_manager_vm.on(
			this.update_manager_events.UPDATED_VERSION_DATA,
			(data) => this.updatedVersionData(data)
		);
	}

	getCachedLJMVersions() {
		this.update_manager_vm.getCachedLJMVersions();
	}
	getCachedKiplingVersions() {
		return this.update_manager_vm.getCachedKiplingVersions();
	}

	getOS() {
		const os ={
			'darwin': 'mac',
			'win32': 'win'
		}[process.platform];
		if(typeof(os) === 'undefined') {
			const bitType = {
				'x64': '64',
				'ia32': '32',
				'arm': 'arm'
			}[process.arch];
			return 'linux' + bitType;
		}
		return os;
	}

	getLatestVersion(appType) {
		let latestVersion = {
			'key': 'default',
			'type': 'default',
			'upgradeLink': 'https://labjack.com',
			'version': '0.0.0'
		};

		if(appType === 'ljm') {
			latestVersion.version = '0.0';
		}

		if(this.cachedVersionData) {
			const osKey = 'current_' + this.getOS();
			if(this.cachedVersionData[appType][osKey]) {
				const upgrades = this.cachedVersionData[appType][osKey];
				upgrades.forEach((upgrade) => {
					let version = upgrade.version;
					let selectedVersion = latestVersion.version;
					if(semver.valid(version)) {
						if(semver.gt(version, selectedVersion)) {
							latestVersion = upgrade;
						}
					} else {
						version = parseFloat(version);
						selectedVersion = parseFloat(selectedVersion);
						if(version > selectedVersion) {
							latestVersion = upgrade;
						}
					}
				});
			} else {
				console.warn(
					'Could not find ' + appType +' update obj',
					this.cachedVersionData[appType]
				);
			}
		}
		return latestVersion;
	}

	getLatestKiplingVersion() {
		return this.getLatestVersion('kipling');
	}

	getLatestLJMVersion() {
		return this.getLatestVersion('ljm');
	}

	checkKiplingIsOld() {
		let isOld = false;
		if(this.currentVersionData) {
			if(this.currentVersionData.kipling_data) {
				if(this.currentVersionData.kipling_data.data) {
					const currentVersion = this.currentVersionData.kipling_data.data;
					const latestVersion = this.getLatestKiplingVersion().version;

					if(semver.gt(latestVersion, currentVersion)) {
						isOld = true;
					}
				}
			}
		}
		return isOld;
	}

	checkLJMIsOld() {
		let isOld = false;
		if(this.currentVersionData) {
			if(this.currentVersionData.ljm_data) {
				if(this.currentVersionData.ljm_data.LJM_LIBRARY_VERSION) {
					const currentVersion = parseFloat(this.currentVersionData.ljm_data.LJM_LIBRARY_VERSION);
					const latestVersionStr = this.getLatestLJMVersion().version;
					const latestVersion = parseFloat(latestVersionStr);

					if(latestVersion > currentVersion) {
						isOld = true;
					}
				}
			}
		}
		return isOld;
	}

	generateDeviceMessage(cachedDevice) {
		return JSON.stringify(cachedDevice);
	}

	refreshKiplingUpdaterModuleStatus() {
		var messages = [];
		if(this.cachedVersionData) {
			if(this.checkKiplingIsOld()) {
				messages.push('New Kipling version available.');
			}
			if(this.checkLJMIsOld()) {
				messages.push('New LJM version available.');
			}
			console.log(
				'kipling_updater_service data',
				{
					'isK3Old': this.checkKiplingIsOld(),
					'isLJMOld': this.checkLJMIsOld()
			});
		}

		// console.info('Messages for device_updater_fw tab', messages);
		this.tab_notification_manager.setNotifications(
			'settings',
			messages
		);
	}

	updateKiplingWindowTitle() {
		try {
			// Update Window title name with version number & update availability.
			let msg = this.currentVersionData.versions.kipling.data;
			if(this.checkKiplingIsOld() || this.checkLJMIsOld()) {
				msg += ' (Updates Available)';
			}

			global.UPDATE_K3_WINDOW_VERSION_NUMBER_STR(msg);
		} catch(err) {

		}
	}

	updatedVersionData(versionData) {
		try {
			console.log('in kipling_updater_service updatedVersionData', versionData, this.currentVersionData);
			this.cachedVersionData = versionData;
			this.refreshKiplingUpdaterModuleStatus();
			this.updateKiplingWindowTitle();
		} catch(err) {
			console.error('Error in kipling_updater_service: updatedVersionData', err);
		}
	}

    getProgramInfo() {
    	const data = {
			'info': {},
			'packages': [],
			'versions': {},
			'ljm_data': {},
			'kipling_data': {},
			'modbus_map_data': {},
			'modbus_map_version': '',
		};

		data.info.extractionFolderName = {
			'name': 'Extracted Data Folder name',
			'data': package_loader.getExtractionPath(),
		};

		data.versions.persistentDataVersion = {
			'name': 'Persistent Data',
			'data': process.env.npm_package_persistentDataVersion,
		};

		data.versions.baseVersionData = {
			'name': 'Splash Screen',
			'data': process.env.npm_package_version,
		};

		const managedPackages = package_loader.getDependencyData();
		const packageKeys = Object.keys(managedPackages);
		packageKeys.forEach((key) => {
			let humanName = key.split('ljswitchboard-').join('');
			humanName = humanName.split('-').join(' ');
			humanName = humanName.split('_').join(' ');

			humanName = toTitleCase(humanName);

			if(replacementOverrides[key]) {
				humanName = replacementOverrides[key];
			}

			if(humanName === 'Kipling') {
				data.kipling_data = {
					'name': humanName,
					'data': managedPackages[key].version,
				};
			}
			data.versions[key] = {
				'name': humanName,
				'data': managedPackages[key].version,
			};
		});

		// console.log(JSON.stringify(data, null, 2));
		var versionKeys = Object.keys(data.versions);
		data.packages = versionKeys.map((versionKey) => {
			return data.versions[versionKey];
		});

		// Sort the packages list
		data.packages.sort(librarySorter);

		return data;
    }

    populateLJMInfo(data) {
    	return new Promise((resolve) => {
			async.eachSeries(
				requiredLJMInfo,
				(reqInfo, callback) => {
					const func = reqInfo.func;
					const attr = reqInfo.attr;
					const fmatFunc = reqInfo.formatFunc;

					if(driver[func]) {
						driver[func](attr)
						.then((ljmData) => {
							if(typeof(fmatFunc) === 'function') {
								data.ljm_data[attr] = fmatFunc(ljmData);
							} else {
								data.ljm_data[attr] = ljmData;
							}
							callback();
						}, (ljmErr) => {
							data.ljm_data[attr] = 'Error: ' + ljmErr.toString();
							callback();
						});
					} else {
						console.error('Driver function does not exist', func);
						callback();
					}
				},
				(err) => {
					if(err) {
						resolve();
					} else {
						resolve();
					}
				});
		});
    }

    async populateModbusMapInfo(data) {
    	let headerInfo = {};
    	try {
	    	const ljmHeaderRef = modbus_map.origConstants.header;
	    	headerInfo = JSON.parse(JSON.stringify(ljmHeaderRef));
	    } catch(err) {
	    	headerInfo = {
	    		'filename': '',
	    		'version': '',
	    		'support_url': 'htt-p://labjack.com',
	    	};
	    }
	    data.modbus_map_data = [
	    	{'name': 'File Name', 'data': headerInfo.filename},
	    	{'name': 'Version', 'data': headerInfo.version},
	    	{'name': 'Support URL', 'data': headerInfo.support_url},
	    ];
	    data.modbus_map_version = headerInfo.version;
    }

    async saveVersionInfo(data) {
    	// console.log("We have current version:", data);
    	const kiplingVersion = data.kipling_data.data;
    	global.UPDATE_K3_WINDOW_VERSION_NUMBER_STR(kiplingVersion);

    	this.currentVersionData = data;
    	return data;
    }

	async initializeVersionData() {
		const pageData = this.getProgramInfo();
        await this.populateLJMInfo(pageData);
		await this.populateModbusMapInfo(pageData);
		await this.saveVersionInfo(pageData);
	}
}

var kus;

this.startTask = async function(bundle) {
	console.log('Starting kipling_version_manager task');
	try {
		kus = new KiplingUpdaterService();
		await kus.initializeVersionData();
		console.log('Initialized Kipling\'s kipling updater service');
		return bundle;
	} catch (err) {
		console.error('Failed to initialize Kipling\'s kipling updater service', err);
		return bundle;
	}
};

this.getProgramInfo = async function() {
	console.log('kus', kus);

	var data = JSON.parse(JSON.stringify(kus.currentVersionData));

	var isLJMOld = kus.checkLJMIsOld();
	var availableLJMVersion = kus.getLatestLJMVersion();

	var isKiplingOld = kus.checkKiplingIsOld();
	var availableKiplingVersion = kus.getLatestKiplingVersion();

	var availableUpdates = isLJMOld || isKiplingOld;
	var updates = [];

	if(isLJMOld) {
		updates.push('LJM Library');
	}
	if(isKiplingOld) {
		updates.push('Kipling');
	}

	let updateText = 'None';
	if(updates.length === 1) {
		updateText = updates[0];
	} else if(updates.length === 2) {
		updateText = updates[0] + ' and ' + updates[1];
	}

	const pannelType = availableUpdates ? 'panel-danger' : 'panel-success';

	data.programUpdates = {
		'availableUpdates': availableUpdates,
		'updateText': updateText,
		'pannelType': pannelType,

		'isLJMOld': isLJMOld,
		'availableLJMVersion': availableLJMVersion,

		'isKiplingOld': isKiplingOld,
		'availableKiplingVersion': availableKiplingVersion,
	};

	return data;
};

