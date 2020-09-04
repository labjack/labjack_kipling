
var ZIPPING_TEST = false; // TODO somehow test prior to building

if(ZIPPING_TEST) {
	var zipping_test = require('./zipping_test');
	exports.zipping_test = zipping_test.tests;
}
