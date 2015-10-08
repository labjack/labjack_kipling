/*

This file is playing around with manually using the NPM library to allow users
to publish npm modules that are a logging strategy/reporter.

*/
var npm = require("npm");


function getCurrentModules() {
	npm.ls(function(err, data) {
		console.log('Finished LS', Object.keys(data.dependencies));
		getVersionData();
	});
}

function getVersionData() {
	npm.commands.view(["LabJack-nodejs"], function(err, data) {
		var key = Object.keys(data);

		console.log('Finished getVersionData', Object.keys(data[key[0]]));
	});
}

npm.load({}, function (er) {
  	if (er) return handlError(er);
  // npm.commands.install(["some", "args"], function (er, data) {
  //   if (er) return commandFailed(er);
  //   // command succeeded, and data might have some info
  //   start();
  // });
	npm.registry.log.removeAllListeners("log");
	npm.registry.log.on("log", function (message) {
		// console.log(message);
	});
	// getCurrentModules();
});

var RegClient = require('npm-registry-client');

var uri = "https://registry.npmjs.org/ljswitchboard-ljm_device_curator";
var params = {timeout: 1000};

var npmlog = require('npmlog');
npmlog.level = 'silent';
var client = new RegClient({'alwaysAuth': true, log:npmlog});
client.get(uri, params, function (error, data, raw, res) {
  // error is an error if there was a problem.
  // data is the parsed data object
  // raw is the json string
  // res is the response from couch
  var versions = Object.keys(data.versions);
  var latestVersion = versions[versions.length - 1];

  console.log('NPM Data', versions, latestVersion);
});