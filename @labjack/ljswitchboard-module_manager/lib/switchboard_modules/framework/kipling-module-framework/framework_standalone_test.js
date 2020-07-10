var q = require('q');
var rewire = require('rewire');

var framework_standalone = rewire('./framework_standalone');


module.exports = {

    testFireAndResolve: function (test) {
        var testEvent = 'testEvent';
        var eventFired = null;
        var frameworkProvidedToEvent = null;

        var fakeFire = function (event, framework) {
            var innerDeferred = q.defer();
            eventFired = event;
            frameworkProvidedToEvent = framework;
            innerDeferred.resolve();
            return innerDeferred.promise;
        };
        var testFramework = {
            fire: fakeFire
        };
        var testEnvironment = {
            framework: testFramework
        };
        var testDeferred = q.defer();
        var testPromise = testDeferred.promise;

        testPromise.then(function () {
            test.deepEqual(eventFired, testEvent);
            test.deepEqual(frameworkProvidedToEvent, testFramework);
            test.done();
        });

        framework_standalone.fireAndResolve(
            testEvent,
            testEnvironment,
            testDeferred
        );
    },

    testPrepareFramework: function (test) {
        var testEnvironment = {};
        framework_standalone.prepareFramework(testEnvironment)
        .then(function (environment) {
            test.notDeepEqual(environment.framework, null);
            test.notDeepEqual(environment.framework, undefined);
            test.done();
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
            test.deepEqual(environment.moduleInfo, testModuleInfo);
            test.done();
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
            test.deepEqual(environment.module.name, 'kipling-module-framework');
            test.deepEqual(providedLocalLoc, '/test-name/controller');
            test.done();
        });
    },

    testLoadModuleCallbacks: function (test) {
        test.done();
    },

    testLoadDevice: function (test) {
        test.done();
    },

    testCreateInterface: function (test) {
        test.done();
    },

    testStartFrameworkLoop: function (test) {
        test.done();
    },

    testOnUserExit: function (test) {
        test.done();
    }

};