/**
 * Goals for the dashboard module.
 * To replace the current device_overview module with inline-edit options &
 * read the current device values w/o modifying the devices current state. 
 *
 * @author Chris Johnson (LabJack Corp, 2014)
 * @author Sam Pottinger (LabJack Corp, 2013)
 *
 * Configuration:
 * No configuration of the device is required
 *
 * Periodic Processes:
 *     1. Read from AIN(0:13) to update analog input channels
 *     2. Read from DAC(0:1) to update DAC outputs (if device gets changed via 
 *         script or other user)
 *     3. Read FIO/EIO/CIO/MIO_STATE and FIO/EIO/CIO/MIO_DIRECTION bit masks to
 *         update/display dio channels
**/

/* jshint undef: true, unused: true, undef: true */
/* jshint strict: false */
/* global console, $, ljmmm_parse, device_controller */
/* global customSpinners, getDeviceDashboardController */
/* global sprintf */

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 1000;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    this.moduleConstants = {};
    this.REGISTER_OVERLAY_SPEC = {};
    this.startupRegList = {};
    this.interpretRegisters = {};

    this.moduleContext = {};
    this.activeDevice = undefined;
    this.deviceInfo = {
        type: '',
        version: '',
        fullType: ''
    };

    this.currentValues = new Map();
    this.newBufferedValues = new Map();
    this.bufferedOutputValues = new Map();

    this.deviceDashboardController = undefined;

    this.spinnerController = undefined;
    
    this.roundReadings = function(reading) {
        return Math.round(reading*1000)/1000;
    };
    //Should start using the device.configIO(channelName, attribute, value) function.
    this.writeReg = function(address,value) {
        return self.activeDevice.qWrite(address,value)
            .then(function(){
                self.bufferedOutputValues.set(address,value);
            }, function(err){
                console.error('Dashboard-writeReg',address,err);
            });
    };
    

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        // device_controller.ljm_driver.writeLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS',5000);
        // Save Module Constant objects
        self.moduleConstants = framework.moduleConstants;
        self.startupRegList = framework.moduleConstants.startupRegList;
        self.interpretRegisters = framework.moduleConstants.interpretRegisters;
        self.REGISTER_OVERLAY_SPEC = framework.moduleConstants.REGISTER_OVERLAY_SPEC;

        // Save the customSmartBindings to the framework instance.
        // framework.putSmartBindings(customSmartBindings);

        self.createProcessConfigStatesAndDirections();
        onSuccess();
    };

    /*
     * This function does what?
     */
    this.createProcessConfigStatesAndDirections = function () {
        var registersByDirectionReg = new Map();
        var registersByStateReg = new Map();
        var registersToExpand;

        /* Step 1 in expanding the LJM registers. */
        registersToExpand = self.interpretRegisters.filter(function (reg) {
            return reg.stateReg;
        });

        /* Expand the LJM registers */
        registersToExpand.map(function (reg) {
            var names = ljmmm_parse.expandLJMMMEntrySync(
                {name: reg.name, address: 0, type: 'FLOAT32'}
                ).map(function (entry) { return entry.name; });
            var regList;

            // Set up a mapping by the state reg
            regList = registersByStateReg.get(reg.stateReg) || [];
            regList = regList.concat(names.map(function (name, index) {
                return {
                    name: name,
                    stateReg: reg.stateReg,
                    directionReg: reg.directionReg,
                    index: index
                };
            }));
            registersByStateReg.set(reg.stateReg, regList);

            // Set up a mapping by the direction reg
            regList = registersByDirectionReg.get(reg.directionReg) || [];
            regList = regList.concat(names.map(function (name, index) {
                return {
                    name: name,
                    stateReg: reg.stateReg,
                    directionReg: reg.directionReg,
                    index: index
                };
            }));
            registersByDirectionReg.set(reg.directionReg, regList);
        });
        
        var handleStates = function (states, address, viewRegInfoDict) {
            var registers = registersByStateReg.get(address) || [];
            registers.forEach(function (register) {
                var state = states >> register.index & 0x1;
                var viewRegInfo = viewRegInfoDict.get(register.name) || {};
                viewRegInfo.state = state;
                viewRegInfo.type = 'dynamic';
                viewRegInfoDict.set(register.name, viewRegInfo);
            });
        };

        var handleDirections = function (directions, address, viewRegInfoDict) {
            var registers = registersByDirectionReg.get(address) || [];
            registers.forEach(function (register) {
                var direction = directions >> register.index & 0x1;
                var viewRegInfo = viewRegInfoDict.get(register.name) || {};
                viewRegInfo.direction = direction;
                viewRegInfoDict.set(register.name, viewRegInfo);
            });
        };

        var handleOther = function (value, address, viewRegInfoDict) {
            var viewRegInfo = viewRegInfoDict.get(address) || {};
            viewRegInfo.value = value;
            if(address.indexOf('DAC') !== -1) {
                viewRegInfo.type = 'analogOutput';
            } else {
                viewRegInfo.type = 'analogInput';
            }
            viewRegInfoDict.set(address, viewRegInfo);
        };

        var hasText = function (haystack, needle) {
            return haystack.indexOf(needle) != -1;
        };

        self.processConfigStatesAndDirections = function (registers, onSuccess) {
            var viewRegInfoDict = new Map();
            registers.forEach(function (regValue, regAddress) {
                if (hasText(regAddress, 'STATE')) {
                    handleStates(regValue, regAddress, viewRegInfoDict);
                } else if (hasText(regAddress, 'DIRECTION')) {
                    handleDirections(regValue, regAddress, viewRegInfoDict);
                } else {
                    handleOther(regValue, regAddress, viewRegInfoDict);
                }
            });
            onSuccess(viewRegInfoDict);
        };
    };
    
    /**
     * Function is called once every time a user selects a new device.  
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        var dacSpinnerInfo = [
            {spinnerID:'DAC0-device_input_spinner', reg: 'DAC0'},
            {spinnerID:'DAC1-device_input_spinner', reg: 'DAC1'},
        ];
        if(device.savedAttributes.deviceTypeName === 'T7') {
            dacSpinnerInfo.push({spinnerID:'DAC0_input_spinner', reg: 'DAC0'});
            dacSpinnerInfo.push({spinnerID:'DAC1_input_spinner', reg: 'DAC1'});
        }
        self.spinnerController = new customSpinners(self, dacSpinnerInfo,self.writeReg);
        self.activeDevice = device;

        // var dt = device.savedAttributes.deviceTypeName;
        // var ds = device.savedAttributes.subclass;
        self.deviceInfo.fullType = device.savedAttributes.productType;
        self.deviceInfo.deviceTypeName = device.savedAttributes.deviceTypeName;

        // TEMPORARY SWITCH!
        // if(device.savedAttributes.deviceTypeName === 'T4') {
        //     self.deviceInfo.fullType = 'T5';
        //     self.deviceInfo.deviceTypeName = 'T5';
        // }

        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');

        // Get new deviceDashboardController instance
        console.log('initializing the GUI stuffs', self.deviceInfo);
        self.deviceDashboardController = new getDeviceDashboardController(self.deviceInfo, framework.moduleData);
        
        // Load file resources required for deviceDashboardController
        self.deviceDashboardController.loadResources();

        onSuccess();
    };

    var DASHBOARD_DATA_COLLECTOR_UID = 'dashboard-v2';
    this.datacollectorRunning = false;
    this.dataCollectorDevice = undefined;
    this.dataCache = {};
    function frameworkDataUpdateHandler(data) {
        // console.log('We got new data!', data);
        // Update the dataCache
        var channels = Object.keys(data);
        channels.forEach(function(channelName) {
            var channelData = data[channelName];
            var keys = Object.keys(channelData);
            keys.forEach(function(key) {
                var newValue = channelData[key];
                self.dataCache[channelName][key] = newValue;
            });
        });
        
        self.deviceDashboardController.updateValues_v2(channels, data, self.dataCache);
        // console.log('Updated dataCache', self.dataCache);
    }
    function startDashboardDataCollector(device, onSuccess, onError) {
        self.dataCollectorDevice = device;
        self.dataCollectorDevice.dashboard_start(DASHBOARD_DATA_COLLECTOR_UID)
        .then(function(res) {
            console.log('We started the collector', res);
            self.dataCache = res.data;
            // Register an event handler with the data-update event.
            self.dataCollectorDevice.on('DASHBOARD_DATA_UPDATE', frameworkDataUpdateHandler);

            self.datacollectorRunning = true;
            onSuccess();
        })
        .catch(function(err) {
            console.error('We had an error starting the collector, err', err);
            onError();
        });
    }
    function stopDashboardDataCollector(onSuccess, onError) {
        if(self.datacollectorRunning) {
            self.dataCollectorDevice.dashboard_stop(DASHBOARD_DATA_COLLECTOR_UID)
            .then(function(res) {
                self.datacollectorRunning = false;
                console.log('We stopped the collector', res);

                // Register an event handler with the data-update event.
                self.dataCollectorDevice.removeListener('DASHBOARD_DATA_UPDATE', frameworkDataUpdateHandler);

                onSuccess();
            })
            .catch(function(err) {
                self.datacollectorRunning = false;
                console.error('We had an error stopping the collector, err', err);
                onError();
            });
        } else {
            console.log('We did not stop the collector.');
            onSuccess();
        }
    }
    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        // Start the data collector.
        startDashboardDataCollector(device, onSuccess, onError);
    };

    this.formatVoltageTooltip = function(value) {
        return sprintf.sprintf("%.2f V", value);
    };
    
    this.isStringIn = function(baseStr, findStr) {
        return baseStr.indexOf(findStr) !== -1;
    };

    function ioChangeListener(event, isFlex) {
        console.log('in ioChangeListener');

        // Initialize a few variables.
        var parentEl, id, activeReg, outputDisplayId;
        var className = event.toElement.className;
        var baseEl = event.toElement;

        console.log('className', className, 'baseEl', baseEl);

        // Determine what kind of event we are dealing with.  The two choices
        // are: 'menuOption' and 'toggleButton'.
        if (self.isStringIn(className, 'menuOption')) {
            // Do some html DOM traversing because of life...
            parentEl = baseEl.parentElement.parentElement.parentElement;
            id = parentEl.id;

            // Now that we have the parent element, lets toss it into jQuery.
            var parentObj = $('#'+parentEl.parentElement.id);
            var strVal = baseEl.innerHTML;
            var val = baseEl.attributes.value.value;
            var splitEls = id.split('-');
            activeReg = splitEls[0];
            var selectType = splitEls[1];
            if(selectType === 'device') {
                selectType = splitEls[2];
            }

            console.log('Determining next thing?', selectType);
            // Determine if we are altering the 'STATE', 'DIRECTION' or 'MODE'.
            if (selectType === 'DIRECTION') {
                var curValObj = $('#'+id).find('.currentValue');
                var curDirection = {
                    'Input':0,
                    'Output':1
                }[curValObj.text()];
                if(curDirection != val) {
                    //Update GUI & write/read values to device
                    curValObj.text(strVal);

                    var inputDisplayId = '.digitalDisplayIndicator';
                    outputDisplayId = '.digitalStateSelectButton';
                    var outObj = parentObj.find(outputDisplayId);
                    var inObj = parentObj.find(inputDisplayId);
                    // Switch to perform either a read (if channel is becoming 
                    // an input) or a write (if channel is becoming an output)
                    if(Number(val) === 0) {
                        outObj.hide();
                        inObj.show();
                        // Perform device read
                        self.activeDevice.qRead(activeReg)
                        .then(function(val) {
                            // Update GUI with read value
                            var inputStateId = '.digitalDisplayIndicator .currentValue';
                            var inputStateObj = parentObj.find(inputStateId);
                            var state = {
                                '0': {'status': 'inactive', 'text': 'Low'},
                                '1': {'status': 'active', 'text': 'High'}
                            }[val.toString()];
                            inputStateObj.removeClass('active inactive')
                            .addClass(state.status);
                            inputStateObj.html(state.text);
                        },function(err) {
                            console.error('Error Reading',activeReg,err);
                        });
                    } else {
                        inObj.hide();
                        outObj.show();
                        var outputStateId = '.digitalStateSelectButton .currentValue';
                        var outputStateObj = parentObj.find(outputStateId);
                        outputStateObj.html('High');

                        // Perform device write, force to be high at start
                        self.writeReg(activeReg,1)
                        .then(function() {
                        },function(err) {
                            console.error('Error Writing to',activeReg,err);
                        });
                    }
                }
            } else if (selectType === 'STATE') {
                var curValueObj = $('#'+id).find('.currentValue');
                // Object to interpret text to device numbers
                var curState = {
                    'Low':0,
                    'High':1
                }[curValueObj.text()];
                if(curState != val) {
                    //Update GUI
                    curValueObj.text(strVal);

                    // Perform device write with user selected value
                    self.writeReg(activeReg,Number(val))
                    .then(function() {
                    },function(err) {
                        console.error('Error Setting State of',activeReg,err);
                    });
                }
            } else if (selectType === 'MODE') {
                var curValObj = $('#'+id).find('.currentValue');

                var curMode = {
                    'Analog': 0,
                    'Input': 1,
                    'Output': 2,
                }[curValObj.text()];

                if(curMode != val) {
                    var newMode = strVal;
                    //Update GUI & write/read values to device
                    curValObj.text(strVal); 

                    var currentDisplayID;
                    var currentDisplayObj;

                    var newDisplayID;
                    var newDisplayObj;

                    var modeToClassID = {
                        'Analog': '.analogDisplayIndicator',
                        'Input': '.digitalDisplayIndicator',
                        'Output': '.digitalStateSelectButton',
                    };
                    // currentDisplayID = modeToClassID[curMode];
                    // newDisplayID = modeToClassID[newMode];
                    // currentDisplayObj = parentObj.find(currentDisplayID);
                    // newDisplayObj = parentObj.find(newDisplayID);
                    // currentDisplayObj.hide();
                    // newDisplayObj.show();
                    var analogInObj = parentObj.find(modeToClassID.Analog);
                    var digitalInObj = parentObj.find(modeToClassID.Input);
                    var digitalOutObj = parentObj.find(modeToClassID.Output);

                    
                    // Switch to determine the appropriate action based on
                    // switching to each of the 3 modes.
                    // console.log('Displaying New Mode', newMode);
                    if(newMode === 'Analog') {
                        // Hide the digital In/Out text and display the AIN text.
                        digitalInObj.hide();
                        digitalOutObj.hide();
                        analogInObj.show();

                        // configure the channel as an analog input
                        // console.log('Configuring as analog input', activeReg);
                        self.activeDevice.dashboard_configIO(activeReg, 'analogEnable', 'enable')
                        .then(function(res) {
                            // We have configured the channel as an analog input.
                            // we can either read an AIN value and update the
                            // text on the page or wait ~1sec and let the primary
                            // daq loop collect & update the value.

                            // // Perform device read to get the latest AIN value.
                            // self.activeDevice.qRead(activeReg)
                            // .then(function(val) {
                            //     var ainValID = '.ainValue';
                            //     var ainValObj = newDisplayObj.find(ainValID);
                            //     ainValObj.text(val);
                            // });
                        }, function(err) {
                            console.error('Error configuring IO', err);
                        });
                    } else if(newMode === 'Input') {
                        // Hide the analog & dig. out text & show the dig. In text.
                        analogInObj.hide();
                        digitalOutObj.hide();
                        digitalInObj.show();

                        // Configure the device to be a digital input.
                        var steps = [];
                        steps.push({channelName: activeReg, attribute: 'analogEnable', value: 'disable'});
                        steps.push({channelName: activeReg, attribute: 'digitalDirection', value: 'input'});

                        // Execute the steps.
                        async.eachSeries(steps,
                            function(step, cb) {
                                self.activeDevice.dashboard_configIO(
                                    step.channelName,
                                    step.attribute,
                                    step.value
                                ).then(function(result) {
                                    results.push(result);
                                    cb();
                                }, function(err) {
                                    results.push(err);
                                    cb();
                                });
                            },
                            function(err) {
                                // console.log('Configured as input!', results);
                                // Perform device read
                                self.activeDevice.qRead(activeReg)
                                .then(function(val) {
                                    // Update GUI with read value
                                    var inputStateId = '.digitalDisplayIndicator .currentValue';
                                    var inputStateObj = parentObj.find(inputStateId);
                                    var state = {
                                        '0': {'status': 'inactive', 'text': 'Low'},
                                        '1': {'status': 'active', 'text': 'High'}
                                    }[val.toString()];
                                    inputStateObj.removeClass('active inactive')
                                    .addClass(state.status);
                                    inputStateObj.html(state.text);
                                },function(err) {
                                    console.error('Error Reading',activeReg,err);
                                });
                            });
                    } else if(newMode === 'Output'){
                        // console.log('Switching from', curMode, 'to', newMode);
                        // console.warn('TODO: There is an issue switching from analog to digital output. LJM Error 2501.')
                        analogInObj.hide();
                        digitalInObj.hide();
                        digitalOutObj.show();

                        var outputStateId = '.digitalStateSelectButton .currentValue';
                        var outputStateObj = parentObj.find(outputStateId);
                        outputStateObj.html('High');

                        // Configure the device to be a digital input. (Define steps).
                        var steps = [];
                        var results = [];
                        if(curMode === 0) {
                            steps.push({channelName: activeReg, attribute: 'analogEnable', value: 'disable'});
                            steps.push({channelName: activeReg, attribute: 'digitalDirection', value: 'input'});
                            steps.push({channelName: activeReg, attribute: 'digitalDirection', value: 'output'});
                            steps.push({channelName: activeReg, attribute: 'digitalState', value: 'high'});
                        } else {
                            steps.push({channelName: activeReg, attribute: 'analogEnable', value: 'disable'});
                            steps.push({channelName: activeReg, attribute: 'digitalDirection', value: 'output'});
                            steps.push({channelName: activeReg, attribute: 'digitalState', value: 'high'});
                        }

                        // Execute the steps.
                        async.eachSeries(steps,
                            function(step, cb) {
                                self.activeDevice.dashboard_configIO(
                                    step.channelName,
                                    step.attribute,
                                    step.value
                                ).then(function(result) {
                                    results.push(result);
                                    cb();
                                }, function(err) {
                                    results.push(err);
                                    cb();
                                });
                            },
                            function(err) {
                                console.log('Configured as output!', activeReg, results);
                            });
                    }
                   
                }
                // console.log('val', val);
                // console.log('In Mode...curValObj', curValObj, 'curDirection', curDirection, 'text', curValObj.text());
            }
        } else if (self.isStringIn(className, 'toggleButton')) {
            parentEl = baseEl.parentElement;
            id = parentEl.id;
            activeReg = id.split('-')[0];
            var location = id.split('-')[1];
            var registerName = activeReg;
            if(location === 'device') {
                registerName += location;
            }
            var curStr = baseEl.innerHTML;
            //Set to opposite of actual to toggle the IO line
            var newVal = {'High':0,'Low':1}[curStr];
            var newStr = {'Low':'High','High':'Low'}[curStr];
            outputDisplayId = '#' + registerName + '-STATE-SELECT .currentValue';
            
            // Update GUI
            $(outputDisplayId).text(newStr);

            // Perform device write with the opposite value that is currently 
            // displayed by the gui, to "toggle" the output state
            self.writeReg(activeReg,Number(newVal))
            .then(function() {
            },function(err) {
                console.error('Error Toggling State of',activeReg,err);
            });
        }
    }

    function digitalParentClickHandler(event) {
        try {
            var ioEventType = '';
            var isFlexIO = false;
            if(event.target.className === "menuOption") {
                // We clicked a menu option...
                // console.log('We Clicked a menu option');
                // Get the IO Control Type
                ioEventType = event.toElement.parentElement.parentElement.parentElement.parentElement.className;
                isFlexIO = false;
                if(ioEventType === 'digitalControlObject') {
                    isFlexIO = true;
                } else if(ioEventType === '') {
                    isFlexIO = false;
                }
                ioChangeListener(event,isFlexIO);
            } else if(event.target.className === "btn currentValue toggleButton") {
                // console.log('We clicked a toggle button');
                // Get the IO Control Type (DIO or Flex).
                ioEventType = event.toElement.parentElement.parentElement.parentElement.parentElement.className;
                isFlexIO = false;
                if(ioEventType === 'digitalControlObject') {
                    isFlexIO = true;
                } else if(ioEventType === '') {
                    isFlexIO = false;
                }
                ioChangeListener(event,isFlexIO);
            }
        } catch(err) {
            console.error('(dashboard_v2/controller.js) Error in digitalParentClickHandler', err);
        }
    }
    this.attachIOListeners = function() {
        var digitalParentObj = $('#device-view #dashboard');
        digitalParentObj.unbind();
        digitalParentObj.bind('click', digitalParentClickHandler);
    };
    this.removeIOListeners = function() {
        var digitalParentObj = $('#device-view #dashboard');
        digitalParentObj.unbind();
    };

    this.dioChangeListner = function(event) {
        // Save a copy of the event for debugging purposes.
        self.dioEvent = event;

        var isFlexIO = false;
        try {
            ioChangeListener(event, isFlexIO);
        } catch(err) {
            console.log('Error calling ioChangeListener', isFlexIO);
        }
    };

    this.attachDIOListners = function() {
        var digitalObj = $('.digitalControlObject');
        digitalObj.unbind();
        digitalObj.bind('click', self.dioChangeListner);
    };

    this.flexIOChangeListener = function(event) {
        // Save a copy of the event for debugging purposes.
        self.flexIOEvent = event;

        var isFlexIO = true;
        try {
            ioChangeListener(event, isFlexIO);
        } catch(err) {
            console.log('Error calling ioChangeListener', isFlexIO);
        }
    };
    this.attachFlexIOListeners = function() {
        var flexObjects = $('.flexIOControlObject');
        flexObjects.unbind();
        flexObjects.bind('click', self.flexIOChangeListener);
    };
    this.onTemplateLoaded = function(framework, onError, onSuccess) {
       onSuccess();
    };
    this.onTemplateDisplayed = function(framework, onError, onSuccess) {
        self.deviceDashboardController.drawDevice('#device-display-container', self.dataCache);
        self.deviceDashboardController.drawDBs('#db-display-container', self.dataCache);
        self.spinnerController.createSpinners();

        // Set the value for the spinners.
        var regs = ['DAC0','DAC1'];
        regs.forEach(function(reg){
            var setV = self.dataCache[reg].val;
            self.spinnerController.writeDisplayedVoltage(reg,setV);
        });

        // Register click listeners to DIO and Flex channels.
        // self.attachDIOListners();
        // self.attachFlexIOListeners();
        self.attachIOListeners();

        onSuccess();
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        onSuccess();
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        var extraData = new Map();
        // Save buffered output values to the dict.
        self.bufferedOutputValues.forEach(function(value,name){
            self.currentValues.set(name,value);
            self.bufferedOutputValues.delete(name);
        });

        // Check to see if any _STATE or _DIRECTION bit masks have changed.  If
        // so add their counterpart as a later function needs all relevant
        // information.
        self.newBufferedValues.forEach(function(value,name){
            var getName, getVal;
            if(name.indexOf('_STATE') > 0) {
                getName = name.split('_STATE')[0] + '_DIRECTION';
                getVal = self.currentValues.get(getName);
                extraData.set(getName,getVal);
            } else if(name.indexOf('_DIRECTION') > 0) {
                getName = name.split('_DIRECTION')[0] + '_STATE';
                getVal = self.currentValues.get(getName);
                extraData.set(getName,getVal);
            }
        });
        // Only add the counterpart-data if it isn't already there
        extraData.forEach(function(value,name){
            if(!self.newBufferedValues.has(name)) {
                self.newBufferedValues.set(name,value);
            }
        });

        // Execute function that expands all read bit-mask registers into 
        // individually indexed (by register name) objects.  Also intelligently 
        // combines data by channel for convenience.
        self.processConfigStatesAndDirections(self.newBufferedValues, function(newData){
            if(typeof(self.deviceDashboardController) !== 'undefined') {
                self.deviceDashboardController.updateValues(newData,self.currentValues);

                //Delete Changed Values & update last-saved device values
                self.newBufferedValues.forEach(function(value,name){
                    self.currentValues.set(name,value);
                    self.newBufferedValues.delete(name);
                });
            }
            onSuccess();
        });
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        console.log('in onCloseDevice');
        console.log('Removing Listener');
        
        // Stop the listeners...
        self.removeIOListeners();

        // self.activeDevice.setDebugFlashErr(false);
        try {
            delete self.deviceDashboardController;
            self.deviceDashboardController = undefined;
            $('#dashboard').remove();
        } catch (err) {
            console.log('Error Deleting Data',err);
        }
        stopDashboardDataCollector(onSuccess, onError);
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        console.log('in onUnloadModule');
        stopDashboardDataCollector(onSuccess, onError);
    };
    this.onLoadError = function(framework, description, onHandle) {
        console.log('in onLoadError', description);
        onHandle(true);
    };
    this.onWriteError = function(framework, registerName, value, description, onHandle) {
        console.log('in onConfigError', description);
        onHandle(true);
    };
    this.onRefreshError = function(framework, registerNames, description, onHandle) {
        console.log('in onRefreshError', description);
        if(typeof(description.retError) === 'number') {
            console.log('in onRefreshError',device_controller.ljm_driver.errToStrSync(description.retError));
        } else {
            console.log('Type of error',typeof(description.retError),description.retError);
        }
        onHandle(true);
    };

    var self = this;
}
