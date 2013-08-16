/**
 * Unit tests for the ljmmm-parse LJMMM markup parsing micro-library
 *
 * Unit tests for logic to parse LabJack MODBUS Map Markup language embedded in
 * various document types. See https://bitbucket.org/labjack/ljm_constants.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @license MIT
**/


var rewire = require('rewire');

var ljmmm = rewire('./ljmmm');
ljmmm.__set__('DATA_TYPE_SIZES', {TEST_TYPE: 4})


/**
 * Test getting the size of a known data type.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions shouldmrun against and this test should report to when done.
**/
exports.testGetTypeRegSize = function(test)
{
    var getTypeRegSize = ljmmm.__get__('getTypeRegSize');
    test.equal(getTypeRegSize('TEST_TYPE'), 4);
    test.done();
};


/**
 * Test getting the size of an unknown data type.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions shouldmrun against and this test should report to when done.
**/
exports.testGetTypeRegSizeNotFound = function(test)
{
    var getTypeRegSize = ljmmm.__get__('getTypeRegSize');
    test.equal(getTypeRegSize('SOMETHING_ELSE'), -1);
    test.done();
};


/**
 * Test expanding the name of a register with the default range increment.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions shouldmrun against and this test should report to when done.
**/
exports.testExpandLJMMMNameNoIncrement = function(test)
{
    var expectedResult = [
        'Test0After',
        'Test1After',
        'Test2After'
    ];

    ljmmm.expandLJMMMName(
        'Test#(0:2)After',
        function (error) { test.ok(false, error); test.done(); },
        function (result) {
            test.deepEqual(result, expectedResult);
            test.done();
        }
    );
};


/**
 * Test expanding the name of a register with a non-standard range increment.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions shouldmrun against and this test should report to when done.
**/
exports.testExpandLJMMMNameIncrement = function(test)
{
    var expectedResult = [
        'Test0After',
        'Test2After',
        'Test4After'
    ];

    ljmmm.expandLJMMMName(
        'Test#(0:4:2)After',
        function (error) {
            test.ok(false, error)
        },
        function (result) {
            test.deepEqual(result, expectedResult);
            test.done();
        }
    );
};


/**
 * Test expanding a register entry, testing both expanded names and addresses.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions shouldmrun against and this test should report to when done.
**/
exports.testExpandLJMMMEntry = function(test)
{
    var testInput = {name: 'Test#(0:1)', address: 0, type: 'TEST_TYPE'};
    var expectedResult = [
        {name: 'Test0', address: 0, type: 'TEST_TYPE'},
        {name: 'Test1', address: 4, type: 'TEST_TYPE'}
    ];

    ljmmm.expandLJMMMEntry(
        testInput,
        function (error) { test.ok(false, error); test.done(); },
        function (result) {
            test.deepEqual(result, expectedResult);
            test.done();
        }
    );
};
