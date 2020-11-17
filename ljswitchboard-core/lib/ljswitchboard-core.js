'use strict';

const path = require('path');
const {handleBarsService} = require('./handlebar_service');
const {MessageFormatter} = require('./message_formatter');

exports.info = {
	'type': 'nwApp',
	'main': 'lib/index.html'
};

async function loadResources(win, static_files) {
	console.log('Loading Page Resources');

	const resourceList = [
		// CSS for bootmetro
		'libs/bootmetro/css/bootmetro.min.css',
		'libs/bootmetro/css/bootmetro-icons.min.css',
		'libs/bootmetro/css/bootmetro-responsive.min.css',
		'libs/bootmetro/css/bootmetro-ui-light.min.css',

		// CSS for bootstrap
		'libs/bootstrap/css/bootstrap.docs.min.css',
		'libs/bootstrap/css/bootstrap.min.css',

		// CSS for fixes to bootmetro & bootstrap
		'css/bootmetro.fix.css',

		// ------------------ Require js files -----------------------//
		// JS for jQuery
		'libs/jquery/jquery-1.10.2.min.js',

		// JS for bootmetro
		'libs/bootmetro/js/bootmetro.min.js',

		// JS for bootstrap
		'libs/bootstrap/js/bootstrap.min.js',

		// custom jquery ui stuff
		'libs/jquery-ui-1.10.4.custom/js/jquery-ui-1.10.4.custom.min.js',
	];
	await static_files.loadResources(win, resourceList);
}

exports.initializePackage = function (package_loader) {
	const window_manager = package_loader.getPackage('window_manager');
	const static_files = package_loader.getPackage('static_files');

	window_manager.on(window_manager.eventList.OPENED_WINDOW, async (name) => {
		if (name !== 'core') return;

		const coreWindow = window_manager.getWindow('core');
		await loadResources(coreWindow.win, static_files);

		const startDir = package_loader.getPackage('info').startDir;

		const gui = package_loader.getPackage('gui');
		const splashScreenUpdater = package_loader.getPackage('splashScreenUpdater');

		const corePackages = [
			{
				// 'name': 'ljswitchboard-static_files',
				'name': 'io_manager',
				'folderName': 'ljswitchboard-io_manager',
				'loadMethod': 'managed',
				'forceRefresh': false,
				'directLoad': true,
				'locations': [
					// Add path to files for development purposes, out of a repo.
					path.join(startDir, '..', 'ljswitchboard-io_manager'),

					// If those files aren't found, check the node_modules directory of
					// the current application for upgrades.
					path.join(startDir, 'node_modules', 'ljswitchboard-io_manager'),

					// For non-development use, check the LabJack folder/K3/downloads
					// file for upgrades.
					// TODO: Add this directory

					// If all fails, check the starting directory of the process for the
					// zipped files originally distributed with the application.
					path.join(startDir, 'resources', 'app', 'ljswitchboard-io_manager.zip'),
					path.resolve(startDir, '..', 'Resources', 'app', 'ljswitchboard-io_manager.zip'),
					path.join(startDir, 'ljswitchboard-io_manager.zip')
				]
			},
			{
				// 'name': 'ljswitchboard-static_files',
				'name': 'module_manager',
				'folderName': 'ljswitchboard-module_manager',
				'loadMethod': 'managed',
				'forceRefresh': false,
				'directLoad': true,
				'locations': [
					// Add path to files for development purposes, out of a repo.
					path.join(startDir, '..', 'ljswitchboard-module_manager'),

					// If those files aren't found, check the node_modules directory of
					// the current application for upgrades.
					path.join(startDir, 'node_modules', 'ljswitchboard-module_manager'),

					// For non-development use, check the LabJack folder/K3/downloads
					// file for upgrades.
					// TODO: Add this directory

					// If all fails, check the starting directory of the process for the
					// zipped files originally distributed with the application.
					path.join(startDir, 'resources', 'app', 'ljswitchboard-module_manager.zip'),
					path.resolve(startDir, '..', 'Resources', 'app', 'ljswitchboard-module_manager.zip'),
					path.join(startDir, 'ljswitchboard-module_manager.zip')
				]
			},
			{
				// 'name': 'ljswitchboard-core',
				'name': 'kipling',
				'folderName': 'ljswitchboard-kipling',
				'loadMethod': 'managed',
				'forceRefresh': false,
				'startApp': false,
				'directLoad': true,
				'locations': [
					// Add path to files for development purposes, out of a repo.
					path.join(startDir, '..', 'ljswitchboard-kipling'),

					// If those files aren't found, check the node_modules directory of
					// the current application for upgrades.
					path.join(startDir, 'node_modules', 'ljswitchboard-kipling'),

					// For non-development use, check the LabJack folder/K3/downloads
					// file for upgrades.
					// TODO: Add this directory

					// If all fails, check the starting directory of the process for the
					// zipped files originally distributed with the application.
					path.join(startDir, 'resources', 'app', 'ljswitchboard-kipling.zip'),
					path.resolve(startDir, '..', 'Resources', 'app', 'ljswitchboard-kipling.zip'),
					path.join(startDir, 'ljswitchboard-kipling.zip')
				]
			}
		];


		if(!!process.env.TEST_MODE || gui.App.manifest.test) {
			console.log('Adding kipling_tester');
			corePackages.splice(2,0,{
				'name': 'kipling_tester',
				'folderName': 'ljswitchboard-kipling_tester',
				'loadMethod': 'managed',
				'forceRefresh': false,
				'startApp': false,
				'directLoad': true,
				'locations': [
					// Add path to files for development purposes, out of a repo.
					path.join(startDir, '..', 'ljswitchboard-kipling_tester'),
					path.join(startDir, 'node_modules', 'ljswitchboard-kipling_tester'),
					path.join(startDir, 'resources', 'app', 'ljswitchboard-kipling_tester.zip'),
					path.resolve(startDir, '..', 'Resources', 'app', 'ljswitchboard-kipling_tester.zip'),
					path.join(startDir, 'ljswitchboard-kipling_tester.zip')
				]
			});
		}

		function checkRequirements() {
			return new Promise(async (resolve, reject) => {
				console.log('checkRequirements');
				const message_formatter = new MessageFormatter(package_loader);

				// Configure the message_formatter
				// message_formatter.configure($, $('#loadSteps'));

				// Display that the window has been initialized
				const compiledData = await message_formatter.renderTemplate({
					'result': 'passed',
					'step': 'Initialized'
				});

				const coreWindow = window_manager.getWindow('core');

				coreWindow.win.webContents.postMessage('postMessage', {
					'channel': 'message_formatter_append',
					'payload': compiledData
				});

				splashScreenUpdater.update('Verifying LJM Installation');

				const ljm_driver_checker = package_loader.getPackage('ljm_driver_checker');

				ljm_driver_checker.verifyLJMInstallation()
					.then((res) => {
						splashScreenUpdater.update('Finished Verifying LJM Installation');
						console.log('result...', res);
						const resultText = res.overallResult ? 'passed' : 'failed';
						// Display that the window has been initialized
						message_formatter.renderTemplate({
							'result': resultText,
							'step': 'Verified LJM Installation',
							'message': 'LJM Version: ' + res.ljmVersion,
							'code': JSON.stringify(res, undefined, 2)
						});
						resolve(res);
					}, (err) => {
						console.log('err...', err);
						const resultText = err.overallResult ? 'passed' : 'failed';
						// Display that the window has been initialized
						message_formatter.renderTemplate({
							'result': resultText,
							'step': 'Verifying LJM Installation',
							'message': 'LJM Version: ' + err.ljmVersion,
							'code': JSON.stringify(err, undefined, 2)
						});
						reject(err);
					});

			});
		}

		function loadCorePackages() {
			console.log('loadCorePackages');

			const message_formatter = new MessageFormatter(package_loader);

			return new Promise((resolve, reject) => {
				splashScreenUpdater.update('Loading Packages');

				corePackages.forEach((corePackage) => {
					package_loader.loadPackage(corePackage);
				});
				package_loader.runPackageManager()
					.then(async (managedPackages) => {
						console.log('Managed Packages', Object.keys(managedPackages));
						const keys = Object.keys(managedPackages);
						if (!!process.env.TEST_MODE || gui.App.manifest.test) {
							const isKiplingTesterManaged = keys.indexOf('kipling_tester');
							console.log('kipling_tester required', isKiplingTesterManaged);
						}

						let continueLaunch = true;
						for (const key of keys) {
							const curPackage = managedPackages[key];
							const resultText = curPackage.isError ? 'failed' : 'passed';
							if (curPackage.isError) {
								continueLaunch = false;
							}

							await message_formatter.renderTemplate({
								'result': resultText,
								'step': 'Loading ' + curPackage.name,
								'messages': [
									'Version: ' + curPackage.packageInfo.version,
									'Location: ' + curPackage.packageInfo.location
								],
								'code': JSON.stringify(curPackage.packageInfo, undefined, 2)
							});
						}
						splashScreenUpdater.update('Launching Kipling');

						// Instruct the window_manager to open any managed nwApps
						await window_manager.openManagedApps(managedPackages);
						resolve();
					});
			});
		}

		checkRequirements()
			.then(loadCorePackages)
			.catch(err => {
				console.error(err);
			});
	});
};

exports.handleBarsService = handleBarsService;
