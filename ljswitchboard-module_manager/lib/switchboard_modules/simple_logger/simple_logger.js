function loggerApp() {
	this.simpleLogger;
	this.deviceManager;
	this.logConfigs;

	this.initializeLogger = function(){
		debugLog('--- In Func: initializeLogger');
		var defered = q.defer();

		self.simpleLogger = simple_logger.create();
		attachListeners(self.simpleLogger);

		// Intentionally delay to allow user to read start-up message.
		setTimeout(function() {
			self.simpleLogger.initialize()
			.then(function(res) {
				debugLog('--- App Initialized',res);
				defered.resolve();
			}, function(err) {
				console.error('Failed to initialize the logger',err);
				defered.resolve();
			});
		}, 5000);
		
		
		return defered.promise;
	};
	this.initializeDeviceManager = function() {
		debugLog('--- In Func: initializeDeviceManager');
		var defered = q.defer();
		self.deviceManager = device_manager.create();

		self.deviceManager.connectToDevices([{
			dt:'LJM_dtANY',
			ct:'LJM_ctANY',
			id:'LJM_idANY',
		}])
		.then(function(res) {
			debugLog('--- Connected to devices!',res);
			defered.resolve();
		}, function(err) {
			console.error('Failed to connect to devices',err);
			defered.resolve();
		});
		return defered.promise;
	};
	this.updateDeviceListing = function() {
		debugLog('--- In Func: updateDeviceListing');
		debugLog('Connected Devices', self.deviceManager.getDevices());
		var defered = q.defer();
		self.simpleLogger.updateDeviceListing(self.deviceManager.getDevices())
		.then(function(res) {
			debugLog('Device listing has been passwd to the logger',res);
			defered.resolve();
		}, function(err) {
			console.error('Failed to save the device listing to the logger',err);
			defered.resolve();
		});
		return defered.promise;
	};
	this.configureLogger = function() {
		debugLog('--- In Func: configureLogger');
		var defered = q.defer();

		/*
		Old config:
		{
			'configType': 'filePath',
			'filePath': logger_config_file_path
		}
		*/
		self.logConfigs = simple_logger.generateBasicConfig({
			'same_vals_all_devices': true,
			'registers': ['AIN0','AIN1'],
			'update_rate_ms': 100,
		},self.deviceManager.getDevices());

		var fs = require('fs');
		fs.writeFile(template_logger_config_file,JSON.stringify(self.logConfigs,null,2),function(err) {
			if(err) {
				console.error('Error saving generated configs');
			} else {
				debugLog('Data was appended to the config file.');
			}
			self.simpleLogger.configureLogger({
				'configType': 'filePath',
				'filePath': template_logger_config_file
			})
			// self.simpleLogger.configureLogger({
			// 	configType: 'object',
			// 	configData: self.logConfigs,
			// 	filePath: cwd
			// })
			.then(function(res) {
				debugLog('Logger has been configured.',res)
				defered.resolve();
			}, function(err) {
				console.error('Logger failed to be configured.',err)
				defered.resolve();
			});
		});

		


		
		return defered.promise;
	}
	this.startLogger = function() {
		debugLog('--- In Func: startLogger');
		var defered = q.defer();
		self.simpleLogger.once(eventMap.STOPPED_LOGGER, function(stopData) {
			debugLog('Logger Stopped');
			// console.log('(hello_world.js) Logger has stopped!!')
			defered.resolve();
		});
		self.simpleLogger.startLogger()
		.then(function succ() {
			
			debugLog('Logger Started');
		}, function err() {
			
			debugLog('Logger Started with error');
		});
		return defered.promise;
	}
	this.waitForLoggerToRun = function() {
		debugLog('--- In Func: waitForLoggerToRun');
		var defered = q.defer();
		defered.resolve();
		return defered.promise;
	}
	this.closeDevices = function() {
		var defered = q.defer();
		self.deviceManager.closeDevices()
		.then(defered.resolve, defered.reject);
		return defered.promise;
	}
	this.finish = function() {
		debugLog('--- In Func: finish');
		var defered = q.defer();
		// setTimeout(defered.resolve, 1000);
		defered.resolve();
		return defered.promise;
	}
	var self = this;
}
