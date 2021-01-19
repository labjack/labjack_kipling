/**
 * Automated tests for the presenter framework.
 *
 * @author: Chris Johnson (LabJack, 2014)
 * @author: Sam Pottinger (LabJack, 2014)
**/


const rewire = require('rewire');
const presenter_framework = rewire('./presenter_framework.js');

function TestJQuery() {

    this.events = [];
    this.updates = [];
    this.nextVal = null;
    this.nextSerials = [];

    this.on = function (element, event, listener) {
        this.events.push({element: element, event: event, listener: listener});
    };

    this.html = function (element, newHTML) {
        this.updates.push({element: element, html: newHTML});
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
                };
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
        this.readAddresses = addresses;
        return Promise.resolve(this.readResults);
    };
}


module.exports = {
    setUp: function (callback) {
        this.testFramework = new presenter_framework.PresenterFramework();
        this.testJquery = new TestJQuery();
        this.testFramework._SetJQuery(this.testJquery);
        callback();
    },

    testOn: function (test) {
        this.testFramework.on('onModuleLoad', function() {
            done();
        });
        this.testFramework.fire('onModuleLoad');
    },

    testOnOverwrite: function (test) {
        this.testFramework.on('onModuleLoad', function() {
            assert.isOk(false);
        });
        this.testFramework.on('onModuleLoad', function() {
            done();
        });
        this.testFramework.fire('onModuleLoad');

    },

    testOnNonExist: function (test) {
        this.testFramework.on('onLoadError', function () {
            done();
        });
        this.testFramework.on('something fake', function() {
            assert.isOk(false);
        });
    },

    testFireNonExist: function (test) {
        this.testFramework.fire('something fake');
        done();
    },

    testFire: function (test) {
        this.testFramework.on('onModuleLoad', function (framework, arg1, arg2) {
            assert.deepEqual(arg1, 'test1');
            assert.deepEqual(arg2, 'test2');
            done();
        });
        this.testFramework.fire('onModuleLoad', ['test1', 'test2']);
    },

    testSetRefreshRate: function (test) {
        this.testFramework.setRefreshRate(2000);
        assert.equal(this.testFramework.refreshRate, 2000);
        done();
    },

    testSetConfigControls: function (test) {
        configControls = [
            { selector: '.test-class', event: 'click' },
            { selector: '#test-id', event: 'change' }
        ];
        this.testFramework.setConfigControls(configControls);
        assert.deepEqual(this.testFramework.configControls, configControls);
        done();
    },

    testPutConfigBindingIncomplete: function (test) {
        this.testFramework.on('onLoadError', function () {
            assert.isOk(true);
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
        assert.isOk(bindingInvalid);
        done();
    },

    testPutConfigBindingInvalidDirection: function (test) {
        this.testFramework.on('onLoadError', function () {
            assert.isOk(true);
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
        assert.isOk(bindingInvalid);
        done();
    },

    testPutConfigBindingNew: function (test) {
        this.testFramework.on('onLoadError', function () {
            assert.isOk(false);
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

        assert.deepEqual(
            this.testFramework.bindings.get(testTemplate),
            testBinding
        );
        done();
    },

    testPutConfigBindingExists: function (test) {
        this.testFramework.on('onLoadError', function () {
            assert.isOk(false);
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

        assert.deepEqual(
            this.testFramework.bindings.get(testTemplate),
            bindingEnd
        );
        done();

    },

    testDeleteConfigBindingExists: function (test) {
        this.testFramework.on('onLoadError', function () {
            assert.isOk(false);
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

        assert.isOk(bindingInvalid);
        done();
    },

    testDeleteConfigBindingNotExists: function (test) {
        this.testFramework.on('onLoadError', function () {
            assert.isOk(true);
            done();
        });

        testTemplate = 'testTemplate';
        this.testFramework.deleteConfigBinding(testTemplate);
    },

    testSetDeviceViewNotFound: function (test) {
        this.testFramework.on('onLoadError', function () {
            assert.isOk(true);
            done();
        });

        presenter_framework.__set__('fs_facade', {
            renderTemplate: function (location, context, onError, onSuccess) {
                assert.deepEqual(location, 'test external URI');
                onError('Could not find file.');
            },
            getExternalURI: function (name) {
                assert.deepEqual(name, 'test URI');
                return 'test external URI';
            }
        });

        this.testFramework.setDeviceView('test URI');
    },

    testSetDeviceViewWithoutJSON: function (test) {
        this.testFramework.on('onLoadError', function (err) {
            assert.isOk(false);
            console.log(err);
        });

        presenter_framework.__set__('fs_facade', {
            renderTemplate: function (location, context, onError, onSuccess) {
                assert.deepEqual(location, 'test external URI');
                done();
                onSuccess();
            },
            getExternalURI: function (name) {
                assert.deepEqual(name, 'test URI');
                return 'test external URI';
            }
        });

        this.testFramework.setDeviceView('test URI');
    },

    testSetDeviceViewWithSON: function (test) {
        this.testFramework.on('onLoadError', function () {
            assert.isOk(false);
        });

        presenter_framework.__set__('fs_facade', {
            renderTemplate: function (location, context, onError, onSuccess) {
                assert.deepEqual(location, 'test external URI');
                assert.deepEqual(context.json.testLoc, {'test': 1});
                done();
                onSuccess();
            },
            getExternalURI: function (name) {
                const ALLOWED_NAMES = ['test URI', 'testLoc.json'];
                assert.isOk(ALLOWED_NAMES.indexOf(name) != -2);
                return 'test external URI';
            },
            getJSON: function(location, onError, onSuccess) {
                onSuccess({'test': 1});
            }
        });

        this.testFramework.setDeviceView('test URI', ['testLoc.json']);
    },

    testGetSelectedDevice: function (test) {
        const testDevice = new TestDevice();
        this.testFramework._SetSelectedDevices([testDevice]);
        assert.deepEqual(this.testFramework.getSelectedDevice(), testDevice);
        done();
    },

    testEstablishConfigControlBindings: function (test) {
        this.testFramework.on('onRegisterWrite', function () {
            assert.isOk(true);
            done();
        });

        this.testFramework.setConfigControls([
            { selector: '.test-class', event: 'click' }
        ]);

        this.testFramework.establishConfigControlBindings();

        const newEvent = this.testJquery.events[0];
        test.notDeepEqual(newEvent, undefined);

        assert.deepEqual(newEvent.event, 'click');
        newEvent.listener();
    },

    testStopLoop: function (test) {
        this.testFramework.runLoop = true;
        this.testFramework.stopLoop();
        assert.equal(this.testFramework.runLoop, false);
        done();
    },

    testStartLoop: function (test) {
        const self = this;
        this.testFramework.loopIteration = function () {
            assert.isOk(self.testFramework.runLoop);
            done();
        };
        this.testFramework.startLoop();
    },

    testLoopIteration: function (test) {
        const self = this;
        const testDevice = new TestDevice();
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

                const update1 = self.testJquery.updates[0];
                test.notDeepEqual(update1, undefined);
                assert.deepEqual(update1.element, '#ain-0');
                assert.deepEqual(update1.html, 0);

                const update2 = self.testJquery.updates[1];
                test.notDeepEqual(update2, undefined);
                assert.deepEqual(update2.element, '#ain-1');
                assert.deepEqual(update2.html, 1);

                assert.equal(valuesDict.get('AIN0'), 0);
                assert.equal(valuesDict.get('AIN1'), 1);

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

        this.testFramework._OnRead(new Map({
            'AIN0': 0
        }));

        const update = this.testJquery.updates[0];
        test.notDeepEqual(update, undefined);
        assert.deepEqual(update.element, '#ain-0');
        assert.deepEqual(update.html, 0);
        done();
    },

    testConfigBindingComplexRead: function (test) {
        testBinding = {
            class: 'ain-inputs',
            template: 'ain-#(0:1)',
            binding: 'AIN#(0:1)',
            direction: 'read'
        };

        this.testFramework.putConfigBinding(testBinding);

        this.testFramework._OnRead(new Map({
            'AIN0': 0,
            'AIN1': 1
        }));

        const update1 = this.testJquery.updates[0];
        test.notDeepEqual(update1, undefined);
        assert.deepEqual(update1.element, '#ain-0');
        assert.deepEqual(update1.html, 0);

        const update2 = this.testJquery.updates[1];
        test.notDeepEqual(update2, undefined);
        assert.deepEqual(update2.element, '#ain-1');
        assert.deepEqual(update2.html, 1);

        done();
    },

    testConfigBindingSimpleWrite: function (test) {
        const testDevice = new TestDevice();
        this.testFramework._SetSelectedDevices([testDevice]);

        this.testFramework.on('onRegisterWritten', function () {
            const writeOp = testDevice.writings[0];
            assert.deepEqual(writeOp.register, 'DAC0');
            assert.deepEqual(writeOp.value, 1);
            assert.isOk(true);
            done();
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

        const newEvent = this.testJquery.events[0];
        test.notDeepEqual(newEvent, undefined);

        assert.deepEqual(newEvent.event, 'change');
        newEvent.listener();
    },

    testConfigBindingComplexWrite: function (test) {
        const testDevice = new TestDevice();
        this.testFramework._SetSelectedDevices([testDevice]);

        this.testFramework.on('onRegisterWritten', function () {
            const writeOp = testDevice.writings[0];
            assert.deepEqual(writeOp.register, 'DAC0');
            assert.deepEqual(writeOp.value, 1);
            assert.isOk(true);
            done();
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

        const newEvent = this.testJquery.events[0];
        assert.equal(this.testJquery.events.length, 2);
        test.notDeepEqual(newEvent, undefined);

        assert.deepEqual(newEvent.event, 'change');
        newEvent.listener();
    }
};
