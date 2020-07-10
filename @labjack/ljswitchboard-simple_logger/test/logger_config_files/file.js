
exports.run = function(newVal) {
	// console.log('in file.js run');
	return newVal * 10;
};


exports.getTemp = function(data) {
	// console.log('in file.js getTemp');
	return 273.15 + data['1'].results.AIN0.result;
};