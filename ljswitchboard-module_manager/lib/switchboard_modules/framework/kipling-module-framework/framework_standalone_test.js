var q = require('q');
var rewire = require('rewire');

var framework_standalone = rewire('./framework_standalone');


module.exports = {

    testFireAndResolve: function (test) {
        var testEvent = 'testEvent';
        var eventFired = null;
        var frameworkProvidedToEvent = null;

        var fakeFire = function (event, framework) {
            eventFired = event;
            frameworkProvidedToEvent = framework;
            return Promise.resolve();
        };
        var testFramework = {
            fire: fakeFire
        };
        var testEnvironment = {
            framework: testFramework
        };

        const testPromise = new Promise((resolve, reject) => {
                framework_standalone.fireAndResolve(
                    testEvent,
                    testEnvironment,
                    resolve,
                    reject
                );
            })
            .then(function () {
                assert.deepEqual(eventFired, testEvent);
                assert.deepEqual(frameworkProvidedToEvent, testFramework);
                done();
            });
    },

    testPrepareFramework: function (test) {
        var testEnvironment = {};
        framework_standalone.prepareFramework(testEnvironment)
        .then(function (environment) {
            test.notDeepEqual(environment.framework, null);
            test.notDeepEqual(environment.framework, undefined);
            done();
        });
    },

    testLoadModuleInfo: function (test) {
        var moduleRequested = null;
        var testEnvironment = {};
        var testModuleInfo = 'test info';

        framework_standalone.__set__('fs_facade', {
            getModuleInfo: function (name, onError, onSuccess) {
                moduleRequested = name;
                onSuccess(testModuleInfo);
            }
        });

        framework_standalone.loadModuleInfo(testEnvironment)
        .then(function (environment) {
            assert.deepEqual(environment.moduleInfo, testModuleInfo);
            done();
        });
    },

    testLoadModuleLogic: function (test) {
        var testModuleName = 'test-name';
        var providedLocalLoc;
        var environment = {
            moduleInfo: {name: testModuleName}
        };

        framework_standalone.__set__('fs_facade', {
            getExternalURI: function (localLoc) {
                providedLocalLoc = localLoc;
                return './package.json';
            }
        });

        framework_standalone.loadModuleLogic(environment)
        .then(function (environment) {
            assert.deepEqual(environment.module.name, 'kipling-module-framework');
            assert.deepEqual(providedLocalLoc, '/test-name/controller');
            done();
        });
    },

    testLoadModuleCallbacks: function (test) {
        done();
    },

    testLoadDevice: function (test) {
        done();
    },

    testCreateInterface: function (test) {
        done();
    },

    testStartFrameworkLoop: function (test) {
        done();
    },

    testOnUserExit: function (test) {
        done();
    }

};
