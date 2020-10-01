/*!
 * Nodeunit
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

process.browser = 1; // Hack for old nw.js
var Mocha = require('mocha');
delete process.browser;
var path = require('path');
var AssertionError = require('assert').AssertionError;

var betterErrors = function (assertion) {
    return assertion;
    if (!assertion.error) {
        return assertion;
    }
    var e = assertion.error;

    if (typeof e.actual !== 'undefined' && typeof e.expected !== 'undefined') {
        var actual = util.inspect(e.actual, false, 10).replace(/\n$/, '');
        var expected = util.inspect(e.expected, false, 10).replace(/\n$/, '');

        var multiline = (
            actual.indexOf('\n') !== -1 ||
            expected.indexOf('\n') !== -1
        );
        var spacing = (multiline ? '\n' : ' ');
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

    appendText('<div id="mocha">');
    appendText('<ul class="mocha-report">');

    var mocha = new Mocha();

    paths.forEach(function (path) {
        mocha.addFile(path);
    });

    function MyReporter(runner) {
        Mocha.reporters.Base.call(this, runner);
        var passes = 0;
        var failures = 0;

        runner.on('suite', function(suite) {
            appendText('<li class="suite">');
            appendText('<h1>' + suite.title + '</h1>');
            appendText('<ul>');
        });
        runner.on('suite end', function() {
            appendText('</ul>');
            appendText('</li>');
        });

        runner.on('test', function(test) {
            var indeterminateTxt = '<div class="progress progress-indeterminate"><div class="bar"></div></div>';
            setTempText('<li class="active">' + test.title + indeterminateTxt + '</li>');
            if(update) {
                update();
            }
        });

        runner.on('pass', function(test) {
            passes++;
            setTempText('');
            appendText('<li class="test pass"><h2>' + test.fullTitle() + '</h2></li>');
            if(update) {
                update();
            }
        });

        runner.on('fail', function(test, err) {
            failures++;
            setTempText('');
                appendText('<li class="test fail"><h2>' + test.fullTitle() + '</h2>');
            /*assertions.forEach(function (a) {
                if (a.failed()) {
                    a = betterErrors(a);
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
            });*/

            appendText('<pre>');
            appendText('Message: ' + err.message + '\r\n');
            appendText(err.stack);
            appendText('</pre>');

            appendText('</li>');

            if(update) {
                update();
            }
        });

        runner.on('end', function() {
            var end = new Date().getTime();
            var duration = end - start;
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
            appendText('</ul>');
            appendText('</div>');
            // appendText('</body>');
            // appendText('</html>');
            if(update) {
                update();
            }
            if (callback) callback(failures > 0 ? new Error('We have got test failures.') : undefined);
            // if (callback) callback(assertions.failures() ? new Error('We have got test failures.') : undefined);
        });
    }

    mocha.reporter(MyReporter);

    mocha.run(paths, {
        testspec: options.testspec,
        testFullSpec: options.testFullSpec,
        testStart: function(name) {

        },
        testDone: function (name, assertions) {
        }
    });

};
