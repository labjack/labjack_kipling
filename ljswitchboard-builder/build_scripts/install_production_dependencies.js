'use strict';

require('./utils/error_catcher');

const path = require('path');
const fs = require('fs');
const child_process = require('child_process');
const labjackKiplingPackages = require('./utils/get_labjack_kipling_packages.js');
const editPackageKeys = require('./utils/edit_package_keys.js').editPackageKeys;
const {getBuildDirectory} = require('./utils/get_build_dir');

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

const ENABLE_STATUS_UPDATES = false;

const printStatus = function() {
	if (ENABLE_STATUS_UPDATES) {
		console.log('');
		console.log('');
		console.log('');
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

function installLocalProductionDependencies(name, directory) {
	return new Promise((resolve) => {
		if (DEBUG_INSTALLATION) {
			console.log('installLocalProductionDependencies', name, directory);
		}

		const pkgPath = path.join(directory, 'package.json');
		const pkgName = require(pkgPath).name;

		const packageDependencies = graph[pkgName];
		if (!packageDependencies) {
			throw new Error(`Could not find packageDependencies`);
		}

		for (const dependency of packageDependencies) {
			if (dependency in graph) {
				const depInfo = Array.prototype.find.call(packages, function(pack) {
					return (pack.name === dependency);
				});
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
				// execSync(`npm install --production ${dependencyTar}`, {
				// 	'cwd': directory,
				// });

			}
		}

		if (name === 'ljswitchboard-io_manager') {

			return new Promise((resolve1, reject) => {
				const npmCmd = `npm install ${TEMP_PUBLISH_PATH}/ljswitchboard-device_manager-1.0.0.tgz --production --loglevel silent`;
				const child = child_process.exec(npmCmd, {
					'cwd': directory
				});

				const debugStream = fs.createWriteStream(path.join(directory, 'debug.log'));
				debugStream.write(npmCmd + '\n\n');
				child.stdout.pipe(debugStream);
				child.stderr.pipe(debugStream);

				child.on('error', error => {
					console.error(error);
					console.error('Failed to execute:', npmCmd);
					console.error('Debug log location:', path.join(directory, 'debug.log'));
					reject();
				});

				child.on('exit', code => {
					if (code > 0) {
						console.error('Failed to execute:', npmCmd);
						console.error('Debug log location:', path.join(directory, 'debug.log'));
						reject();
					} else {
						resolve1();
					}
				});
			});
		}

		resolve();
	});
}

function innerInstallProductionDependency(name, directory) {
	return new Promise((resolve, reject) => {
		const npmCmd = 'npm install --production';

		const child = child_process.exec(npmCmd, {
			'cwd': directory
		});

		const debugStream = fs.createWriteStream(path.join(directory, 'debug.log'));
		debugStream.write(npmCmd + '\n\n');
		child.stdout.pipe(debugStream);
		child.stderr.pipe(debugStream);

		child.on('error', error => {
			console.error(error);
			console.error('Failed to execute:', npmCmd);
			console.error('Debug log location:', path.join(directory, 'debug.log'));
			reject();
		});

		child.on('exit', code => {
			if (code > 0) {
				console.error('Failed to execute:', npmCmd);
				console.error('Debug log location:', path.join(directory, 'debug.log'));
				reject();
			} else {
				resolve();
			}
		});

	});
}

function installProductionDependency(dependency) {
	const name = dependency.name;
	const dependency_key = dependency.key;
	const directory = dependency.directory;

	return installLocalProductionDependencies(name, directory)
		.then(function() {
			return innerInstallProductionDependency(name, directory);
		})
		.then(function() {
			installStatus[dependency_key] = true;
			printStatus();
		});
}

function installProductionDependencies() {
	printStatus();
	const promises = projectDirectories.map(installProductionDependency);

	Promise.allSettled(promises)
		.then(function() {
			console.log('Finished Installing production dependencies');
		})
		.catch(err => {
			promises.exit(1);
		});
}

installProductionDependencies();
