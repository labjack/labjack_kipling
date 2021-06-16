'use strict';

/*!
 * Nodeunit
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

// process.browser = 1; // Hack for old nw.js
const path = require('path');
const Mocha = require('mocha');
const util = require('util');
const AssertionError = require('assert').AssertionError;
const crypto = require('crypto');

const betterErrors = function (assertion) {
    // return assertion;
    if (!assertion.error) {
        return assertion;
    }
    const e = assertion.error;

    if (typeof e.actual !== 'undefined' && typeof e.expected !== 'undefined') {
        const actual = util.inspect(e.actual, false, 10).replace(/\n$/, '');
        const expected = util.inspect(e.expected, false, 10).replace(/\n$/, '');

        const multiline = (
            actual.indexOf('\n') !== -1 ||
            expected.indexOf('\n') !== -1
        );
        const spacing = (multiline ? '\n' : ' ');
        e._message = e.message;
        e.stack = (
            e.name + ':' + spacing +
            actual + spacing + e.operator + spacing +
            expected + '\n' +
            e.stack.split('\n').slice(1).join('\n')
        );
    }
    return assertion;
};


/**
 * Reporter info string
 */

exports.info = "Report tests result as HTML";

class MyReporter extends Mocha.reporters.Base {

    constructor(runner, opts) {
        super(runner);

        // console.log('opts', opts);
        const {recorder} = opts.reporterOptions;
        const callback = null;

        const start = new Date().getTime();

        let passes = 0;
        let failures = 0;

        runner.on('suite', function(suite) {
            console.log('Suite start', suite.title);

            suite.ctx.reporterOptions = opts.reporterOptions;

            recorder.addSuite({
                suiteName: suite.title
            });
        });
        runner.on('suite end', function(suite) {
            console.log('Suite end', suite.title);
        });

        runner.on('test', function(test) {
            console.log('Add test', test.file, test.title);

            recorder.addTest({
                suiteName: test.parent.title,
                testFile: test.file,
                title: test.title,
            });
        });

        runner.on('pass', function(test) {
            // console.log('mr3 pass', Object.keys(test.parent), test.parent.title);
            console.log('Test pass', test.file, test.title, test.duration);

            recorder.setProgress({
                suiteName: test.parent.title,
                testFile: test.file,
                title: test.title,
                duration: test.duration,
                timedOut: test.timedOut,
                passed: true
            });
            passes++;
        });

        runner.on('fail', function(test, err) {
            console.log('Test fail', test.file, test.title, test.duration, test.timedOut);

            recorder.setProgress({
                suiteName: test.parent.title,
                testFile: test.file,
                title: test.title,
                duration: test.duration,
                timedOut: test.timedOut,
                err: test.err,
                passed: false
            });
            failures++;
/*
            recorder.appendText('<li class="test fail"><h2>' + test.fullTitle() + '</h2>');
            /!*assertions.forEach(function (a) {
                if (a.failed()) {
                    a = betterErrors(a);
                    // if (a.message) {
                    //     appendText('<br>' + a.message)
                    // }
                    if (a.error instanceof AssertionError && a.message) {
                        appendText('<div class="assertion_message">' +
                            'Assertion Message: ' + a.message +
                            '</div>');
                    }
                    appendText('<pre>');
                    appendText('Message: ' + a.message + '\r\n');
                    appendText(a.error.stack);
                    appendText('</pre>');
                }
            });*!/

*/
        });

        runner.on('end', function() {
            console.log('mr5 end');
            const end = new Date().getTime();
            const duration = end - start;
            /*
                        if (assertions.failures()) {
                            appendText(
                                '<h3>FAILURES: '  + assertions.failures() +
                                '/' + assertions.length + ' assertions failed (' +
                                assertions.duration + 'ms)</h3>'
                            );
                        }
                        else {
                            appendText(
                                '<h3>OK: ' + assertions.length +
                                ' assertions (' + assertions.duration + 'ms)</h3>'
                            );
                        }
            */
        });
    }
}

class NodeUnitRecorder {
    constructor(testerWindow) {
        this.testerWindow = testerWindow;
        this.savedText = '';
        this.tempText = '';
    }

    clearReport() {
        this.testerWindow.webContents.postMessage('postMessage', {
            'channel': 'clearReport',
            'payload': ''
        });
    }

    addSuite(opts) {
        const suiteHash = crypto.createHash('md5');
        const suiteId = suiteHash.update(opts.suiteName).digest('hex');

        this.testerWindow.webContents.postMessage('postMessage', {
            'channel': 'addSuite',
            'payload': Object.assign({}, opts, {
                suiteId
            })
        });
    }

    addTest(opts) {
        const hash = crypto.createHash('md5');
        const data = hash.update(opts.testFile + opts.title);
        const testId = data.digest('hex');
        const suiteHash = crypto.createHash('md5');
        const suiteId = suiteHash.update(opts.suiteName).digest('hex');

        this.testerWindow.webContents.postMessage('postMessage', {
            'channel': 'addTest',
            'payload': Object.assign({}, opts, {
                testId, suiteId
            })
        });
    }

    setProgress(opts) {
        const hash = crypto.createHash('md5');
        const data = hash.update(opts.testFile + opts.title);
        const testId = data.digest('hex');
        const suiteHash = crypto.createHash('md5');
        const suiteId = suiteHash.update(opts.suiteName).digest('hex');

        this.testerWindow.webContents.postMessage('postMessage', {
            'channel': 'setProgress',
            'payload': Object.assign({}, opts, {
                testId, suiteId
            })
        });
    }
}

exports.MyReporter = MyReporter;
exports.NodeUnitRecorder = NodeUnitRecorder;
