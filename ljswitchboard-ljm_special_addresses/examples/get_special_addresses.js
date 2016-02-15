var ljm_special_addresses = require('../lib/ljm_special_addresses');

ljm_special_addresses.parse()
.then(function(res) {
	console.log('Config File Path:', res.filePath);
	console.log('Special IP Addresses:');
	console.log(res.fileData);
}, function(err) {
	console.log('Error parsing', err);
});