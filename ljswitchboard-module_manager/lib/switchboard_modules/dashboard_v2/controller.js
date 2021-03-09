'use strict';

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

const async = require('async');

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
// const MODULE_UPDATE_PERIOD_MS = 1000;
const DASHBOARD_DATA_COLLECTOR_UID = 'dashboard-v2';

const hasText = (haystack, needle) => {
    return haystack.indexOf(needle) !== -1;
};

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
class DashboardController {

    constructor() {
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

        this.datacollectorRunning = false;
        this.dataCollectorDevice = undefined;
        this.dataCache = {};
    }

    roundReadings(reading) {
        return Math.round(reading*1000)/1000;
    }

    //Should start using the device.configIO(channelName, attribute, value) function.
    writeReg(address, value) {
        return this.activeDevice.qWrite(address, value)
            .then(() => {
                this.bufferedOutputValues.set(address, value);
            }, (err) => {
                console.error('Dashboard-writeReg', address, err);
            });
    }

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {Function} onSuccess   Function to be called when complete.
    **/
    onModuleLoaded(framework, onError, onSuccess) {
        // device_controller.ljm_driver.writeLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS',5000);
        // Save Module Constant objects
        this.moduleConstants = framework.moduleConstants;
        this.startupRegList = framework.moduleConstants.startupRegList;
        this.interpretRegisters = framework.moduleConstants.interpretRegisters;
        this.REGISTER_OVERLAY_SPEC = framework.moduleConstants.REGISTER_OVERLAY_SPEC;

        // Save the customSmartBindings to the framework instance.
        // framework.putSmartBindings(customSmartBindings);

        this.createProcessConfigStatesAndDirections();
        onSuccess();
    }

    /*
     * This function does what?
     */
    createProcessConfigStatesAndDirections() {
        const registersByDirectionReg = new Map();
        const registersByStateReg = new Map();

        /* Step 1 in expanding the LJM registers. */
        const registersToExpand = this.interpretRegisters.filter((reg) => {
            return reg.stateReg;
        });

        /* Expand the LJM registers */
        registersToExpand.map((reg) => {
            const names = ljmmm_parse
                .expandLJMMMEntrySync({name: reg.name, address: 0, type: 'FLOAT32'})
                .map((entry) => { return entry.name; });

            // Set up a mapping by the state reg
            const regList1 = (registersByStateReg.get(reg.stateReg) || [])
                .concat(names
                    .map((name, index) => {
                        return {
                            name: name,
                            stateReg: reg.stateReg,
                            directionReg: reg.directionReg,
                            index: index
                        };
                    })
                );
            registersByStateReg.set(reg.stateReg, regList1);

            // Set up a mapping by the direction reg
            const regList = (registersByDirectionReg.get(reg.directionReg) || [])
                .concat(names
                    .map((name, index) => {
                        return {
                            name: name,
                            stateReg: reg.stateReg,
                            directionReg: reg.directionReg,
                            index: index
                        };
                    })
                );
            registersByDirectionReg.set(reg.directionReg, regList);
        });
        
        const handleStates = (states, address, viewRegInfoDict) => {
            const registers = registersByStateReg.get(address) || [];
            registers.forEach((register) => {
                const state = states >> register.index & 0x1;
                const viewRegInfo = viewRegInfoDict.get(register.name) || {};
                viewRegInfo.state = state;
                viewRegInfo.type = 'dynamic';
                viewRegInfoDict.set(register.name, viewRegInfo);
            });
        };

        const handleDirections = (directions, address, viewRegInfoDict) => {
            const registers = registersByDirectionReg.get(address) || [];
            registers.forEach((register) => {
                const direction = directions >> register.index & 0x1;
                const viewRegInfo = viewRegInfoDict.get(register.name) || {};
                viewRegInfo.direction = direction;
                viewRegInfoDict.set(register.name, viewRegInfo);
            });
        };

        const handleOther = (value, address, viewRegInfoDict) => {
            const viewRegInfo = viewRegInfoDict.get(address) || {};
            viewRegInfo.value = value;
            if (address.indexOf('DAC') !== -1) {
                viewRegInfo.type = 'analogOutput';
            } else {
                viewRegInfo.type = 'analogInput';
            }
            viewRegInfoDict.set(address, viewRegInfo);
        };

        this.processConfigStatesAndDirections = (registers, onSuccess) => {
            const viewRegInfoDict = new Map();
            registers.forEach((regValue, regAddress) => {
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
    }
    
    /**
     * Function is called once every time a user selects a new device.  
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {Function} onError     Function to be called if an error occurs.
     * @param  {Function} onSuccess   Function to be called when complete.
    **/
    onDeviceSelected(framework, device, onError, onSuccess) {
        const dacSpinnerInfo = [
            {spinnerID:'DAC0-device_input_spinner', reg: 'DAC0'},
            {spinnerID:'DAC1-device_input_spinner', reg: 'DAC1'},
        ];
        if (device.savedAttributes.deviceTypeName === 'T7') {
            dacSpinnerInfo.push({spinnerID:'DAC0_input_spinner', reg: 'DAC0'});
            dacSpinnerInfo.push({spinnerID:'DAC1_input_spinner', reg: 'DAC1'});
        }
        this.spinnerController = new customSpinners(this, dacSpinnerInfo, (address, value) => this.writeReg(address, value));
        this.activeDevice = device;

        // const dt = device.savedAttributes.deviceTypeName;
        // const ds = device.savedAttributes.subclass;
        this.deviceInfo.fullType = device.savedAttributes.productType;
        this.deviceInfo.deviceTypeName = device.savedAttributes.deviceTypeName;

        // TEMPORARY SWITCH!
        // if (device.savedAttributes.deviceTypeName === 'T4') {
        //     this.deviceInfo.fullType = 'T5';
        //     this.deviceInfo.deviceTypeName = 'T5';
        // }

        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');

        // Get new deviceDashboardController instance
        console.log('initializing the GUI stuffs', this.deviceInfo);
        this.deviceDashboardController = new getDeviceDashboardController(this.deviceInfo, framework.moduleData);
        
        // Load file resources required for deviceDashboardController
        this.deviceDashboardController.loadResources();

        onSuccess();
    }

    frameworkDataUpdateHandler(data) {
        data = JSON.parse(JSON.stringify(data));
        // console.log('We got new data!', data);
        // Update the dataCache
        const channels = Object.keys(data);
        channels.forEach((channelName) => {
            const channelData = data[channelName];
            const keys = Object.keys(channelData);
            keys.forEach((key) => {
                const newValue = channelData[key];
                if (!this.dataCache[channelName]) {
                    this.dataCache[channelName] = {};
                }
                this.dataCache[channelName][key] = newValue;
            });
        });
        
        this.deviceDashboardController.updateValues_v2(channels, data, this.dataCache);
        // console.log('Updated dataCache', this.dataCache);
    }

    async startDashboardDataCollector(device, onSuccess, onError) {
        this.dataCollectorDevice = device;

        await new Promise((resolve, reject) => this.stopDashboardDataCollector(() => resolve(), () => reject()));

        this.dataCollectorDevice.dashboard_start(DASHBOARD_DATA_COLLECTOR_UID)
        .then((res) => {
            res = JSON.parse(JSON.stringify(res));
            console.log('F7', res);
            this.dataCache = res.data;
            // Register an event handler with the data-update event.
            this.dataCollectorDevice.on('DASHBOARD_DATA_UPDATE', event => this.frameworkDataUpdateHandler(event));

            this.datacollectorRunning = true;
            onSuccess();
        })
        .catch((err) => {
            console.error('We had an error starting the collector, err', err);
            onError();
        });
    }

    stopDashboardDataCollector(onSuccess, onError) {
        if (this.datacollectorRunning) {
            this.dataCollectorDevice.dashboard_stop(DASHBOARD_DATA_COLLECTOR_UID)
            .then((res) => {
                this.datacollectorRunning = false;
                console.log('We stopped the collector', res);

                // Register an event handler with the data-update event.
                this.dataCollectorDevice.removeListener('DASHBOARD_DATA_UPDATE', (event) => this.frameworkDataUpdateHandler(event));

                onSuccess();
            })
            .catch((err) => {
                this.datacollectorRunning = false;
                console.error('We had an error stopping the collector, err', err);
                onError();
            });
        } else {
            console.log('We did not stop the collector.');
            onSuccess();
        }
    }

    onDeviceConfigured(framework, device, setupBindings, onError, onSuccess) {
        // Start the data collector.
        this.startDashboardDataCollector(device, onSuccess, onError);
    }

    formatVoltageTooltip(value) {
        return sprintf.sprintf("%.2f V", value);
    }
    
    isStringIn(baseStr, findStr) {
        return baseStr.indexOf(findStr) !== -1;
    }

    ioChangeListener(event) {
        console.log('in ioChangeListener');

        // Initialize a few variables.
        const className = event.toElement.className;
        const baseEl = event.toElement;

        console.log('className', className, 'baseEl', baseEl);

        // Determine what kind of event we are dealing with.  The two choices
        // are: 'menuOption' and 'toggleButton'.
        if (this.isStringIn(className, 'menuOption')) {
            // Do some html DOM traversing because of life...
            const parentEl = baseEl.parentElement.parentElement.parentElement;
            const id = parentEl.id;

            // Now that we have the parent element, lets toss it into jQuery.
            const parentObj = $('#'+parentEl.parentElement.id);
            const strVal = baseEl.innerHTML;
            const val = baseEl.attributes.value.value;
            const splitEls = id.split('-');
            const activeReg = splitEls[0];
            const selectType = splitEls[1] === 'device' ? splitEls[2] : splitEls[1];

            console.log('Determining next thing?', selectType);
            // Determine if we are altering the 'STATE', 'DIRECTION' or 'MODE'.
            if (selectType === 'DIRECTION') {
                const curValObj = $('#'+id).find('.currentValue');
                const curDirection = {
                    'Input': 0,
                    'Output': 1
                }[curValObj.text()];
                if (curDirection !== parseInt(val)) {
                    //Update GUI & write/read values to device
                    curValObj.text(strVal);

                    const inputDisplayId = '.digitalDisplayIndicator';
                    const outputDisplayId = '.digitalStateSelectButton';
                    const outObj = parentObj.find(outputDisplayId);
                    const inObj = parentObj.find(inputDisplayId);
                    // Switch to perform either a read (if channel is becoming 
                    // an input) or a write (if channel is becoming an output)
                    if (Number(val) === 0) {
                        outObj.hide();
                        inObj.show();
                        // Perform device read
                        this.activeDevice.qRead(activeReg)
                            .then((val) => {
                                // Update GUI with read value
                                const inputStateId = '.digitalDisplayIndicator .currentValue';
                                const inputStateObj = parentObj.find(inputStateId);
                                const state = {
                                    '0': {'status': 'inactive', 'text': 'Low'},
                                    '1': {'status': 'active', 'text': 'High'}
                                }[val.toString()];
                                inputStateObj.removeClass('active inactive')
                                .addClass(state.status);
                                inputStateObj.html(state.text);
                            }, (err) => {
                                console.error('Error Reading',activeReg,err);
                            });
                    } else {
                        inObj.hide();
                        outObj.show();
                        const outputStateId = '.digitalStateSelectButton .currentValue';
                        const outputStateObj = parentObj.find(outputStateId);
                        outputStateObj.html('High');

                        // Perform device write, force to be high at start
                        this.writeReg(activeReg,1)
                            .then(() => {}, (err) => {
                                console.error('Error Writing to',activeReg,err);
                            });
                    }
                }
            } else if (selectType === 'STATE') {
                const curValueObj = $('#'+id).find('.currentValue');
                // Object to interpret text to device numbers
                const curState = {
                    'Low': 0,
                    'High': 1
                }[curValueObj.text()];

                if (curState !== parseInt(val)) {
                    //Update GUI
                    curValueObj.text(strVal);

                    // Perform device write with user selected value
                    this.writeReg(activeReg, Number(val))
                        .then(() => {}, (err) => {
                            console.error('Error Setting State of', activeReg, err);
                        });
                }
            } else if (selectType === 'MODE') {
                const curValObj = $('#'+id).find('.currentValue');

                const curMode = {
                    'Analog': 0,
                    'Input': 1,
                    'Output': 2,
                }[curValObj.text()];

                if (curMode !== parseInt(val)) {
                    const newMode = strVal;
                    //Update GUI & write/read values to device
                    curValObj.text(strVal); 

                    const modeToClassID = {
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
                    const analogInObj = parentObj.find(modeToClassID.Analog);
                    const digitalInObj = parentObj.find(modeToClassID.Input);
                    const digitalOutObj = parentObj.find(modeToClassID.Output);

                    
                    // Switch to determine the appropriate action based on
                    // switching to each of the 3 modes.
                    // console.log('Displaying New Mode', newMode);
                    if (newMode === 'Analog') {
                        // Hide the digital In/Out text and display the AIN text.
                        digitalInObj.hide();
                        digitalOutObj.hide();
                        analogInObj.show();

                        // configure the channel as an analog input
                        // console.log('Configuring as analog input', activeReg);
                        this.activeDevice.dashboard_configIO(activeReg, 'analogEnable', 'enable')
                            .then(() => {
                                // We have configured the channel as an analog input.
                                // we can either read an AIN value and update the
                                // text on the page or wait ~1sec and let the primary
                                // daq loop collect & update the value.

                                // // Perform device read to get the latest AIN value.
                                // this.activeDevice.qRead(activeReg)
                                // .then(function(val) {
                                //     const ainValID = '.ainValue';
                                //     const ainValObj = newDisplayObj.find(ainValID);
                                //     ainValObj.text(val);
                                // });
                            }, (err) => {
                                console.error('Error configuring IO', err);
                            });
                    } else if (newMode === 'Input') {
                        // Hide the analog & dig. out text & show the dig. In text.
                        analogInObj.hide();
                        digitalOutObj.hide();
                        digitalInObj.show();

                        // Configure the device to be a digital input.
                        const steps = [];
                        steps.push({channelName: activeReg, attribute: 'analogEnable', value: 'disable'});
                        steps.push({channelName: activeReg, attribute: 'digitalDirection', value: 'input'});

                        const results = [];
                        // Execute the steps.
                        async.eachSeries(steps,
                            (step, cb) => {
                                this.activeDevice.dashboard_configIO(
                                    step.channelName,
                                    step.attribute,
                                    step.value
                                ).then((result) => {
                                    results.push(result);
                                    cb();
                                }, (err) => {
                                    results.push(err);
                                    cb();
                                });
                            },
                            (err) => {
                                console.log('Configured as input!', err, results);
                                // Perform device read
                                this.activeDevice.qRead(activeReg)
                                .then((val) => {
                                    // Update GUI with read value
                                    const inputStateId = '.digitalDisplayIndicator .currentValue';
                                    const inputStateObj = parentObj.find(inputStateId);
                                    const state = {
                                        '0': {'status': 'inactive', 'text': 'Low'},
                                        '1': {'status': 'active', 'text': 'High'}
                                    }[val.toString()];
                                    inputStateObj.removeClass('active inactive')
                                    .addClass(state.status);
                                    inputStateObj.html(state.text);
                                }, (err) => {
                                    console.error('Error Reading',activeReg,err);
                                });
                            });
                    } else if (newMode === 'Output'){
                        // console.log('Switching from', curMode, 'to', newMode);
                        // console.warn('TODO: There is an issue switching from analog to digital output. LJM Error 2501.')
                        analogInObj.hide();
                        digitalInObj.hide();
                        digitalOutObj.show();

                        const outputStateId = '.digitalStateSelectButton .currentValue';
                        const outputStateObj = parentObj.find(outputStateId);
                        outputStateObj.html('High');

                        // Configure the device to be a digital input. (Define steps).
                        const steps = [];
                        const results = [];
                        if (curMode === 0) {
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
                            (step, cb) => {
                                this.activeDevice.dashboard_configIO(
                                    step.channelName,
                                    step.attribute,
                                    step.value
                                ).then((result) => {
                                    results.push(result);
                                    cb();
                                }, (err) => {
                                    results.push(err);
                                    cb();
                                });
                            },
                            (err) => {
                                console.error(err);
                                console.log('Configured as output!', activeReg, results);
                            });
                    }
                   
                }
                // console.log('val', val);
                // console.log('In Mode...curValObj', curValObj, 'curDirection', curDirection, 'text', curValObj.text());
            }
        } else if (this.isStringIn(className, 'toggleButton')) {
            const parentEl = baseEl.parentElement;
            const id = parentEl.id;
            const activeReg = id.split('-')[0];
            const location = id.split('-')[1];
            const registerName = (location === 'device') ?  activeReg + location : activeReg;
            const curStr = baseEl.innerHTML;
            //Set to opposite of actual to toggle the IO line
            const newVal = {'High':0,'Low':1}[curStr];
            const newStr = {'Low':'High','High':'Low'}[curStr];
            const outputDisplayId = '#' + registerName + '-STATE-SELECT .currentValue';
            
            // Update GUI
            $(outputDisplayId).text(newStr);

            // Perform device write with the opposite value that is currently 
            // displayed by the gui, to "toggle" the output state
            this.writeReg(activeReg, Number(newVal))
                .then(() => {}, (err) => {
                    console.error('Error Toggling State of',activeReg,err);
                });
        }
    }

    digitalParentClickHandler(event) {
        try {
            let ioEventType = '';
            let isFlexIO = false;
            if (event.target.className === "menuOption") {
                // We clicked a menu option...
                // console.log('We Clicked a menu option');
                // Get the IO Control Type
                ioEventType = event.toElement.parentElement.parentElement.parentElement.parentElement.className;
                isFlexIO = false;
                if (ioEventType === 'digitalControlObject') {
                    isFlexIO = true;
                } else if (ioEventType === '') {
                    isFlexIO = false;
                }
                this.ioChangeListener(event, isFlexIO);
            } else if (event.target.className === "btn currentValue toggleButton") {
                // console.log('We clicked a toggle button');
                // Get the IO Control Type (DIO or Flex).
                ioEventType = event.toElement.parentElement.parentElement.parentElement.parentElement.className;
                isFlexIO = false;
                if (ioEventType === 'digitalControlObject') {
                    isFlexIO = true;
                } else if (ioEventType === '') {
                    isFlexIO = false;
                }
                this.ioChangeListener(event,isFlexIO);
            }
        } catch(err) {
            console.error('(dashboard_v2/controller.js) Error in digitalParentClickHandler', err);
        }
    }

    attachIOListeners() {
        const digitalParentObj = $('#device-view #dashboard');
        digitalParentObj.unbind();
        digitalParentObj.bind('click', (event) => this.digitalParentClickHandler(event));
    }

    removeIOListeners() {
        const digitalParentObj = $('#device-view #dashboard');
        digitalParentObj.unbind();
    }

    dioChangeListener(event) {
        // Save a copy of the event for debugging purposes.
        this.dioEvent = event;

        const isFlexIO = false;
        try {
            this.ioChangeListener(event, isFlexIO);
        } catch(err) {
            console.log('Error calling ioChangeListener', isFlexIO);
        }
    }

    attachDIOListners() {
        const digitalObj = $('.digitalControlObject');
        digitalObj.unbind();
        digitalObj.bind('click', event => this.dioChangeListener(event));
    }

    flexIOChangeListener(event) {
        // Save a copy of the event for debugging purposes.
        this.flexIOEvent = event;

        const isFlexIO = true;
        try {
            this.ioChangeListener(event, isFlexIO);
        } catch(err) {
            console.log('Error calling ioChangeListener', isFlexIO);
        }
    }
    attachFlexIOListeners() {
        const flexObjects = $('.flexIOControlObject');
        flexObjects.unbind();
        flexObjects.bind('click', event => this.flexIOChangeListener(event));
    }
    onTemplateLoaded(framework, onError, onSuccess) {
       onSuccess();
    }
    onTemplateDisplayed(framework, onError, onSuccess) {
        this.deviceDashboardController.drawDevice('#device-display-container', this.dataCache);
        this.deviceDashboardController.drawDBs('#db-display-container', this.dataCache);
        this.spinnerController.createSpinners();

        // Set the value for the spinners.
        const regs = ['DAC0','DAC1'];
        regs.forEach((reg) => {
            if (!this.dataCache[reg]) {
                return;
            }
            const setV = this.dataCache[reg].val;
            this.spinnerController.writeDisplayedVoltage(reg,setV);
        });

        // Register click listeners to DIO and Flex channels.
        // this.attachDIOListners();
        // this.attachFlexIOListeners();
        this.attachIOListeners();

        onSuccess();
    }

    onRegisterWrite(framework, binding, value, onError, onSuccess) {
        onSuccess();
    }

    onRegisterWritten(framework, registerName, value, onError, onSuccess) {
        onSuccess();
    }

    onRefresh(framework, registerNames, onError, onSuccess) {
        onSuccess();
    }

    onRefreshed(framework, results, onError, onSuccess) {
        const extraData = new Map();
        // Save buffered output values to the dict.
        this.bufferedOutputValues.forEach((value, name) => {
            this.currentValues.set(name,value);
            this.bufferedOutputValues.delete(name);
        });

        // Check to see if any _STATE or _DIRECTION bit masks have changed.  If
        // so add their counterpart as a later function needs all relevant
        // information.
        this.newBufferedValues.forEach((value, name) => {
            if (name.indexOf('_STATE') > 0) {
                const getName = name.split('_STATE')[0] + '_DIRECTION';
                const getVal = this.currentValues.get(getName);
                extraData.set(getName, getVal);
            } else if (name.indexOf('_DIRECTION') > 0) {
                const getName = name.split('_DIRECTION')[0] + '_STATE';
                const getVal = this.currentValues.get(getName);
                extraData.set(getName, getVal);
            }
        });
        // Only add the counterpart-data if it isn't already there
        extraData.forEach((value, name) => {
            if (!this.newBufferedValues.has(name)) {
                this.newBufferedValues.set(name, value);
            }
        });

        // Execute function that expands all read bit-mask registers into 
        // individually indexed (by register name) objects.  Also intelligently 
        // combines data by channel for convenience.
        this.processConfigStatesAndDirections(this.newBufferedValues, (newData) => {
            if (typeof(this.deviceDashboardController) !== 'undefined') {
                this.deviceDashboardController.updateValues(newData,this.currentValues);

                //Delete Changed Values & update last-saved device values
                this.newBufferedValues.forEach((value,name) => {
                    this.currentValues.set(name,value);
                    this.newBufferedValues.delete(name);
                });
            }
            onSuccess();
        });
    }

    onCloseDevice(framework, device, onError, onSuccess) {
        console.log('in onCloseDevice');
        console.log('Removing Listener');
        
        // Stop the listeners...
        this.removeIOListeners();

        // this.activeDevice.setDebugFlashErr(false);
        try {
            delete this.deviceDashboardController;
            this.deviceDashboardController = undefined;
            $('#dashboard').remove();
        } catch (err) {
            console.log('Error Deleting Data',err);
        }
        this.stopDashboardDataCollector(onSuccess, onError);
    }
    onUnloadModule(framework, onError, onSuccess) {
        console.log('in onUnloadModule');
        this.stopDashboardDataCollector(onSuccess, onError);
    }
    onLoadError(framework, description, onHandle) {
        console.log('in onLoadError', description);
        onHandle(true);
    }
    onWriteError(framework, registerName, value, description, onHandle) {
        console.log('in onConfigError', description);
        onHandle(true);
    }
    onRefreshError(framework, registerNames, description, onHandle) {
        console.log('in onRefreshError', description);
        if (typeof(description.retError) === 'number') {
            console.log('in onRefreshError',device_controller.ljm_driver.errToStrSync(description.retError));
        } else {
            console.log('Type of error',typeof(description.retError),description.retError);
        }
        onHandle(true);
    }

}

global.module = DashboardController;
