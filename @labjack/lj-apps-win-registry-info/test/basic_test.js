
var get_registry_info;

var requiredKeys = {
    'LJLogUD': ['workdir'],
    'LJStreamUD': ['workdir'],
    'LJLogM': ['workdir'],
    'LJStreamM': ['workdir'],
}
exports.tests = {
	'require lib': function(test) {
		get_registry_info = require('../lib/get_registry_info');
		test.done();
	},
	'get application info': function(test) {
		var ljAppNames = get_registry_info.ljAppNames;
        get_registry_info.getLJAppsRegistryInfo(ljAppNames, function(err, info) {
            if(err) {
                console.error(err);
                test.ok(false, 'should not have recieved an error');
            } else {
                test.ok(true);
                console.log('Registry Info:', info);

                var appNames = Object.keys(info);
                appNames.forEach(function(appName) {
                    var appKeys = Object.keys(info[appName]);
                    if(requiredKeys[appName]) {
                        var reqAppKeys = requiredKeys[appName];
                        reqAppKeys.forEach(function(reqAppKey) {
                            test.ok(appKeys.indexOf(reqAppKey) >= 0, 'Missing required registry key for app: '+appName+', key: '+reqAppKey);
                        });
                    }
                });
                test.done();
            }
        });
	},
};