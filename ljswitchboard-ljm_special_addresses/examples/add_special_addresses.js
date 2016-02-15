var ljm_special_addresses = require('../lib/ljm_special_addresses');

// Save the IPs in one of the test files.
var userIPs = require('../test_files_info/1_two_ips').data;
ljm_special_addresses.save(userIPs)
.then(function(res) {
	console.log('Config File Path:', res.filePath);
	console.log('Special IP Addresses:');
	console.log(res.fileData);
}, function(err) {
	console.log('Error parsing', err);
});