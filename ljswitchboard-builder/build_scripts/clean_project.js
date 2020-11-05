'use strict';

const fs = require('fs');
const fsex = require('fs.extra');
const path = require('path');
const {getBuildDirectory} = require('./utils/get_build_dir');

const DIRECTORY_OFFSET = path.normalize(path.join(getBuildDirectory(), 'temp_project_files'));

const DEBUG_DIRECTORY_SEARCHING = false;
const PRINT_FILES_BEING_DELETED = false;
const PERFORM_DELETES = true;

const stdFilesToDelete = [
	'.editorconfig',
	'.eslintignore',
	'.jshintignore',
	'.jshintrc',
	'.npmignore',
	'.travis.yml',
	'bower.json',
	'component.json',
	'CHANGELOG.md',
	'CONTRIBUTING.md',
	'HISTORY.md',
	'Makefile',
	'readme.md',
	'Readme.md',
	'README.md',
	'test.js',
	'.gitmodules',		// New 9/8/2016
	'.gitattributes',	// New 9/8/2016
	'.jscsrc',			// New 9/8/2016
	'Makefile',			// New 9/8/2016
	'History.md',		// New 9/8/2016
	'AUTHORS',			// New 9/8/2016
	'AUTHORS.md',			// New 9/8/2016
	'CHANGES.md',		// New 9/8/2016
	'ChangeLog',		// New 9/8/2016
	'.eslintrc',		// New 9/8/2016
	'.jscs.json',		// New 9/8/2016
	'Makefile.deps',	// New 9/8/2016
	'Makefile.targ',	// New 9/8/2016
	'appveyor.yml',	// New 9/8/2016
	'example.html',	// New 9/8/2016
	'example.js',	// New 9/8/2016
	'jsdoc.json',	// New 9/8/2016
];

const stdFoldersToDelete = [
	'benchmark',
	'bin',
	'example',
	'examples',		// New 9/8/2016
	'images',
	'test',
	'tests',		// New 9/8/2016
	'support',		// New 9/8/2016
	'scripts',		// New 9/8/2016
	'doc',		// New 9/8/2016
	'docs',		// New 9/8/2016
];

const createStdCleanModules = function(names) {
	const obj = {};
	names.forEach(function(name) {
		obj[name] = {};
		obj[name].filesToDelete = stdFilesToDelete;
		obj[name].foldersToDelete = stdFoldersToDelete;
	});
	return obj;
};


const filesToDelete = {
    'ljswitchboard-core': {
		'foldersToDelete': ['test'],
		'node_modules': {
			'foldersToDelete': ['.bin'],
		},
	},
	'ljswitchboard-kipling': {
		'foldersToDelete': ['test'],
		'node_modules': {
			'foldersToDelete': ['.bin'],
		},
	},
	'ljswitchboard-kipling_tester': {
		'foldersToSave': ['test', 'node_modules', 'lib'],
		'filesToSave': ['README.md', 'LICENSE', 'package.json'],
		'node_modules': {
			'foldersToDelete': ['.bin'],
		},
	},
    'ljswitchboard-static_files': {
		'node_modules': {
			'foldersToDelete': ['.bin'],
		},
	},
	'ljswitchboard-electron_main': {
		'node_modules': {
			'foldersToDelete': ['.bin', 'dist'],
		},
	},
	'ljswitchboard-electron_splash_screen': {
		'node_modules': {
			'foldersToDelete': ['.bin'],
		},
	},
	'ljswitchboard-module_manager': {
		'foldersToDelete': ['test'],
		'node_modules': {
			'foldersToDelete': ['.bin'],
		},
	},
	'ljswitchboard-io_manager': {
		'foldersToDelete': ['test', '.bin'],
		'node_modules': {
			'foldersToDelete': ['.bin'],
			'ffi': {
				'filesToSave': ['LICENSE', 'package.json',],
				'foldersToSave': ['build', 'lib', 'node_modules'],
				'build': {
					'filesToSave': ['config.gypi',],
					'foldersToSave': ['Release',],
					'Release': {
						'filesToSave': ['ffi_bindings.node',]
					}
				}
			},
			'ref': {
				'filesToSave': ['LICENSE', 'package.json'],
				'foldersToSave': ['build', 'lib', 'node_modules'],
				'build': {
					'filesToSave': ['config.gypi',],
					'foldersToSave': ['Release',],
					'Release': {
						'filesToSave': ['binding.node',]
					}
				}
			},
			'javascript-natural-sort': {
				'filesToDelete': ['index.html', 'speed-tests.html', 'unit-tests.html', '.gitattributes'],
				'foldersToDelete': ['.idea']
			},
			'ljswitchboard-ljm_device_curator': {
				'filesToDelete': ['.npmignore'],
				'foldersToDelete': ['test'],
				// 'node_modules': {
				// 	'foldersToDelete': ['.bin'],
				// 	'mathjs': {
				// 		'filesToDelete': ['CONTRIBUTING.md', 'HISTORY.md', 'NOTICE', 'README.md', 'ROADMAP.md'],
				// 		'foldersToDelete': ['test', 'examples', 'docs', 'bin', 'dist']
				// 	}
				// }
			},
			// 'lodash': {
			// 	'filesToSave': ['package.json', 'lodash.js', 'index.js'],
			// 	'foldersToSave': ['lib', 'node_modules'],
			// },
			'cheerio': {
				'filesToDelete': [],
				'foldersToDelete': [],
			},
			'json-schema': {
				'filesToDelete': ['draft-zyp-json-schema-03.xml', 'draft-zyp-json-schema-04.xml'],
				'foldersToDelete': ['draft-00','draft-01','draft-02','draft-03','draft-04'],
			},
			'nan': {
				'filesToSave': [],
				'foldersToSave': [],
			},
			'sprintf-js': {
				'filesToSave': ['package.json', 'LICENSE'],
				'foldersToSave': ['src'],
			},
			'sshpk': {
				'filesToDelete': [],
				'foldersToDelete': ['man'],
			},
		}
	}
};

// Code that adds more cleaning requests...
// const requestModulesToClean = createStdCleanModules([
// 	'aws-sign2',
// 	'bl',
// 	'caseless',
// 	'combined-stream',
// 	'forever-agent',
// 	'form-data',
// 	'har-validator',
// 	'hawk',
// 	'http-signature',
// 	'isstream',
// 	'json-stringify-safe',
// 	'mime-types',
// 	'node-uuid',
// 	'oauth-sign',
// 	'qs',
// 	'stringstream',
// 	'tough-cookie',
// 	'tunnel-agent',
// ]);
// const keys_requestModulesToClean = Object.keys(requestModulesToClean);
// keys_requestModulesToClean.forEach(function(key) {
// 	const obj = requestModulesToClean[key];

// 	filesToDelete['ljswitchboard-io_manager'].node_modules[key] = obj;
// });

function normalizeAndJoin(dirA, dirB) {
	// console.log('HERE', dirA, dirB);
	return path.normalize(path.join.apply(this, arguments));
}


// Get a list of the project parts
const buildData = require('../package.json');
const kipling_parts = buildData.kipling_dependencies;
kipling_parts.forEach(function(kipling_part) {
	const kiplingPartPath = normalizeAndJoin(DIRECTORY_OFFSET, kipling_part);
	const kiplingPartNMPath = normalizeAndJoin(kiplingPartPath, 'node_modules');


	let kiplingPartDeps = [];

	if (fs.existsSync(kiplingPartNMPath)) { // static_files.zip doesn't contain node_modules
		try {
			kiplingPartDeps = fs.readdirSync(kiplingPartNMPath);
		} catch(err) {
			console.error('Error reading current directory', kiplingPartNMPath);
			console.error(err);
			kiplingPartDeps = [];
		}
	}
	// console.log('Kipling Part:', kipling_part);
	// console.log('Kipling Part Deps:', kiplingPartDeps);

	const stdCleanModulesObj = createStdCleanModules(kiplingPartDeps);

	if(typeof(filesToDelete[kipling_part]) === 'undefined') {
		filesToDelete[kipling_part] = {
			'node_modules': stdCleanModulesObj,
		};
	} else {
		const stdCleanModulesObjKeys = Object.keys(stdCleanModulesObj);
		stdCleanModulesObjKeys.forEach(function(key) {
			const obj = stdCleanModulesObj[key];
			const newFilesToDelete = obj.filesToDelete;
			const newFoldersToDelete = obj.foldersToDelete;

			if(typeof(filesToDelete[kipling_part].node_modules[key]) === 'undefined') {
				filesToDelete[kipling_part].node_modules[key] = obj;
			} else {
				const mFilesToDelete = filesToDelete[kipling_part].node_modules[key].filesToDelete;
				const mFoldersToDelete = filesToDelete[kipling_part].node_modules[key].foldersToDelete;
				if(typeof(mFilesToDelete) !== 'undefined') {
					filesToDelete[kipling_part].node_modules[key].filesToDelete = mFilesToDelete.concat(newFilesToDelete);
				}
				if(typeof(mFoldersToDelete) !== 'undefined') {
					filesToDelete[kipling_part].node_modules[key].foldersToDelete = mFoldersToDelete.concat(newFoldersToDelete);
				}
			}
		});
	}
});

const deleteOperations = [];


const operationKeys = [
	'filesToDelete',
	'foldersToDelete',
	'filesToSave',
	'foldersToSave',
];

let numTimesCalled = 0;
const createDeleteOperations = function(map, directoryOffset, searchOffset) {
	// console.log('In createDeleteOperations', directoryOffset, searchOffset);
	// if(searchOffset.indexOf('javascript-natural-sort') >= 0) {
	// 	console.log('In createDeleteOperations JS-N-S', map, directoryOffset, searchOffset);
	// }
	numTimesCalled += 1;
	// Debugging cleaning a flattened node_module's tree...
	// console.log('Called...', numTimesCalled);
	const keys = Object.keys(map);
	let availableThings = [];
	if (fs.existsSync(directoryOffset)) {
		try {
			availableThings = fs.readdirSync(directoryOffset);
		} catch(err) {
			console.error('Error reading current directory', directoryOffset);
			console.error(err);
			availableThings = [];
		}
	}

	if(DEBUG_DIRECTORY_SEARCHING) {
		console.log('Dir Offset', directoryOffset);
	}


	let hasThingsToDelete = false;
	if(keys.indexOf('filesToDelete') >= 0) {
		hasThingsToDelete = true;
	}
	if(keys.indexOf('foldersToDelete') >= 0) {
		hasThingsToDelete = true;
	}

	let hasThingsToProtect = false;
	if(keys.indexOf('filesToSave') >= 0) {
		hasThingsToProtect = true;
	}
	if(keys.indexOf('foldersToSave') >= 0) {
		hasThingsToProtect = true;
	}
	if(hasThingsToProtect) {
		hasThingsToDelete = true;
	}

	const addThingToBeDeleted = function(availableThing) {
		const deletePath = path.normalize(path.join(
			directoryOffset, availableThing
		));
		const newSearchOffset = path.normalize(path.join(
			searchOffset, availableThing
		));
		deleteOperations.push({
			'path': deletePath,
			'searchOffset':newSearchOffset,
			'isFinished': false,
			'isError': false,
			'message': '',
		});
	};
	// If there are things that need to be deleted then lets figure them out!
	if(hasThingsToDelete) {
		if(DEBUG_DIRECTORY_SEARCHING) {
			console.log('Has Things', hasThingsToDelete);
		}

		if(hasThingsToProtect) {
			// If the object has the keys filesToSave or foldersToSave then
			// loop through all available files/folders and add them to the list
			// of things to delete unless they are in the save-list
			availableThings.forEach(function(availableThing) {
				let deleteThing = true;
				if(map.filesToSave) {
					if(map.filesToSave.indexOf(availableThing) >= 0) {
						deleteThing = false;
					}
				}
				if(map.foldersToSave) {
					if(map.foldersToSave.indexOf(availableThing) >= 0) {
						deleteThing = false;
					}
				}
				if(deleteThing) {
					addThingToBeDeleted(availableThing);
				}
			});
		} else {
			// If the object has the keys filesToDelete or foldersToDelete
			// and not the "save" keys, then delete only the files/folders
			// specified.
			availableThings.forEach(function(availableThing) {
				let deleteThing = false;
				if(map.filesToDelete) {
					if(map.filesToDelete.indexOf(availableThing) >= 0) {
						deleteThing = true;
					}
				}
				if(map.foldersToDelete) {
					if(map.foldersToDelete.indexOf(availableThing) >= 0) {
						deleteThing = true;
					}
				}
				if(deleteThing) {
					addThingToBeDeleted(availableThing);
				}
			});
		}
	}

	keys.forEach(function(key) {
		if(operationKeys.indexOf(key) < 0) {
			const newOffset = path.normalize(path.join(directoryOffset, key));
			const newSearchOffset = path.normalize(path.join(searchOffset, key));
			createDeleteOperations(map[key], newOffset, newSearchOffset);
		}
	});
};

createDeleteOperations(filesToDelete, DIRECTORY_OFFSET, '');

if(DEBUG_DIRECTORY_SEARCHING || PRINT_FILES_BEING_DELETED) {
	// console.log(JSON.stringify(deleteOperations, null, 2));
	console.log('Files being deleted:', deleteOperations.length);
	deleteOperations.forEach(function(deleteOperation) {
		console.log('- ', deleteOperation.searchOffset);
	});
} else {
	console.log('Deleting', deleteOperations.length, 'things.');
}

const getDeleteThing = function(deleteOperation) {
	const path = deleteOperation.path;

	const deleteThing = function() {
		return new Promise((resolve) => {
			fsex.rmrf(path, function(err) {
				if(err) {
					fsex.rmrf(path, function(err) {
						if(err) {
							console.log('ERROR Deleting File/Folder!', err);
							deleteOperation.isError = true;
							deleteOperation.isFinished = true;
							deleteOperation.message = err.toString();

							resolve(deleteOperation);
						} else {
							deleteOperation.isFinished = true;
							resolve(deleteOperation);
						}
					});
				} else {
					deleteOperation.isFinished = true;
					resolve(deleteOperation);
				}
			});
		});
	};
	return deleteThing;
};

const performDeletes = function() {
	return new Promise((resolve) => {
		const promises = deleteOperations.map(function (deleteOperation) {
			return getDeleteThing(deleteOperation)();
		});

		Promise.allSettled(promises)
			.then(function (results) {
				console.log('Finished Deleting!');
				resolve();
			}, function (errors) {
				console.error('Failed deleting...', errors);
				resolve();
			});
	});
};

if(PERFORM_DELETES) {
	performDeletes()
		.then(() => {
		});
}
