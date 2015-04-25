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

var ljmmm_parse = require('ljmmm-parse');
var bufferRegisters = require('../lib/buffer_registers').bufferRegisters;

var expandedBufferRegisters = [];
bufferRegisters.forEach(function(bufferRegister) {
  var newReg = ljmmm_parse.expandLJMMMName(bufferRegister);
  if(Array.isArray(newReg)) {
    expandedBufferRegisters = expandedBufferRegisters.concat(newReg);
  } else {
    expandedBufferRegisters.push(newReg);
  }
});

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

  testArrayRegisters: function(test) {
    var vals = [
      {'reg': 'I2C_DATA_TX_ARRAY', 'res': true},
      {'reg': 'I2C_DATA_RX_ARRAY', 'res': true},
      {'reg': 'ASYNCH_DATA_TX_ARRAY', 'res': true},
      {'reg': 'ASYNCH_DATA_RX_ARRAY', 'res': true},
      {'reg': 'LUA_DEBUG_DATA_ARRAY', 'res': true},
      {'reg': 'LUA_SOURCE_ARRAY', 'res': true},
      {'reg': 'ONEWIRE_DATA_TX_ARRAY', 'res': true},
      {'reg': 'ONEWIRE_DATA_RX_ARRAY', 'res': true},
      {'reg': 'AIN0', 'res': false},
    ];
    var results = [];
    var reqResults = [];
    vals.forEach(function(val) {
      results.push(constants.isArrayRegister(val.reg));
      reqResults.push(val.res);
    });

    test.deepEqual(results, reqResults, 'failed to check array registers');
    test.done();
  },

  testBufferRegisters: function(test) {
    var vals = [
      {'reg': 'AIN0', 'isBuffer': false}
    ];
    // Make sure that the expandedBufferRegisters is of the correct length.
    test.equal(expandedBufferRegisters.length, 45, 'wrong number of expanded buffer registers');
    expandedBufferRegisters.forEach(function(reg) {
      vals.push({'reg': reg, 'isBuffer': true});
    });

    // Make sure that each register has or doesn't have the isBuffer flag.
    vals.forEach(function(val) {
      var info = constants.getAddressInfo(val.reg,'R');
      if(typeof(info.data) === 'undefined') {
        console.log('  - (warn) Not Verifying Register', val.reg, '(old modbus map)');
      } else {
        var isBufferFlag = info.data.isBuffer;
        var foundFlag = false;
        if(typeof(isBufferFlag) !== 'undefined') {
          foundFlag = true;
        }
        var msg = '';
        if(val.isBuffer) {
          msg = 'Register: ' + val.reg + ', should have an isBuffer flag';
        } else {
          msg = 'Register: ' + val.reg + ', should not have an isBuffer flag';
        }
        test.strictEqual(foundFlag, val.isBuffer, msg);
      }
    });

    test.done();
  },
};
