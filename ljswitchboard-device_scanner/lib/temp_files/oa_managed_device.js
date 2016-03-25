function createManagedDevice(openedDevice, openParameters) {
    this.openedDevice = openedDevice;
    var deviceHandle = openedDevice.handle;
    if(DEBUG_MANAGED_DEVICE) {
        console.log('Creating Managed Device', deviceHandle, openParameters);
    }

    this.log = function() {
        if(DEBUG_MANAGED_DEVICE) {
            console.log.apply(this, arguments);
        }
    };
    // Save initialization data to this context.
    this.handle = deviceHandle;
    this.openParameters = openParameters;

    // Variable indicating whether or not this device was opened by the device
    // scanner.
    this.openedByScanner = false;

    // Initialize a variable that will be the curated device.
    this.curatedDevice = undefined;

    // Initialize a variety of parameters related to a device.
    this.serialNumber = 0;
    this.deviceType = 0;
    this.connectionType = 0;
    this.port = 0;
    
    // Initialize variables related to the state of the managed device.
    this.requiredDeviceAddresses = [];
    this.cachedDeviceResults = {};
    this.collectingDeviceData = false;
    this.collectedDeviceData = false;

    this.dataCollectionDeferedResolved = false;
    this.dataCollectionDefered = undefined;
    function stopCollectingDeviceData() {
        if(self.collectingDeviceData) {
            // Report that the device is finished collecting data.
            self.collectedDeviceData = true;
            self.collectingDeviceData = false;

            self.dataCollectionDefered.resolve();
        }
    }

    // This is a "debugging" function that prints out the important attributes
    // of the data being queried from a device.
    function printCollectedDeviceData(results) {
        var dataToKeep = {
            'AIN0': 'val',
            'FIRMWARE_VERSION': 'val',
            'WIFI_IP': 'str',
            'ETHERNET_IP': 'str',
            'WIFI_RSSI': 'str',
            'WIFI_VERSION': 'val',
            'SERIAL_NUMBER': 'val',
            'HARDWARE_INSTALLED': 'productType',
        };
        var vals = [];
        results.forEach(function(result) {
            result = result.data;
            var data = {};
            var keyToKeep = 'res';
            if(dataToKeep[result.name]) {
                keyToKeep = dataToKeep[result.name];
            }
            data[result.name] = result.res;
            if(result[keyToKeep]) {
                data[result.name] = result[keyToKeep];
            }
            vals.push(data);
        });

        if(DEBUG_COLLECTED_DEVICE_DATA) {
            console.log('Connection Type', self.curatedDevice.savedAttributes.connectionTypeName);
            console.log('Serial Number', self.curatedDevice.savedAttributes.serialNumber);
            console.log('Read Data', self.curatedDevice.getDevice().handle,':');
            console.log(vals);
        }
    }
    function printCuratedDeviceInfo() {
        var data = {
            'H': self.curatedDevice.savedAttributes.handle,
            'SN': self.curatedDevice.savedAttributes.serialNumber,
            'IP': self.curatedDevice.savedAttributes.ipAddress,
            'Port': self.curatedDevice.savedAttributes.port,
            'CTs': self.curatedDevice.savedAttributes.connectionTypeString,
        };
        self.log(' *** Info: ', data);
    }
    function printCachedDeviceData() {
        var keys = Object.keys(self.cachedDeviceResults);
        self.log('*** Cached device data', keys);   
    }
    // Define various functions to be used as curated device event listeners.
    function curatedDeviceDisconnected(eventData) {
        self.log(' *** Handle', self.handle, 'triggered event: DEVICE_DISCONNECTED', eventData.name, eventData.operation);
    }
    function curatedDeviceReconnected(eventData) {
        self.log(' *** Handle', self.handle, 'triggered event: DEVICE_RECONNECTED', eventData.name, eventData.operation);
    }
    function curatedDeviceError(eventData) {
        self.log(' *** Handle', self.handle, 'triggered event: DEVICE_ERROR', eventData.code, eventData.name, eventData.operation);
        printCuratedDeviceInfo();
        printCachedDeviceData();
    }
    function curatedDeviceReconnecting(eventData) {
        self.log(' *** Handle', self.handle, 'triggered event: DEVICE_RECONNECTING', eventData.name, eventData.operation);
    }
    function cureatedDeviceAttributesChanged(eventData) {
        self.log(' *** Handle', self.handle, 'triggered event: DEVICE_ATTRIBUTES_CHANGED', eventData.name, eventData.operation);
    }

    // Define a function that links the device manager to several of the 
    // curated device's events.
    function linkToCuratedDeviceEvents() {
        self.curatedDevice.on(
            'DEVICE_DISCONNECTED',
            curatedDeviceDisconnected
        );
        self.curatedDevice.on(
            'DEVICE_RECONNECTED',
            curatedDeviceReconnected
        );
        self.curatedDevice.on(
            'DEVICE_ERROR',
            curatedDeviceError
        );
        self.curatedDevice.on(
            'DEVICE_RECONNECTING',
            curatedDeviceReconnecting
        );
        self.curatedDevice.on(
            'DEVICE_ATTRIBUTES_CHANGED',
            cureatedDeviceAttributesChanged
        );
    }

    // Define a function that unlinks the device manager from several of the 
    // curated device's events.
    function unlinkFromCuratedDeviceEvents() {
        self.curatedDevice.removeListener(
            'DEVICE_DISCONNECTED',
            curatedDeviceDisconnected
        );
        self.curatedDevice.removeListener(
            'DEVICE_RECONNECTED',
            curatedDeviceReconnected
        );
        self.curatedDevice.removeListener(
            'DEVICE_ERROR',
            curatedDeviceError
        );
        self.curatedDevice.removeListener(
            'DEVICE_RECONNECTING',
            curatedDeviceReconnecting
        );
        self.curatedDevice.removeListener(
            'DEVICE_ATTRIBUTES_CHANGED',
            cureatedDeviceAttributesChanged
        );
    }

    // Save Data to the cached device results object...
    function saveCollectedDeviceData(results) {
        self.log('Finished Collecting Data from Device:', self.handle);

        // Loop through each of the results.
        results.forEach(function(result) {
            // De-reference the actual data
            var data = result.data;

            // Determine what register was saved
            var name = data.name;

            // Save the data to the cached device results object.
            self.cachedDeviceResults[name] = data;
        });
    }

    function deviceHandleDataCollectionTimeout() {
        self.log('Data collection from a handle is taking a long time... Aborting', deviceHandle);
        printCuratedDeviceInfo();

        // Report that the device is finished collecting data.
        stopCollectingDeviceData();
    }

    // Link supplied device handle to the curated device object 
    // and collect the required information from the device.
    function innerCollectDeviceData(infoToCache) {
        var defered = q.defer();
        self.dataCollectionDefered = defered;

        self.log('Collecting Data from a handle', self.handle);
        
        // Indicate that this device was opened by the device scanner.
        self.openedByScanner = true;

        var deviceHandle = self.handle;
        var dt = self.openParameters.deviceType;
        var ct = self.openParameters.connectionType;
        var id = self.openParameters.identifier;

        // Initialize a curated device object.
        self.curatedDevice = new device_curator.device();

        // Link the device handle to the curated device object.
        self.curatedDevice.linkToHandle(deviceHandle, dt, ct, id)
        .then(function finishedLinkingHandle(res) {
            self.log(
                'Finished linking to a handle',
                deviceHandle,
                self.curatedDevice.savedAttributes.connectionTypeName
            );
            
            // Create a data collection timeout.
            var collectionTimeout = setTimeout(
                deviceHandleDataCollectionTimeout,
                DEVICE_DATA_COLLECTION_TIMEOUT
            );

            // Attach event listeners to the curated device.
            linkToCuratedDeviceEvents();
            console.log('reading multiple...', deviceHandle);
            // Collect information from the curated device.
            self.curatedDevice.iReadMultiple(infoToCache)
            .then(function finishedCollectingData(results) {
                // Clear the data collection timeout
                clearTimeout(collectionTimeout);

                self.log('Collecting data from a handle', deviceHandle);
                printCollectedDeviceData(results);
                saveCollectedDeviceData(results);

                // Report that the device is finished collecting data.
                stopCollectingDeviceData();
            }, function(err) {
                self.log('Error collecting data from a handle', deviceHandle, err);

                // Report that the device is finished collecting data.
                stopCollectingDeviceData();
            });
        }, function errorLinkingHandle(err) {
            console.error('Error linking to handle...');
            defered.resolve();
        });
        return defered.promise;
    }

    // This function gets called to cache the device results.  It returns a 
    // promise that gets resolved when the results are finished being collected.
    this.collectDeviceData = function(infoToCache) {
        var promise = undefined;
        // If the device isn't already collecting data and that it hasn't 
        // already been collected.
        if((!self.collectingDeviceData) && (!self.collectedDeviceData)) {
            self.collectingDeviceData = true;
            self.cachedDeviceResults = {};
            promise = innerCollectDeviceData(infoToCache);
        } else {
            // If we are already collecting data/it has already been collected 
            // than just return a promise that has been resolved.
            var defered = q.defer();
            defered.resolve();
            promise = defered.promise;
        }
        return promise;
    };

    function curatedDeviceDataCollectionTimeout() {
        self.log('Data collection from a handle is taking a long time... Aborting...', deviceHandle);
        printCuratedDeviceInfo();

        // Report that the device is finished collecting data.
        stopCollectingDeviceData();
    }

    function innerCollectDataFromCuratedDevice(curatedDevice, infoToCache) {
        var defered = q.defer();
        self.dataCollectionDefered = defered;

        self.log('Collecting data from a curated device');
        // Indicate that this device was not opened by the device scanner.
        self.openedByScanner = false;

        // Save a reference to the curatedDevice
        self.curatedDevice = curatedDevice;
        var ljmDevice = curatedDevice.getDevice();
        var deviceHandle = ljmDevice.handle;

        // Create a data collection timeout.
        var collectionTimeout = setTimeout(
            curatedDeviceDataCollectionTimeout,
            DEVICE_DATA_COLLECTION_TIMEOUT
        );

        // Attach event listeners to the curated device.
        linkToCuratedDeviceEvents();

        // Collect information from the curated device.
        self.curatedDevice.iReadMultiple(infoToCache)
            .then(function finishedCollectingData(results) {
                // Clear the data collection timeout
                clearTimeout(collectionTimeout);

                printCollectedDeviceData(results);
                saveCollectedDeviceData(results);

                // Report that the device is finished collecting data.
                stopCollectingDeviceData();
            }, function(err) {
                self.log('Error collecting data from a curatedDevice', deviceHandle, err);

                // Report that the device is finished collecting data.
                stopCollectingDeviceData();
            });
        return defered.promise;
    }

    this.collectDataFromCuratedDevice = function(curatedDevice, infoToCache) {
        var promise = undefined;

        // If the device isn't already collecting data and that it hasn't 
        // already been collected.
        if((!self.collectingDeviceData) && (!self.collectedDeviceData)) {
            self.collectingDeviceData = true;
            self.cachedDeviceResults = {};
            
            promise = innerCollectDataFromCuratedDevice(
                curatedDevice,
                infoToCache
            );
        } else {
            // If we are already collecting data/it has already been collected 
            // than just return a promise that has been resolved.
            var defered = q.defer();
            defered.resolve();
            promise = defered.promise;
        }
        return promise;
    };

    this.closeDevice = function() {
        var promise = undefined;

        // Un-link the events that the device manager attached to the curated
        // device.
        unlinkFromCuratedDeviceEvents();

        
        if(self.openedByScanner) {
            self.log('Closing Device', self.handle);
            // If the device scanner opened the device than we should close the
            // device.
            promise = self.curatedDevice.close();
        } else {
            self.log('Not Closing Device', self.handle);
            // If the device was opened else where and passed to the device
            // scanner as a curated device then we should not close it.

            self.curatedDevice = undefined;

            var defered = q.defer();
            defered.resolve();
            promise = defered.promise;
        }
        return promise;
    };

    var self = this;
}