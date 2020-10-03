var assert = require('chai').assert;

var ds_util = require('../lib/device_scanner_util');

describe('unit tests', function() {
    it('Starting Unit Tests', function (done) {
        console.log('');
        console.log('*** Starting Unit Tests ***');
        done();
    });
    it('doConnectionsIncludeConnection empty', function (done) {
        var conns = [];
        var test_conn = {'serialNumber': 1234, 'connectionType': 'USB'};
        assert.isOk(!ds_util.doConnectionsIncludeConnection(conns, test_conn));
        done();
    });
    it('doConnectionsIncludeConnection wrong serial', function (done) {
        var conns = [{'serialNumber': 4321, 'connectionType': 'USB'}];
        var test_conn = {'serialNumber': 1234, 'connectionType': 'USB'};
        assert.isOk(!ds_util.doConnectionsIncludeConnection(conns, test_conn));
        done();
    });
    it('doConnectionsIncludeConnection wrong conn', function (done) {
        var conns = [{'serialNumber': 1234, 'connectionType': 'WIFI'}];
        var test_conn = {'serialNumber': 1234, 'connectionType': 'USB'};
        assert.isOk(!ds_util.doConnectionsIncludeConnection(conns, test_conn));
        done();
    });
    it('doConnectionsIncludeConnection single match', function (done) {
        var conns = [{'serialNumber': 1234, 'connectionType': 'USB'}];
        var test_conn = {'serialNumber': 1234, 'connectionType': 'USB'};
        assert.isOk(ds_util.doConnectionsIncludeConnection(conns, test_conn));
        done();
    });
});
