
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
	'Readme.md',
	'README.md',
	'test.js',
];

var stdFoldersToDelete = [
	'benchmark',
	'bin',
	'example',
	'images',
	'test',
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
			'ljswitchboard-ljm_device_curator': {
				'filesToDelete': ['.npmignore'],
				'foldersToDelete': ['test'],
				'node_modules': {
					'foldersToDelete': ['.bin'],
					'mathjs': {
						'filesToDelete': ['CONTRIBUTING.md', 'HISTORY.md', 'NOTICE', 'README.md', 'ROADMAP.md'],
						'foldersToDelete': ['test', 'examples', 'docs', 'bin', 'dist']
					}
				}
			},
			'request': {
				'filesToSave': ['LICENSE', 'package.json', 'request.js', 'index.js'],
				'foldersToSave': ['lib', 'node_modules'],
				'node_modules': createStdCleanModules([
					'aws-sign2',
					'bl',
					'caseless',
					'combined-stream',
					'forever-agent',
					'form-data',
					'har-validator',
					'hawk',
					'http-signature',
					'isstream',
					'json-stringify-safe',
					'mime-types',
					'node-uuid',
					'oauth-sign',
					'qs',
					'stringstream',
					'tough-cookie',
					'tunnel-agent',
				]),
			}
		}
	}
}

var deleteOperations = [];


var operationKeys = [
	'filesToDelete',
	'foldersToDelete',
	'filesToSave',
	'foldersToSave',
]
var createDeleteOperations = function(map, directoryOffset, searchOffset) {
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
	}
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