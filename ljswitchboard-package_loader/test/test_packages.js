
var path = require('path');

var testPackages = {
	'core': {
		'name': 'ljswitchboard_core',
		'loadMethod': 'require', 
		'location': path.join(process.cwd(), '..', 'ljswitchboard-core')
	},
	'staticFiles_Long': {
		'name': 'ljswitchboard_static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), '..', 'ljswitchboard-static_files'),
		]
	},
	'staticFiles': {
		'name': 'ljswitchboard_static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesOldOnly': {
		'name': 'ljswitchboard_static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_old'),
		]
	},
	'staticFilesNew': {
		'name': 'ljswitchboard_static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_new'),
		]
	},
	'staticFilesOldBeforeNew': {
		'name': 'ljswitchboard_static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_old'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_new'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesStdDirBeforeNewZip': {
		'name': 'ljswitchboard_static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_old'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_new.zip'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesNewBeforeOld': {
		'name': 'ljswitchboard_static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files_new'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesZipTest': {
		'name': 'ljswitchboard_static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files'),
		]
	},
	'staticFilesNoUpgrades': {
		'name': 'ljswitchboard_static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': []
	}
};

exports.testPackages = testPackages;
