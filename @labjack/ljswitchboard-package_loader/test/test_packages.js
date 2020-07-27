
var path = require('path');

var testPackages = {
	'core': {
		'name': path.join('@labjack', 'ljswitchboard-core'),
		'folderName': 'ljswitchboard-core',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-core'),
		]
	},
	'forceRefreshCore': {
		'name': path.join('@labjack', 'ljswitchboard-core'),
		'folderName': 'ljswitchboard-core',
		'loadMethod': 'managed',
		'forceRefresh': true,
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-core'),
		]
	},
	'invalidCore': {
		'name': path.join('@labjack', 'ljswitchboard-core'),
		'folderName': 'ljswitchboard-core',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-core_invalidDep'),
		]
	},
	'staticFiles_Long': {
		'name': path.join('@labjack', 'ljswitchboard-static_files'),
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), '..', 'ljswitchboard-static_files'),
		]
	},
	'staticFiles': {
		'name': path.join('@labjack', 'ljswitchboard-static_files'),
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesOldOnly': {
		'name': path.join('@labjack', 'ljswitchboard-static_files'),
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_old'),
		]
	},
	'staticFilesNew': {
		'name': path.join('@labjack', 'ljswitchboard-static_files'),
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_new'),
		]
	},
	'staticFilesOldBeforeNew': {
		'name': path.join('@labjack', 'ljswitchboard-static_files'),
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_old'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_new'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesStdDirBeforeNewZip': {
		'name': path.join('@labjack', 'ljswitchboard-static_files'),
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_old'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_new.zip'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesNewBeforeOld': {
		'name': path.join('@labjack', 'ljswitchboard-static_files'),
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_new'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesZipTest': {
		'name': path.join('@labjack', 'ljswitchboard-static_files'),
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesBadZip': {
		'name': path.join('@labjack', 'ljswitchboard-static_files'),
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_bad_zip.zip'),
		]
	},
	'staticFilesNoUpgrades': {
		'name': path.join('@labjack', 'ljswitchboard-static_files'),
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': []
	},
	'staticFilesNotFoundUpgrades': {
		'name': path.join('@labjack', 'ljswitchboard-static_files'),
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'bad_directory', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), 'bad_directory', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesInvalidDeps': {
		'name': path.join('@labjack', 'ljswitchboard-static_files'),
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_wInvalidDependency'),
		]
	}
};

exports.testPackages = testPackages;
