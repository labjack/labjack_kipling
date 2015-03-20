/*!
 * Nodeunit
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var nodeunit = require('nodeunit'),
    utils = require('../node_modules/nodeunit/lib/utils'),
    fs = require('fs'),
    path = require('path'),
    AssertionError = require('assert').AssertionError;

/**
 * Reporter info string
 */

exports.info = "Report tests result as HTML";

/**
 * Run all tests within each module, reporting the results to the command-line.
 *
 * @param {Array} files
 * @api public
 */

var savedText = '';
var tempText = '';
var setTempText = function(str) {
    tempText = str;
};
var appendText = function(str) {
    savedText += str;
};
exports.getSavedText = function() {
    return savedText + tempText;
};
exports.run = function (files, options, update, callback) {
    savedText = '';

    var start = new Date().getTime();
    var paths = files.map(function (p) {
        return path.resolve(p);
    });

    // appendText('<html>');
    // appendText('<head>');
    // appendText('<title></title>');
    // appendText('<style type="text/css">');
    // appendText('body { font: 12px Helvetica Neue }');
    // appendText('h2 { margin:0 ; padding:0 }');
    // appendText('pre { font: 11px Andale Mono; margin-left: 1em; padding-left: 1em; margin-top:0; font-size:smaller;}');
    // appendText('.assertion_message { margin-left: 1em; }');
    // appendText('  ol {' +
    // '	list-style: none;' +
    // '	margin-left: 1em;' +
    // '	padding-left: 1em;' +
    // '	text-indent: -1em;' +
    // '}');
    // appendText('  ol li.pass:before { content: "\\2714 \\0020"; }');
    // appendText('  ol li.fail:before { content: "\\2716 \\0020"; }');
    // appendText('</style>');
    // appendText('</head>');
    // appendText('<body>');
    nodeunit.runFiles(paths, {
        testspec: options.testspec,
        testFullSpec: options.testFullSpec,
        moduleStart: function (name) {
            appendText('<h2 id="nodeunit-banner">' + name + '</h2>');
            appendText('<ol id="nodeunit-tests">');
        },
        testStart: function(name) {
            var indeterminateTxt = '<div class="progress progress-indeterminate"><div class="bar"></div></div>';
            setTempText('<li class="active">' + name + indeterminateTxt + '</li>');
            if(update) {
                update();
            }
        },
        testDone: function (name, assertions) {
            setTempText('');
            if (!assertions.failures()) {
                appendText('<li class="pass">' + name + '</li>');
            }
            else {
                appendText('<li class="fail">' + name);
                assertions.forEach(function (a) {
                    if (a.failed()) {
                        a = utils.betterErrors(a);
                        // if(a.message) {
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
                });
                appendText('</li>');
            }
            if(update) {
                update();
            }
        },
        moduleDone: function () {
            appendText('</ol>');
        },
        done: function (assertions) {
            var end = new Date().getTime();
            var duration = end - start;
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
            // appendText('</body>');
            // appendText('</html>');
            if(update) {
                update();
            }
            if (callback) callback(assertions.failures() ? new Error('We have got test failures.') : undefined);
        }
    });
};
