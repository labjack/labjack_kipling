
var path = require('path');

var testPackages = {
	'core': {
		'name': 'ljswitchboard-core',
		'folderName': 'ljswitchboard-core',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-core'),
		]
	},
	'forceRefreshCore': {
		'name': 'ljswitchboard-core',
		'folderName': 'ljswitchboard-core',
		'loadMethod': 'managed',
		'forceRefresh': true,
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-core'),
		]
	},
	'invalidCore': {
		'name': 'ljswitchboard-core',
		'folderName': 'ljswitchboard-core',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-core_invalidDep'),
		]
	},
	'staticFiles_Long': {
		'name': 'ljswitchboard-static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), '..', 'ljswitchboard-static_files'),
		]
	},
	'staticFiles': {
		'name': 'ljswitchboard-static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesOldOnly': {
		'name': 'ljswitchboard-static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_old'),
		]
	},
	'staticFilesNew': {
		'name': 'ljswitchboard-static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_new'),
		]
	},
	'staticFilesOldBeforeNew': {
		'name': 'ljswitchboard-static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_old'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_new'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesStdDirBeforeNewZip': {
		'name': 'ljswitchboard-static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_old'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_new.zip'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesNewBeforeOld': {
		'name': 'ljswitchboard-static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_new'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesZipTest': {
		'name': 'ljswitchboard-static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesNoUpgrades': {
		'name': 'ljswitchboard-static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': []
	},
	'staticFilesNotFoundUpgrades': {
		'name': 'ljswitchboard-static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'bad_directory', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), 'bad_directory', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesInvalidDeps': {
		'name': 'ljswitchboard-static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_wInvalidDependency'),
		]
	}
};

exports.testPackages = testPackages;
