var dict = require('dict');
var q = require('q');
var async = require('async');

var process_manager = require('LabJack-process_manager');
var managedProcess;




// function createNewDeviceManager() {
//     var self = this;
// }
// var deviceManager;

exports.createManager = function() {
    // deviceManager = new createNewDeviceManager();
    managedProcess = new process_manager.master_process();
    managedProcess.init();
    
    return managedProcess.qStart('./slave');
};
exports.sendReceive = function(m) {
    return managedProcess.sendReceive(m);
};
exports.sendTestMessage = function() {
    var sendTestMessageDefered = q.defer();
    managedProcess.sendReceive({'arbitraryData': 'testMessage from master'})
    .then(function(res) {
        print('sendTestMessage success', res);
        sendTestMessageDefered.resolve(res);
    }, function(err) {
        print('sendTestMessage error', err);
        sendTestMessageDefered.reject(err);
    });
    return sendTestMessageDefered.promise;
};
exports.stopManager = function() {
    return managedProcess.qStop();
};
