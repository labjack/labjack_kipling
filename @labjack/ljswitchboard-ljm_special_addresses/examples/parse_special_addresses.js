var ljm_special_addresses = require('../lib/ljm_special_addresses');

/*
 * The parse function parses the specified .config file.  There is an optional
 * options argument where file path can be specified:
 * ljm_special_addresses.parse({'filePath': '[customFilePath]'})
 */
ljm_special_addresses.parse()
.then(function(res) {
	console.log('Config File Path:', res.filePath);
	console.log('Special IP Addresses:');
	console.log(res.fileData);
}, function(err) {
	console.error('Error parsing .config file:');
	console.error({
		'isError': err.isError,
		'errorStep': err.errorStep,
	});
	process.exit(1);
});