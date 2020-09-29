var assert = require('chai').assert;

var get_registry_info;

var requiredKeys = {
    'LJLogUD': ['workdir'],
    'LJStreamUD': ['workdir'],
    'LJLogM': ['workdir'],
    'LJStreamM': ['workdir'],
};

describe('basic_test', function() {
    it('require lib', function(done) {
		get_registry_info = require('../lib/get_registry_info');
		done();
    });
    it('get application info', function(done) {
		var ljAppNames = get_registry_info.ljAppNames;
        get_registry_info.getLJAppsRegistryInfo(ljAppNames, function(err, info) {
            if(err) {
                console.error(err);
                assert.isOk(false, 'should not have recieved an error');
            } else {
                assert.isOk(true);
                console.log('Registry Info:', info);

                var appNames = Object.keys(info);
                appNames.forEach(function(appName) {
                    var appKeys = Object.keys(info[appName]);
                    if(requiredKeys[appName]) {
                        var reqAppKeys = requiredKeys[appName];
                        reqAppKeys.forEach(function(reqAppKey) {
                            assert.isOk(appKeys.indexOf(reqAppKey) >= 0, 'Missing required registry key for app: '+appName+', key: '+reqAppKey);
                        });
                    }
                });
                done();
            }
        });
    });

});
