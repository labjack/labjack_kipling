/**
 * Automated tests for the presenter framework.
 *
 * @author: Chris Johnson (LabJack, 2014)
 * @author: Sam Pottinger (LabJack, 2014)
**/


var dict = require('dict');
var q = require('q');
var rewire = require('rewire');

var presenter_framework = rewire('./presenter_framework.js');


function TestJQuery() {

    this.events = [];
    this.updates = [];
    this.nextVal = null;
    this.nextSerials = [];

    this.on = function (element, event, listener) {
        this.events.push({element: element, event: event, listener: listener});
    };

    this.html = function (element, newHTML) {
        this.updates.push({element: element, html: newHTML})
    };

    this.val = function (element) {
        return this.nextVal;
    };

    this.getSelectedSerials = function () {
        return this.nextSerials;
    };

    this.find = function (selector) {
        return {
            'first': function () {
                return {
                    'prop': function (property, defaultVal) {
                        return defaultVal;
                    }
                }
            }
        };
    };
}


function TestDevice() {
    this.writings = [];
    this.readAddresses = null;
    this.readResults = [];

    this.write = function (register, value) {
        this.writings.push({
            register: register,
            value: value
        });
    };

    this.readMany = function (addresses) {
        var deferred = q.defer();
        this.readAddresses = addresses;
        deferred.resolve(this.readResults);
        return deferred.promise;
    };
}


module.exports = {
    setUp: function (callback) {
        this.testFramework = new presenter_framework.Framework();
        this.testJquery = new TestJQuery();
        this.testFramework._SetJQuery(this.testJquery);
        callback();
    },

    testOn: function (test) {
        this.testFramework.on('onModuleLoad', function() {
            test.done();
        });
        this.testFramework.fire('onModuleLoad');
    },

    testOnOverwrite: function (test) {
        this.testFramework.on('onModuleLoad', function() {
            test.ok(false);
        });
        this.testFramework.on('onModuleLoad', function() {
            test.done();
        });
        this.testFramework.fire('onModuleLoad');

    },

    testOnNonExist: function (test) {
        this.testFramework.on('onLoadError', function () {
            test.done();
        });
        this.testFramework.on('something fake', function() {
            test.ok(false);
        });
    },

    testFireNonExist: function (test) {
        this.testFramework.fire('something fake');
        test.done();
    },

    testFire: function (test) {
        this.testFramework.on('onModuleLoad', function (framework, arg1, arg2) {
            test.deepEqual(arg1, 'test1');
            test.deepEqual(arg2, 'test2');
            test.done();
        });
        this.testFramework.fire('onModuleLoad', ['test1', 'test2']);
    },

    testSetRefreshRate: function (test) {
        this.testFramework.setRefreshRate(2000);
        test.equal(this.testFramework.refreshRate, 2000);
        test.done();
    },

    testSetConfigControls: function (test) {
        configControls = [
            { selector: '.test-class', event: 'click' },
            { selector: '#test-id', event: 'change' }
        ];
        this.testFramework.setConfigControls(configControls);
        test.deepEqual(this.testFramework.configControls, configControls);
        test.done();
    },

    testPutConfigBindingIncomplete: function (test) {
        this.testFramework.on('onLoadError', function () {
            test.ok(true);
        });

        testTemplate = 'testTemplate';
        testBinding = {
            class: 'testClass',
            template: testTemplate,
            //binding: 'testBinding',
            direction: 'read',
            event: 'change'
        };

        this.testFramework.putConfigBinding(testBinding);

        binding = this.testFramework.bindings[testTemplate];
        bindingInvalid = binding === undefined || binding === null;
        test.ok(bindingInvalid);
        test.done();
    },

    testPutConfigBindingInvalidDirection: function (test) {
        this.testFramework.on('onLoadError', function () {
            test.ok(true);
        });

        testTemplate = 'testTemplate';
        testBinding = {
            class: 'testClass',
            template: testTemplate,
            binding: 'testBinding',
            direction: 'something crazy',
            event: 'change'
        };

        this.testFramework.putConfigBinding(testBinding);

        binding = this.testFramework.bindings[testTemplate];
        bindingInvalid = binding === undefined || binding === null;
        test.ok(bindingInvalid);
        test.done();
    },

    testPutConfigBindingNew: function (test) {
        this.testFramework.on('onLoadError', function () {
            test.ok(false);
        });

        testTemplate = 'testTemplate';
        testBinding = {
            class: 'testClass',
            template: testTemplate,
            binding: 'testBinding',
            direction: 'read',
            event: 'change'
        };

        this.testFramework.putConfigBinding(testBinding);

        test.deepEqual(
            this.testFramework.bindings.get(testTemplate),
            testBinding
        );
        test.done();
    },

    testPutConfigBindingExists: function (test) {
        this.testFramework.on('onLoadError', function () {
            test.ok(false);
        });

        testTemplate = 'testTemplate';

        bindingStart = {
            class: 'testClass',
            template: testTemplate,
            binding: 'testBinding1',
            direction: 'read',
            event: 'change'
        };

        bindingEnd = {
            class: 'testClass',
            template: testTemplate,
            binding: 'testBinding2',
            direction: 'read',
            event: 'change'
        };

        this.testFramework.putConfigBinding(bindingStart);
        this.testFramework.putConfigBinding(bindingEnd);

        test.deepEqual(
            this.testFramework.bindings.get(testTemplate),
            bindingEnd
        );
        test.done();

    },

    testDeleteConfigBindingExists: function (test) {
        this.testFramework.on('onLoadError', function () {
            test.ok(false);
        });

        testTemplate = 'testTemplate';
        testBinding = {
            class: 'testClass',
            template: testTemplate,
            binding: 'testBinding',
            direction: 'read',
            event: 'change'
        };

        this.testFramework.putConfigBinding(testBinding);
        this.testFramework.deleteConfigBinding(testTemplate);

        binding = this.testFramework.bindings.get(testTemplate);
        bindingInvalid = binding === undefined || binding === null;

        test.ok(bindingInvalid);
        test.done();
    },

    testDeleteConfigBindingNotExists: function (test) {
        this.testFramework.on('onLoadError', function () {
            test.ok(true);
            test.done();
        });

        testTemplate = 'testTemplate';
        this.testFramework.deleteConfigBinding(testTemplate);
    },

    testSetDeviceViewNotFound: function (test) {
        this.testFramework.on('onLoadError', function () {
            test.ok(true);
            test.done();
        });

        presenter_framework.__set__('fs_facade', {
            renderTemplate: function (location, context, onError, onSuccess) {
                test.deepEqual(location, 'test external URI');
                onError('Could not find file.');
            },
            getExternalURI: function (name) {
                test.deepEqual(name, 'test URI');
                return 'test external URI';
            }
        });

        this.testFramework.setDeviceView('test URI');
    },

    testSetDeviceViewWithoutJSON: function (test) {
        this.testFramework.on('onLoadError', function (err) {
            test.ok(false);
            console.log(err);
        });

        presenter_framework.__set__('fs_facade', {
            renderTemplate: function (location, context, onError, onSuccess) {
                test.deepEqual(location, 'test external URI');
                test.done();
                onSuccess();
            },
            getExternalURI: function (name) {
                test.deepEqual(name, 'test URI');
                return 'test external URI';
            }
        });

        this.testFramework.setDeviceView('test URI');
    },

    testSetDeviceViewWithSON: function (test) {
        this.testFramework.on('onLoadError', function () {
            test.ok(false);
        });

        presenter_framework.__set__('fs_facade', {
            renderTemplate: function (location, context, onError, onSuccess) {
                test.deepEqual(location, 'test external URI');
                test.deepEqual(context.json.testLoc, {'test': 1});
                test.done();
                onSuccess();
            },
            getExternalURI: function (name) {
                var ALLOWED_NAMES = ['test URI', 'testLoc.json'];
                test.ok(ALLOWED_NAMES.indexOf(name) != -2);
                return 'test external URI';
            },
            getJSON: function(location, onError, onSuccess) {
                onSuccess({'test': 1});
            }
        });

        this.testFramework.setDeviceView('test URI', ['testLoc.json']);
    },

    testGetSelectedDevice: function (test) {
        var testDevice = new TestDevice();
        this.testFramework._SetSelectedDevices([testDevice]);
        test.deepEqual(this.testFramework.getSelectedDevice(), testDevice);
        test.done();
    },

    testEstablishConfigControlBindings: function (test) {
        this.testFramework.on('onRegisterWrite', function () {
            test.ok(true);
            test.done();
        });

        this.testFramework.setConfigControls([
            { selector: '.test-class', event: 'click' }
        ]);

        this.testFramework.establishConfigControlBindings();

        var newEvent = this.testJquery.events[0];
        test.notDeepEqual(newEvent, undefined);

        test.deepEqual(newEvent.event, 'click');
        newEvent.listener();
    },

    testStopLoop: function (test) {
        this.testFramework.runLoop = true;
        this.testFramework.stopLoop();
        test.equal(this.testFramework.runLoop, false);
        test.done();
    },

    testStartLoop: function (test) {
        var self = this;
        this.testFramework.loopIteration = function () {
            test.ok(self.testFramework.runLoop);
            test.done();
        };
        this.testFramework.startLoop();
    },

    testLoopIteration: function (test) {
        var self = this;
        var testDevice = new TestDevice();
        testDevice.readResults = [0, 1];
        self.testFramework._SetSelectedDevices([testDevice]);

        testBinding = {
            class: 'ain-inputs',
            template: 'ain-#(0:1)',
            binding: 'AIN#(0:1)',
            direction: 'read'
        };
        self.testFramework.putConfigBinding(testBinding);

        self.testFramework.on('onRefreshed',
            function (framework, valuesDict, onError, onSuccess) {
                self.testFramework.stopLoop();

                var update1 = self.testJquery.updates[0];
                test.notDeepEqual(update1, undefined);
                test.deepEqual(update1.element, '#ain-0');
                test.deepEqual(update1.html, 0);

                var update2 = self.testJquery.updates[1];
                test.notDeepEqual(update2, undefined);
                test.deepEqual(update2.element, '#ain-1');
                test.deepEqual(update2.html, 1);

                test.equal(valuesDict.get('AIN0'), 0);
                test.equal(valuesDict.get('AIN1'), 1);

                onSuccess();
            }
        );

        self.testFramework.runLoop = true;
        self.testFramework.loopIteration().then(test.done);
    },

    testConfigBindingSimpleRead: function (test) {
        testBinding = {
            class: 'ain-inputs',
            template: 'ain-0',
            binding: 'AIN0',
            direction: 'read'
        };

        this.testFramework.putConfigBinding(testBinding);

        this.testFramework._OnRead(dict({
            'AIN0': 0
        }));

        var update = this.testJquery.updates[0];
        test.notDeepEqual(update, undefined);
        test.deepEqual(update.element, '#ain-0');
        test.deepEqual(update.html, 0);
        test.done();
    },

    testConfigBindingComplexRead: function (test) {
        testBinding = {
            class: 'ain-inputs',
            template: 'ain-#(0:1)',
            binding: 'AIN#(0:1)',
            direction: 'read'
        };

        this.testFramework.putConfigBinding(testBinding);

        this.testFramework._OnRead(dict({
            'AIN0': 0,
            'AIN1': 1
        }));

        var update1 = this.testJquery.updates[0];
        test.notDeepEqual(update1, undefined);
        test.deepEqual(update1.element, '#ain-0');
        test.deepEqual(update1.html, 0);

        var update2 = this.testJquery.updates[1];
        test.notDeepEqual(update2, undefined);
        test.deepEqual(update2.element, '#ain-1');
        test.deepEqual(update2.html, 1);

        test.done();
    },

    testConfigBindingSimpleWrite: function (test) {
        var testDevice = new TestDevice();
        this.testFramework._SetSelectedDevices([testDevice]);

        this.testFramework.on('onRegisterWritten', function () {
            var writeOp = testDevice.writings[0];
            test.deepEqual(writeOp.register, 'DAC0');
            test.deepEqual(writeOp.value, 1);
            test.ok(true);
            test.done();
        });

        this.testJquery.nextVal = 1;

        testBinding = {
            class: 'ain-inputs',
            template: 'dac-0',
            binding: 'DAC0',
            direction: 'write',
            event: 'change'
        };

        this.testFramework.putConfigBinding(testBinding);

        var newEvent = this.testJquery.events[0];
        test.notDeepEqual(newEvent, undefined);

        test.deepEqual(newEvent.event, 'change');
        newEvent.listener();
    },

    testConfigBindingComplexWrite: function (test) {
        var testDevice = new TestDevice();
        this.testFramework._SetSelectedDevices([testDevice]);

        this.testFramework.on('onRegisterWritten', function () {
            var writeOp = testDevice.writings[0];
            test.deepEqual(writeOp.register, 'DAC0');
            test.deepEqual(writeOp.value, 1);
            test.ok(true);
            test.done();
        });

        this.testJquery.nextVal = 1;

        testBinding = {
            class: 'ain-inputs',
            template: 'dac-#(0:1)',
            binding: 'DAC#(0:1)',
            direction: 'write',
            event: 'change'
        };

        this.testFramework.putConfigBinding(testBinding);

        var newEvent = this.testJquery.events[0];
        test.equal(this.testJquery.events.length, 2);
        test.notDeepEqual(newEvent, undefined);

        test.deepEqual(newEvent.event, 'change');
        newEvent.listener();
    }
};
