var ljm_special_addresses = require('../lib/ljm_special_addresses');

/*
 * The getDefaultFilePath function returns an object with a filePath attribute.
 * The file path represents LJM's default file path for the current OS/Version.
 */
ljm_special_addresses.getDefaultFilePath()
.then(function(res) {
	console.log('LJM\'s Special Addresses Default File Path:');
	console.log(res.filePath);
}, function(err) {
	console.error('Error getting default file path:');
	console.error({
		'isError': err.isError,
		'errorStep': err.errorStep,
	});
	process.exit(1);
});