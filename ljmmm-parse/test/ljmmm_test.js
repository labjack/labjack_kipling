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

var ljmmm = rewire('../lib/ljmmm');
ljmmm.__set__('DATA_TYPE_SIZES', {TEST_TYPE: 4, ANOTHER_TYPE: 2});
ljmmm.__set__('LUA_INTEGER_TYPES', {TEST_TYPE: 4, ANOTHER_TYPE: 2});


/**
 * Test getting the size of a known data type.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions should run against and this test should report to when done.
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
 *      assertions should run against and this test should report to when done.
**/
exports.testGetTypeRegSizeNotFound = function(test)
{
    var getTypeRegSize = ljmmm.__get__('getTypeRegSize');
    test.equal(getTypeRegSize('SOMETHING_ELSE'), -1);
    test.done();
};

/**
 * Test getting the lua type of a known data type.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions should run against and this test should report to when done.
**/
exports.testGetTypeLuaType = function(test)
{
    var getLuaTypeInt = ljmmm.__get__('getLuaTypeInt');
    test.equal(getLuaTypeInt('TEST_TYPE'), 4);
    test.done();
};


/**
 * Test getting the lua type of an unknown data type.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions should run against and this test should report to when done.
**/
exports.testGetTypeLuaTypeNotFound = function(test)
{
    var getLuaTypeInt = ljmmm.__get__('getLuaTypeInt');
    test.equal(getLuaTypeInt('SOMETHING_ELSE'), -1);
    test.done();
};


/**
 * Test an entry that doesn't expand in a synchronous call.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions should run against and this test should report to when done.
**/
exports.testExpandLJMMMNameNoExpand = function(test)
{
    var expectedResult = ['TestAfter'];
    var result = ljmmm.expandLJMMMName('TestAfter');
    test.deepEqual(expectedResult, result);
    test.done();
};


/**
 * Test expanding the name of a register with the default range increment.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions should run against and this test should report to when done.
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
 *      assertions should run against and this test should report to when done.
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
            test.ok(false, error);
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
 *      assertions should run against and this test should report to when done.
**/
exports.testExpandLJMMMEntry = function(test)
{
    var testInput = {name: 'Test#(0:1)', address: 0, type: 'TEST_TYPE'};
    var expectedResult = [
        {name: 'Test0', address: 0, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4},
        {name: 'Test1', address: 4, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4}
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


/**
 * Test expanding a register entry, testing both expanded names and addresses.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions should run against and this test should report to when done.
**/
exports.testExpandLJMMMEntryAltNames = function(test)
{
    var testInput = {
        name: 'Test#(0:1)',
        address: 0,
        type: 'TEST_TYPE',
        altnames:['Again#(0:1)']
    };

    var expectedResult = [
        {name: 'Again0', address: 0, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4},
        {name: 'Again1', address: 4, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4},
        {name: 'Test0', address: 0, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4},
        {name: 'Test1', address: 4, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4}
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


/**
 * Test expanding a register entry synchronously.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions should run against and this test should report to when done.
**/
exports.testExpandLJMMMEntrySync = function(test)
{
    var testInput = {name: 'Test#(0:1)', address: 0, type: 'TEST_TYPE'};
    var expectedResult = [
        {name: 'Test0', address: 0, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4},
        {name: 'Test1', address: 4, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4}
    ];

    var result = ljmmm.expandLJMMMEntrySync(testInput);
    test.deepEqual(result, expectedResult);
    test.done();
};


/**
 * Test expanding a register entry, testing both expanded names and addresses.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions should run against and this test should report to when done.
**/
exports.testExpandLJMMMEntryAltNamesSync = function(test)
{
    var testInput = {
        name: 'Test#(0:1)',
        address: 0,
        type: 'TEST_TYPE',
        altnames:['Again#(0:1)']
    };

    var expectedResult = [
        {name: 'Test0', address: 0, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4},
        {name: 'Test1', address: 4, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4},
        {name: 'Again0', address: 0, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4},
        {name: 'Again1', address: 4, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4}
    ];

    var result = ljmmm.expandLJMMMEntrySync(testInput);
    test.deepEqual(result, expectedResult);
    test.done();
};

/**
 * Test expanding a register entry synchronously.
 * 
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions should run against and this test should report to when done.
**/
exports.expandPrimaryLJMMMEntrySync = function(test)
{
    var testInput = {name: 'Test#(0:1)', address: 0, type: 'TEST_TYPE'};
    var expectedResult = [
        {name: 'Test0', address: 0, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4},
        {name: 'Test1', address: 4, type: 'TEST_TYPE', group: testInput.name, luaTypeInt: 4}
    ];

    var result = ljmmm.expandPrimaryLJMMMEntrySync(testInput);
    test.deepEqual(result, expectedResult);
    test.done();
};

/**
 * Test expanding a register entry, testing both expanded names and addresses.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions should run against and this test should report to when done.
**/
exports.testExpandPrimaryLJMMMEntryAltNamesSync = function(test)
{
    var testInput = {
        name: 'Test#(0:1)',
        address: 0,
        type: 'TEST_TYPE',
        altnames:['Again#(0:1)']
    };

    var expectedResult = [
        {name: 'Test0', address: 0, type: 'TEST_TYPE', group: testInput.name, altnames: testInput.altnames, luaTypeInt: 4},
        {name: 'Test1', address: 4, type: 'TEST_TYPE', group: testInput.name, altnames: testInput.altnames, luaTypeInt: 4},
    ];

    var result = ljmmm.expandPrimaryLJMMMEntrySync(testInput);
    test.deepEqual(result, expectedResult);
    test.done();
};

/**
 * Test expanding a many register entries.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions should run against and this test should report to when done.
**/
exports.testExpandLJMMMEntries = function(test)
{
    var testInput = [
        {name: 'Test#(0:1)', address: 0, type: 'TEST_TYPE'},
        {name: 'Another#(0:1)', address: 0, type: 'ANOTHER_TYPE'}
    ];
    var expectedResult = [
        {name: 'Test0', address: 0, type: 'TEST_TYPE', group: testInput[0].name, luaTypeInt: 4},
        {name: 'Test1', address: 4, type: 'TEST_TYPE', group: testInput[0].name, luaTypeInt: 4},
        {name: 'Another0', address: 0, type: 'ANOTHER_TYPE', group: testInput[1].name, luaTypeInt: 2},
        {name: 'Another1', address: 2, type: 'ANOTHER_TYPE', group: testInput[1].name, luaTypeInt: 2}
    ];

    ljmmm.expandLJMMMEntries(
        testInput,
        function (error) { test.ok(false, error); test.done(); },
        function (result) {
            test.deepEqual(result, expectedResult);
            test.done();
        }
    );
};


/**
 * Test expanding many register entries synchronously.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions should run against and this test should report to when done.
**/
exports.testExpandLJMMMEntriesSync = function(test)
{
    var testInput = [
        {name: 'Test#(0:1)', address: 0, type: 'TEST_TYPE'},
        {name: 'Another#(0:1)', address: 0, type: 'ANOTHER_TYPE'}
    ];
    var expectedResult = [
        {name: 'Test0', address: 0, type: 'TEST_TYPE', group: testInput[0].name, luaTypeInt: 4},
        {name: 'Test1', address: 4, type: 'TEST_TYPE', group: testInput[0].name, luaTypeInt: 4},
        {name: 'Another0', address: 0, type: 'ANOTHER_TYPE', group: testInput[1].name, luaTypeInt: 2},
        {name: 'Another1', address: 2, type: 'ANOTHER_TYPE', group: testInput[1].name, luaTypeInt: 2}
    ];

    var result = ljmmm.expandLJMMMEntriesSync(testInput);
    test.deepEqual(result, expectedResult);
    test.done();
};
exports.testExpandLJMMMEntriesSync = function(test)
{
    var testInput = [
        {name: 'Test#(0:1)', address: 0, type: 'TEST_TYPE'},
        {name: 'Another#(0:1)', address: 0, type: 'ANOTHER_TYPE', altnames:['Again#(0:1)']}
    ];
    var expectedResult = [
        {name: 'Test0', address: 0, type: 'TEST_TYPE', group: testInput[0].name, luaTypeInt: 4},
        {name: 'Test1', address: 4, type: 'TEST_TYPE', group: testInput[0].name, luaTypeInt: 4},
        {name: 'Another0', address: 0, type: 'ANOTHER_TYPE', group: testInput[1].name, luaTypeInt: 2},
        {name: 'Another1', address: 2, type: 'ANOTHER_TYPE', group: testInput[1].name, luaTypeInt: 2},
        {name: 'Again0', address: 0, type: 'ANOTHER_TYPE', group: testInput[1].name, luaTypeInt: 2},
        {name: 'Again1', address: 2, type: 'ANOTHER_TYPE', group: testInput[1].name, luaTypeInt: 2},
    ];

    var result = ljmmm.expandLJMMMEntriesSync(testInput);
    test.deepEqual(result, expectedResult);
    test.done();
};

/**
 * Test expanding many register entries synchronously.
 *
 * @param {nodeunit.test} test The nodeunit-standard test that this function's
 *      assertions should run against and this test should report to when done.
**/
exports.testExpandPrimaryLJMMMEntriesSync = function(test)
{
    var testInput = [
        {name: 'Test#(0:1)', address: 0, type: 'TEST_TYPE'},
        {name: 'Another#(0:1)', address: 0, type: 'ANOTHER_TYPE', altnames:['Again#(0:1)']}
    ];
    var expectedResult = [
        {name: 'Test0', address: 0, type: 'TEST_TYPE', group: testInput[0].name, luaTypeInt: 4},
        {name: 'Test1', address: 4, type: 'TEST_TYPE', group: testInput[0].name, luaTypeInt: 4},
        {name: 'Another0', address: 0, type: 'ANOTHER_TYPE', group: testInput[1].name, altnames: testInput[1].altnames, luaTypeInt: 2},
        {name: 'Another1', address: 2, type: 'ANOTHER_TYPE', group: testInput[1].name, altnames: testInput[1].altnames, luaTypeInt: 2}
    ];

    var result = ljmmm.expandPrimaryLJMMMEntriesSync(testInput);
    test.deepEqual(result, expectedResult);
    test.done();
};
