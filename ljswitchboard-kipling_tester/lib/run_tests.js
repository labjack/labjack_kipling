'use strict';

const Mocha = require('mocha');
const path = require('path');
const {NodeUnitRecorder, MyReporter} = require('./nodeunit_recorder');

const testFiles = [
    'test_kipling.js',
    // Execute Mock-Device compatible Tests
    'mock_module_tests/mock_device_selector.js',
    // 'mock_module_tests/mock_device_info.js',
    // 'mock_module_tests/mock_dashboard.js',
    // 'mock_module_tests/mock_register_matrix.js',
    // 'mock_module_tests/mock_simple_logger.js',

    /* T4 Mock Tests */


    // Execute Mock-Settings test.
    // 'mock_module_tests/settings.js',

    // Execute stand-alone mock tests
    // 'mock_module_tests/mock_file_browser.js',

    // Execute Live-Device tests
    // 'module_tests/test_device_info.js', //Perform a live-device scan and select a USB-T7
    // 'module_tests/test_device_updater.js',

    // 'mock_module_tests/mock_lua_script_debugger.js',
];

async function runTests(window_manager, package_loader) {
    console.info('runTests');
    const testerWindow = window_manager.getWindow('kipling_tester').win;
    const kiplingWindow = window_manager.getWindow('kipling').win;

    const recorder = new NodeUnitRecorder(testerWindow);
    recorder.clearReport(testerWindow);

    const mocha = new Mocha();
    mocha.reporter(MyReporter, {
        recorder
    });

    for (const testFile of testFiles) {
        const normalizedFile = path.resolve(__dirname, '..', 'test', testFile);
        mocha.addFile(normalizedFile);
    }

    await new Promise((resolve, reject) => {
        console.log('mocha run');
        try {
            mocha.run((failures) => {
                console.log('failures', failures);
                resolve();
            });
        } catch (err) {
            console.error('Error Running nodeunit tester', err);
            reject();
        }
    });
}

exports.runTests = runTests;
