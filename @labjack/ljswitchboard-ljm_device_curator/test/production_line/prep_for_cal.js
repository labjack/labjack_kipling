process.on('uncaughtException', function(err) {
	console.log('ERROR!!!', err);
	console.log(err.stack);
	process.exit();
});


/********************** Require tests *****************************************/
var mult_upgrade_recovery_firmware = require('./mult_upgrade_recovery_firmware');
var mult_install_calibration_firmware = require('./mult_install_calibration_firmware');


/********************** Perform tests *****************************************/
exports.mult_upgrade_recovery_firmware = mult_upgrade_recovery_firmware;
exports.mult_install_calibration_firmware = mult_install_calibration_firmware;						// Passing

