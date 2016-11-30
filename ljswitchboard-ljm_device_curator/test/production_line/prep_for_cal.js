process.on('uncaughtException', function(err) {
	console.log('ERROR!!!', err);
	console.log(err.stack);
	process.exit();
});


/********************** Require tests *****************************************/
var install_calibration_firmware = require('./mult_install_calibration_firmware');


/********************** Perform tests *****************************************/
exports.install_calibration_firmware = install_calibration_firmware;						// Passing

