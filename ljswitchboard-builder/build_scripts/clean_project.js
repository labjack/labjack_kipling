
var errorCatcher = require('./error_catcher');
var fs = require('fs');
var fse = require('fs-extra');
var fsex = require('fs.extra');
var path = require('path');
var q = require('q');
var cwd = process.cwd();
var rimraf = require('rimraf');

var TEMP_FILES_DIR_NAME = 'temp_project_files';
var DIRECTORY_OFFSET = path.normalize(path.join(cwd, TEMP_FILES_DIR_NAME));

var DEBUG_DIRECTORY_SEARCHING = false;
var PRINT_FILES_BEING_DELETED = true;
var PERFORM_DELETES = true;


var stdFilesToDelete = [
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

var stdFoldersToDelete = [
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

var createStdCleanModules = function(names) {
	var obj = {};
	names.forEach(function(name) {
		obj[name] = {};
		obj[name].filesToDelete = stdFilesToDelete;
		obj[name].foldersToDelete = stdFoldersToDelete;
	});
	return obj;
};


var filesToDelete = {
	'ljswitchboard-io_manager': {
		'foldersToDelete': ['.bin'],
		'node_modules': {
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
			'mathjs': {
				'filesToDelete': ['CONTRIBUTING.md', 'HISTORY.md', 'NOTICE', 'README.md', 'ROADMAP.md'],
				'foldersToDelete': ['test', 'examples', 'docs', 'bin', 'dist']
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
			'request': {
				'filesToSave': ['LICENSE', 'package.json', 'request.js', 'index.js'],
				'foldersToSave': ['lib', 'node_modules'],
				// 'node_modules': createStdCleanModules([
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
				// ]),
			},
			'lodash': {
				'filesToSave': ['package.json', 'lodash.js', 'index.js'],
				'foldersToSave': ['lib', 'node_modules'],
			},
			'cheerio': {
				'filesToDelete': [],
				'foldersToDelete': [],
				'node_modules': {
					'filesToDelete': [],
					'foldersToDelete': [],
					'lodash': {
						'filesToSave': ['package.json', 'index.js'],
					}
				}
			},
			'form-data': {
				'filesToDelete': [],
				'foldersToDelete': [],
				'node_modules': {
					'filesToDelete': [],
					'foldersToDelete': [],
					'async': {
						'filesToSave': ['package.json'],
						'foldersToSave': ['dist'],
					}
				}
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
			}
		}
	}
};

// Code that adds more cleaning requests...
// var requestModulesToClean = createStdCleanModules([
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
// var keys_requestModulesToClean = Object.keys(requestModulesToClean);
// keys_requestModulesToClean.forEach(function(key) {
// 	var obj = requestModulesToClean[key];

// 	filesToDelete['ljswitchboard-io_manager'].node_modules[key] = obj;
// });

function normalizeAndJoin(dirA, dirB) {
	// console.log('HERE', dirA, dirB);
	return path.normalize(path.join.apply(this, arguments));
}


// Get a list of the project parts
var buildData = require('../package.json');
var kipling_parts = buildData.kipling_dependencies;
kipling_parts.forEach(function(kipling_part) {
	var kiplingPartPath = normalizeAndJoin(DIRECTORY_OFFSET, kipling_part);
	var kiplingPartNMPath = normalizeAndJoin(kiplingPartPath, 'node_modules');


	var kiplingPartDeps;
	try {
		kiplingPartDeps = fs.readdirSync(kiplingPartNMPath);
	} catch(err) {
		console.error('Error reading current directory', directoryOffset);
		console.error(err);
		kiplingPartDeps = [];
	}
	// console.log('Kipling Part:', kipling_part);
	// console.log('Kipling Part Deps:', kiplingPartDeps);

	var stdCleanModulesObj = createStdCleanModules(kiplingPartDeps);

	if(typeof(filesToDelete[kipling_part]) === 'undefined') {
		filesToDelete[kipling_part] = {
			'node_modules': stdCleanModulesObj,
		};
	} else {
		var stdCleanModulesObjKeys = Object.keys(stdCleanModulesObj);
		stdCleanModulesObjKeys.forEach(function(key) {
			var obj = stdCleanModulesObj[key];
			var newFilesToDelete = obj.filesToDelete;
			var newFoldersToDelete = obj.foldersToDelete;

			if(typeof(filesToDelete[kipling_part].node_modules[key]) === 'undefined') {
				filesToDelete[kipling_part].node_modules[key] = obj;
			} else {
				var mFilesToDelete = filesToDelete[kipling_part].node_modules[key].filesToDelete;
				var mFoldersToDelete = filesToDelete[kipling_part].node_modules[key].foldersToDelete;
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

var deleteOperations = [];


var operationKeys = [
	'filesToDelete',
	'foldersToDelete',
	'filesToSave',
	'foldersToSave',
];

var numTimesCalled = 0;
var createDeleteOperations = function(map, directoryOffset, searchOffset) {
	// console.log('In createDeleteOperations', directoryOffset, searchOffset);
	// if(searchOffset.indexOf('javascript-natural-sort') >= 0) {
	// 	console.log('In createDeleteOperations JS-N-S', map, directoryOffset, searchOffset);
	// }
	numTimesCalled += 1;
	// Debugging cleaning a flattened node_module's tree...
	// console.log('Called...', numTimesCalled);
	var keys = Object.keys(map);
	var availableThings;
	try {
		availableThings = fs.readdirSync(directoryOffset);
	} catch(err) {
		console.error('Error reading current directory', directoryOffset);
		console.error(err);
		availableThings = [];
	}

	if(DEBUG_DIRECTORY_SEARCHING) {
		console.log('Dir Offset', directoryOffset);
	}


	var hasThingsToDelete = false;
	if(keys.indexOf('filesToDelete') >= 0) {
		hasThingsToDelete = true;
	}
	if(keys.indexOf('foldersToDelete') >= 0) {
		hasThingsToDelete = true;
	}

	var hasThingsToProtect = false;
	if(keys.indexOf('filesToSave') >= 0) {
		hasThingsToProtect = true;
	}
	if(keys.indexOf('foldersToSave') >= 0) {
		hasThingsToProtect = true;
	}
	if(hasThingsToProtect) {
		hasThingsToDelete = true;
	}

	var addThingToBeDeleted = function(availableThing) {
		var deletePath = path.normalize(path.join(
			directoryOffset, availableThing
		));
		var newSearchOffset = path.normalize(path.join(
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
				var deleteThing = true;
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
				var deleteThing = false;
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

	var subFolders = [];
	keys.forEach(function(key) {
		if(operationKeys.indexOf(key) < 0) {
			subFolders.push(key);
			var newOffset = path.normalize(path.join(directoryOffset, key));
			var newSearchOffset = path.normalize(path.join(searchOffset, key));
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

var maxNumRetries = 100;
var retryDelay = 1;
var getDeleteThing = function(deleteOperation) {
	var numRetries = 0;
	var path = deleteOperation.path;

	var deleteThing = function() {
		var defered = q.defer();

		fsex.rmrf(path, function(err) {
			if(err) {
				console.log('ERROR Deleting File/Folder!', err);
				deleteOperation.isError = true;
				deleteOperation.isFinished = true;
				deleteOperation.message = err.toString();

				defered.resolve(deleteOperation);
			} else {
				deleteOperation.isFinished = true;
				defered.resolve(deleteOperation);
			}
		});
		return defered.promise;
	};
	return deleteThing;
};

var performDeletes = function() {
	var defered = q.defer();

	var promises = deleteOperations.map(function(deleteOperation) {
		return getDeleteThing(deleteOperation)();
	});

	q.allSettled(promises)
	.then(function(results) {
		console.log('Finished Deleting!');
		defered.resolve();
	}, function(errors) {
		console.log('Failed deleting...', errors);
		defered.resolve();
	});
	return defered.promise;
};

if(PERFORM_DELETES) {
	performDeletes();
}