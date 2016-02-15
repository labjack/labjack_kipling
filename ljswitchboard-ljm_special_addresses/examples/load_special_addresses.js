var ljm_special_addresses = require('../lib/ljm_special_addresses');

ljm_special_addresses.load()
.then(function(res) {
	console.log('Config File Path:', res.filePath);
	console.log('Special IP Addresses:');
	console.log(res.fileData);
	console.log('LJM\'s Special Addresses Status String:')
	console.log(res.ljmStatus);
}, function(err) {
	console.log('Error parsing', err);
});