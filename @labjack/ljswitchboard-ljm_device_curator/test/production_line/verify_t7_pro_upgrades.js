process.on('uncaughtException', function(err) {
	console.log('ERROR!!!', err);
	console.log(err.stack);
	process.exit();
});


/********************** Require tests *****************************************/
var verify_t7_upgrades = require('./check_t7_pro_versions');


/********************** Perform tests *****************************************/
exports.verify_t7_upgrades = verify_t7_upgrades;
