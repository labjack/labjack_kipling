
var ds_util = require('../lib/device_scanner_util');

exports.tests = {
    'Starting Unit Tests': function(test) {
        console.log('');
        console.log('*** Starting Unit Tests ***');
        test.done();
    },
    'doConnectionsIncludeConnection empty': function(test) {
        var conns = [];
        var test_conn = {'serialNumber': 1234, 'connectionType': 'USB'};
        test.ok(!ds_util.doConnectionsIncludeConnection(conns, test_conn));
        test.done();
    },
    'doConnectionsIncludeConnection wrong serial': function(test) {
        var conns = [{'serialNumber': 4321, 'connectionType': 'USB'}];
        var test_conn = {'serialNumber': 1234, 'connectionType': 'USB'};
        test.ok(!ds_util.doConnectionsIncludeConnection(conns, test_conn));
        test.done();
    },
    'doConnectionsIncludeConnection wrong conn': function(test) {
        var conns = [{'serialNumber': 1234, 'connectionType': 'WIFI'}];
        var test_conn = {'serialNumber': 1234, 'connectionType': 'USB'};
        test.ok(!ds_util.doConnectionsIncludeConnection(conns, test_conn));
        test.done();
    },
    'doConnectionsIncludeConnection single match': function(test) {
        var conns = [{'serialNumber': 1234, 'connectionType': 'USB'}];
        var test_conn = {'serialNumber': 1234, 'connectionType': 'USB'};
        test.ok(ds_util.doConnectionsIncludeConnection(conns, test_conn));
        test.done();
    },
};
