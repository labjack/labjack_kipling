/**
 * This file contains unit tests for testing functions in the 
 * LabJackDriver/json_constants_parser.js file.  Using "rewire" it replaces the 
 * some of the constants for appropriate unit-testing.
 *
 * @author Chris Johnson (chrisjohn404)
 *
 * Module Dependencies:
 * rewire, can be installed using "npm install rewire"
 * <constants file>, for test constants
 * <priv constants file>, for private test constants
 */

//var rewire = require('rewire');
//var jsonConstants = require('../LabJackDriver/json_constants_parser');

module.exports = {
	setUp: function(callback) {
		console.log("setup-step");
		//this.mockDevice = new MockDevice();
		callback();
	},

	/**
	 * Tests to make sure register information can be found by name.
	 * 
	 * @param  {[type]} test
	 * @return {[type]}
	 */
	testParseName: function(test) {
		console.log("hello world");
		test.done();
	},

	/**
	 * Tests to make sure register information can be found by address number.
	 * 
	 * @param  {[type]} test
	 * @return {[type]}
	 */
	testParseAddress: function(test) {
		test.done();
	},
}