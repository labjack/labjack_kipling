'use strict';

require('./utils/error_catcher');

const fs = require('fs');
const path = require('path');
const labjackKiplingPackages = require('./utils/get_labjack_kipling_packages.js');
const {editPackageKeys} = require('./utils/edit_package_keys.js');
const {getBuildDirectory} = require('./utils/get_build_dir');
const {promiseExecute} = require('./utils/promise_execute');
const {readTarGzPackageJson} = require('./utils/file_operations');

const TEMP_PUBLISH_PATH = path.join(getBuildDirectory(), 'temp_publish');
const TEMP_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'temp_project_files');

const graph = labjackKiplingPackages.getAdjacencyGraph();
const packages = labjackKiplingPackages.getPackages();

const DEBUG_INSTALLATION = true;

const buildData = require('../package.json');

const kipling_dependencies = buildData.kipling_dependencies;

const projectDirectories = kipling_dependencies.map(function(kipling_dependency) {
	let key = '';
	for (let i = 0; i < 50; i++) {
		if (typeof(kipling_dependency[i]) === 'undefined') {
			key += ' ';
		} else {
			key += kipling_dependency[i];
		}
	}
	return {
		'name': kipling_dependency,
		'key': key,
		'directory': path.join(TEMP_PROJECT_FILES_PATH, kipling_dependency)
	};
});

const installStatus = {};
projectDirectories.forEach(function(dependency) {
	installStatus[dependency.key] = false;
});

const startingTime = new Date();

function getHeaderStr() {
	const outputText = [];
	const curTime = new Date();
	const curDuration = ((curTime - startingTime)/1000).toFixed(1);

	const keys = Object.keys(installStatus);
	const num = keys.length;
	let numComplete = 0;
	keys.forEach(function(key) {
		if (installStatus[key]) {
			numComplete += 1;
		}
	});
	const percentComplete = ((numComplete / num) * 100).toFixed(1);
	outputText.push('Status: ' + percentComplete + '%');
	outputText.push('Duration: '+ curDuration.toString() + ' seconds');
	return outputText;
}

const ENABLE_STATUS_UPDATES = true;

const printStatus = function(text) {
	if (ENABLE_STATUS_UPDATES) {
		console.log('');
		console.log('');
		console.log('');
		console.log(text);
		let outputText = [];
		outputText = outputText.concat(getHeaderStr());
		const keys = Object.keys(installStatus);
		outputText = outputText.concat(keys.map(function(key) {
			return key + '\t' + installStatus[key].toString();
		}));
		outputText.forEach(function(outputStr) {
			console.log(outputStr);
		});
	}
};

const alreadyInstalled = {};

async function installSubDeps(dependencies, directory) {
	if (!dependencies || Object.keys(dependencies).length === 0) {
		console.log('No dependencies');
		return Promise.resolve();
	}

	for (const dependency of Object.keys(dependencies)) {
		if (dependency in graph) {
			const depInfo = packages.find(pack => pack.name === dependency);
			const depPackageName = depInfo.name;
			const version = depInfo.version;
			const dependencyTar = path.join(
				TEMP_PUBLISH_PATH, `${depPackageName}-${version}.tgz`
			);
			// const bundle = {
			// 	'project_path': directory,
			// 	'required_keys': {
			// 		'dependencies': {
			// 		},
			// 	},
			// };
			// bundle.required_keys.dependencies[depPackageName] = dependencyTar;
			// editPackageKeys(bundle, true);

			if (alreadyInstalled[directory + dependencyTar]) {
				continue;
			}

			try {
				const dependencyPackageJson = await readTarGzPackageJson(dependencyTar);
				await installSubDeps(dependencyPackageJson.dependencies, directory);
			} catch (err) {
				console.error(err);
				throw err;
			}

			console.log(`npm install --production ${dependencyTar}`);
			try {
				await promiseExecute(`npm install -f --production ${dependencyTar}`, directory, path.join(directory, 'debug.log'));
			} catch (e) {
				const debugLog = fs.readFileSync(path.join(directory, 'debug.log'));
				console.log('debugLog:', debugLog);
			}
			alreadyInstalled[directory + dependencyTar] = true;
		}
	}

	return Promise.resolve();
}

function installLocalProductionDependencies(name, directory) {
	return new Promise(async (resolve, reject) => {
		if (DEBUG_INSTALLATION) {
			console.log('installLocalProductionDependencies', name, directory, );
		}

		const pkgPath = path.join(directory, 'package.json');
		const pkgName = require(pkgPath).name;

		const packageDependencies = graph[pkgName];
		if (!packageDependencies) {
			throw new Error(`Could not find packageDependencies`);
		}

		console.log('packageDependencies', pkgPath, packageDependencies);

		for (const dependency of packageDependencies) {
			if (dependency in graph) {
				const depInfo = packages.find(pack => pack.name === dependency);
				const depPackageName = depInfo.name;
				const version = depInfo.version;
				const dependencyTar = path.join(
					TEMP_PUBLISH_PATH, `${depPackageName}-${version}.tgz`
				);
				const bundle = {
					'project_path': directory,
					'required_keys': {
						'dependencies': {
						},
					},
				};
				bundle.required_keys.dependencies[depPackageName] = dependencyTar;
				editPackageKeys(bundle, true);

				if (DEBUG_INSTALLATION) {
					console.log(`${pkgPath} now dependent on ${dependencyTar}`);
				}

				try {
					const dependencyPackageJson = await readTarGzPackageJson(dependencyTar);
					await installSubDeps(dependencyPackageJson.dependencies, directory);
				} catch (err) {
					console.error('Error installing:', dependencyTar, err);
					reject(err);
					return;
				}

				try {
					await promiseExecute(`npm install -f --production ${dependencyTar}`, directory, path.join(directory, 'debug.log'));
				} catch (err) {
					const debugLog = fs.readFileSync(path.join(directory, 'debug.log'));
					console.log('debugLog:', debugLog);
				}
			}
		}
		resolve();
	});
}

function installProductionDependency(dependency) {
	const name = dependency.name;
	const dependency_key = dependency.key;
	const directory = dependency.directory;

	return installLocalProductionDependencies(name, directory)
		.then(function() {
			installStatus[dependency_key] = true;
			printStatus('installProductionDependency: ' + name);
		}).catch(err => {
			console.log('installProductionDependency error', err);
		});
}

function installProductionDependencies() {
	printStatus('main level');

	const promises = projectDirectories
		// .filter(dir => dir.name === 'ljswitchboard-io_manager')
		.map(installProductionDependency);

	Promise.allSettled(promises)
		.then(function() {
			if (process.env.GITHUB_RUN_ID) {
				const kipling_dependency = 'ljswitchboard-electron_main';
				const bundle = {
					'project_path': path.join(TEMP_PROJECT_FILES_PATH, kipling_dependency),
					'required_keys': {
						build_number: process.env.GITHUB_RUN_ID
					}
				};
				editPackageKeys(bundle, false);
			}
			console.log('Finished Installing production dependencies');
		})
		.catch(err => {
			console.error('Error installProductionDependencies', err);
			process.exit(1);
		});
}

installProductionDependencies();
