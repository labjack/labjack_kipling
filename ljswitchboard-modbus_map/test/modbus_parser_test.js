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

var assert = require('chai').assert;

var jsonConstants = require('../lib/json_constants_parser');
var constants = jsonConstants.getConstants();

var ljmmm_parse = require('ljmmm-parse');
var bufferRegisters = require('../lib/buffer_registers').bufferRegisters;

var driver_const = require('ljswitchboard-ljm_driver_constants');

var expandedBufferRegisters = [];
bufferRegisters.forEach(function(bufferRegister) {
  var newReg = ljmmm_parse.expandLJMMMName(bufferRegister);
  if(Array.isArray(newReg)) {
    expandedBufferRegisters = expandedBufferRegisters.concat(newReg);
  } else {
    expandedBufferRegisters.push(newReg);
  }
});

describe('modbus parser', function() {
  beforeEach(function(done) {
    //this.mockDevice = new MockDevice();
    done();
  });

  /**
   * Tests to make sure register information can be found by name.
   *
   * @param  {[type]} test
   * @return {[type]}
   */
  it('testParseName', function (done) {
    var info = [
      constants.getAddressInfo(0,'R'),
      constants.getAddressInfo(1000,'R'),
    ];
    var tests = [
      {type: 3, directionValid: 1, typeString: 'FLOAT32'},
      {type: 3, directionValid: 1, typeString: 'FLOAT32'},
    ];

    assert.equal(info.length, tests.length);
    for(var i = 0; i < info.length; i++)
    {
      assert.equal(info[i].type, tests[i].type);
      assert.equal(info[i].directionValid, tests[i].directionValid);
      assert.equal(info[i].typeString, tests[i].typeString);
    }
    done();
  });

  /**
   * Tests to make sure register information can be found by address number.
   *
   * @param  {[type]} test
   * @return {[type]}
   */
  it('testParseAddress', function (done) {
    var info = [
      constants.getAddressInfo("DAC0",'W'),
      constants.getAddressInfo("AIN0",'R'),
      constants.getAddressInfo("AIN0",'W'),
      constants.getAddressInfo("FIO0",'W'),
      constants.getAddressInfo("DIO0",'W'),
      constants.getAddressInfo("T7_FLASH_CHIP_VERSION",'R'),
    ];
    var tests = [
      {type: 3, directionValid: 1, typeString: 'FLOAT32'},
      {type: 3, directionValid: 1, typeString: 'FLOAT32'},
      {type: 3, directionValid: 0, typeString: 'FLOAT32'},
      {type: 0, directionValid: 1, typeString: 'UINT16'},
      {type: 0, directionValid: 1, typeString: 'UINT16'},
      {type: 1, directionValid: 1, typeString: 'UINT32'},
    ];

    assert.equal(info.length, tests.length);
    for(var i = 0; i < info.length; i++)
    {
      assert.equal(info[i].type, tests[i].type);
      assert.equal(info[i].directionValid, tests[i].directionValid);
      assert.equal(info[i].typeString, tests[i].typeString);
    }
    done();
  });

  /**
   * Test to make sure that the error codes are properly parsed
   */
  it('testParseErrors', function (done) {
    var err = constants.getErrorInfo(0);
    assert.deepEqual(err, {'error': 0, 'string': 'LJ_SUCCESS'});

    var errStr = constants.getErrorInfo('LJ_SUCCESS');
    assert.deepEqual(errStr, {'error': 0, 'string': 'LJ_SUCCESS'});
    done();
  });

  /**
   * Test to make sure that additional error codes are properly inserted.
   */
  it('testAdditionalErrors', function (done) {
    errorCodes = [
      {'err': driver_const.LJN_DEVICE_NOT_CONNECTED, 'str': 'LJN_DEVICE_NOT_CONNECTED'},
      {'err': driver_const.LJN_UNEXPECTED_ASYNC_CALL_ERROR, 'str': 'LJN_UNEXPECTED_ASYNC_CALL_ERROR'},
      {'err': driver_const.LJN_INVALID_IO_ATTEMPT, 'str': 'LJN_INVALID_IO_ATTEMPT'},
    ];
    for(var i = 0; i < errorCodes.length; i++) {
      assert.equal(constants.getErrorInfo(errorCodes[i].err).string, errorCodes[i].str);
    }

    done();
  });

  it('testArrayRegisters', function (done) {
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

    assert.deepEqual(results, reqResults, 'failed to check array registers');
    done();
  });

  it('testBufferRegisters', function (done) {
    var vals = [
      {'reg': 'AIN0', 'isBuffer': false},
      {'reg': 'SPI_DATA_TX', 'isBuffer': true},
      {'reg': 'LUA_DEBUG_DATA', 'isBuffer': true},
      {'reg': 'STREAM_OUT0_BUFFER_F32', 'isBuffer': true},
    ];
    // Make sure that the expandedBufferRegisters is of the correct length.
    // assert.equal(expandedBufferRegisters.length, 47, 'wrong number of expanded buffer registers');
    // expandedBufferRegisters.forEach(function(reg) {
    //   vals.push({'reg': reg, 'isBuffer': true});
    // });

    // Make sure that each register has or doesn't have the isBuffer flag.
    vals.forEach(function(val) {
      var info = constants.getAddressInfo(val.reg,'R');
      // console.log('HERE', info);
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
        assert.strictEqual(foundFlag, val.isBuffer, msg);

        // Make sure that the registers marked as bufferRegisters also have the
        // bufferInfo flag containing a size and type attribute.
      }
    });

    done();
  });
});
