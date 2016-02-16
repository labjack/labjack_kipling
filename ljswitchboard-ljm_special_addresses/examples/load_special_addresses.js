var ljm_special_addresses = require('../lib/ljm_special_addresses');

/*
 * The load function parses and instructs LJM to load the 
 * specified .config file.  There is an optional
 * options argument where file path can be specified:
 * ljm_special_addresses.load({'filePath': '[customFilePath]'})
 */
ljm_special_addresses.load()
.then(function(res) {
	console.log('Config File Path:', res.filePath);
	console.log('Special IP Addresses:');
	console.log(res.fileData);
	console.log('LJM\'s Special Addresses Status String:');
	console.log(res.ljmStatus);
}, function(err) {
	console.error('Error loading .config file:');
	console.error({
		'isError': err.isError,
		'errorStep': err.errorStep,
	});
	process.exit(1);
});