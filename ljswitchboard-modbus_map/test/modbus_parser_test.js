/**
 * This file contains unit tests for testing functions in the 
 * LabJackDriver/json_constants_parser.js file.  
 *
 * @author Chris Johnson (chrisjohn404)
 *
 * Module Dependencies:
 * <constants file>, for test constants
 * <priv constants file>, for private test constants
 */

var jsonConstants = require('../lib/json_constants_parser');
var constants = jsonConstants.getConstants();

exports.tests = {
  setUp: function(callback) {
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
    var info = [
      constants.getAddressInfo(0,'R'),
      constants.getAddressInfo(1000,'R'),
    ];
    var tests = [
      {type: 3, directionValid: 1, typeString: 'FLOAT32'},
      {type: 3, directionValid: 1, typeString: 'FLOAT32'},
    ];

    test.equal(info.length, tests.length);
    for(var i = 0; i < info.length; i++)
    {
      test.equal(info[i].type, tests[i].type);
      test.equal(info[i].directionValid, tests[i].directionValid);
      test.equal(info[i].typeString, tests[i].typeString);
    }
    test.done();
  },

  /**
   * Tests to make sure register information can be found by address number.
   * 
   * @param  {[type]} test
   * @return {[type]}
   */
  testParseAddress: function(test) {
    var info = [
      constants.getAddressInfo("DAC0",'W'),
      constants.getAddressInfo("AIN0",'R'),
      constants.getAddressInfo("AIN0",'W'),
    ];
    var tests = [
      {type: 3, directionValid: 1, typeString: 'FLOAT32'},
      {type: 3, directionValid: 1, typeString: 'FLOAT32'},
      {type: 3, directionValid: 0, typeString: 'FLOAT32'},
    ];

    test.equal(info.length, tests.length);
    for(var i = 0; i < info.length; i++)
    {
      test.equal(info[i].type, tests[i].type);
      test.equal(info[i].directionValid, tests[i].directionValid);
      test.equal(info[i].typeString, tests[i].typeString);
    }
    test.done();
  },

  /**
   * Test to make sure that the error codes are properly parsed
   */
  testParseErrors: function(test) {
    var err = constants.getErrorInfo(0);
    test.deepEqual(err, {'error': 0, 'string': 'LJ_SUCCESS'});

    var errStr = constants.getErrorInfo('LJ_SUCCESS');
    test.deepEqual(errStr, {'error': 0, 'string': 'LJ_SUCCESS'});
    test.done();
  },
};
