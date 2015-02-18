var LABJACK_OVERVIEW_IMG_SRC = './static/img/T7-cartoon.png';
var CONNECTOR_OVERVIEW_IMG_SRC = './static/img/T7-DB-cartoon.png';
var DEVICE_IMAGE_X_OFFSET = 150;
var DEVICE_IMAGE_Y_OFFSET = 10;
var VALUE_LABEL_X_OFFSET = {left: -40, right: 30}; // Switch for sides
var DEVICE_IMG_WIDTH = 225;
var DEVICE_IMG_HEIGHT = 525;
var VALUE_TEXT_X_OFFSET = {left: -50, right: 100}; // Switch for sides
var VALUE_TEXT_Y_OFFSET = -6;
var EDIT_RECT_X_OFFSET = {left: -35, right: 65}; // Switch for sides
var VALUE_TEXT_PAD_OFFSET = {left: -1, right: 10};
var LINE_START_X = {left: 0, right: 108};
var EDIT_RECT_Y_OFFSET = 0;
var EDIT_RECT_WIDTH = 27;
var EDIT_RECT_HEIGHT = 12;
var EDIT_TEXT_X_OFFSET = 3;
var EDIT_TEXT_Y_OFFSET = 0;

var CONNECTOR_IMAGE_X_OFFSET = 150;
var CONNECTOR_IMAGE_Y_OFFSET = 10;
var CONNECTOR_IMG_WIDTH = 112;
var CONNECTOR_IMG_HEIGHT = 500;

var TEST_OVERLAY_SPEC = [
    {register: 'AIN0', yLocation: 0.783, type: null, board: 'device', side: 'left'},
    {register: 'AIN1', yLocation: 0.757, type: null, board: 'device', side: 'left'},
    {register: 'AIN2', yLocation: 0.664, type: null, board: 'device', side: 'left'},
    {register: 'AIN3', yLocation: 0.639, type: null, board: 'device', side: 'left'},
    {register: 'DAC0', yLocation: 0.545, type: 'dac', board: 'device', side: 'left'},
    {register: 'DAC1', yLocation: 0.519, type: 'dac', board: 'device', side: 'left'},
    {register: 'FIO0', yLocation: 0.426, type: 'fio', board: 'device', side: 'left'},
    {register: 'FIO1', yLocation: 0.403, type: 'fio', board: 'device', side: 'left'},
    {register: 'FIO2', yLocation: 0.308, type: 'fio', board: 'device', side: 'left'},
    {register: 'FIO3', yLocation: 0.283, type: 'fio', board: 'device', side: 'left'},
    {register: 'AIN1', yLocation: 0.900-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'AIN3', yLocation: 0.875-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'AIN5', yLocation: 0.850-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'AIN7', yLocation: 0.825-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'AIN9', yLocation: 0.800-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'AIN11', yLocation: 0.775-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'AIN13', yLocation: 0.750-0.01, type: null, board: 'connector', side: 'left'},
    {register: 'DAC0', yLocation: 0.725-0.01, type: 'dac', board: 'connector', side: 'left'},
    {register: 'MIO1', yLocation: 0.625-0.015, type: 'fio', board: 'connector', side: 'left'},
    {register: 'FIO0', yLocation: 0.600-0.015, type: 'fio', board: 'connector', side: 'left'},
    {register: 'FIO2', yLocation: 0.575-0.015, type: 'fio', board: 'connector', side: 'left'},
    {register: 'FIO4', yLocation: 0.550-0.015, type: 'fio', board: 'connector', side: 'left'},
    {register: 'FIO6', yLocation: 0.525-0.015, type: 'fio', board: 'connector', side: 'left'},
    {register: 'EIO6', yLocation: 0.275+0.020, type: 'fio', board: 'connector', side: 'left'},
    {register: 'EIO4', yLocation: 0.250+0.020, type: 'fio', board: 'connector', side: 'left'},
    {register: 'EIO2', yLocation: 0.225+0.020, type: 'fio', board: 'connector', side: 'left'},
    {register: 'EIO0', yLocation: 0.200+0.020, type: 'fio', board: 'connector', side: 'left'},
    {register: 'CIO1', yLocation: 0.175+0.020, type: 'fio', board: 'connector', side: 'left'},
    {register: 'CIO3', yLocation: 0.150+0.020, type: 'fio', board: 'connector', side: 'left'},
    {register: 'AIN0', yLocation: 0.900 + 0.005, type: null, board: 'connector', side: 'right'},
    {register: 'AIN2', yLocation: 0.875 + 0.005, type: null, board: 'connector', side: 'right'},
    {register: 'AIN4', yLocation: 0.850 + 0.005, type: null, board: 'connector', side: 'right'},
    {register: 'AIN6', yLocation: 0.825 + 0.005, type: null, board: 'connector', side: 'right'},
    {register: 'AIN8', yLocation: 0.800 + 0.003, type: null, board: 'connector', side: 'right'},
    {register: 'AIN10', yLocation: 0.775 + 0.003, type: null, board: 'connector', side: 'right'},
    {register: 'AIN12', yLocation: 0.750 + 0.003, type: null, board: 'connector', side: 'right'},
    {register: 'DAC1', yLocation: 0.700, type: 'dac', board: 'connector', side: 'right'},
    {register: 'MIO2', yLocation: 0.625, type: 'dac', board: 'connector', side: 'right'},
    {register: 'MIO0', yLocation: 0.600, type: 'dac', board: 'connector', side: 'right'},
    {register: 'FIO1', yLocation: 0.575, type: 'dac', board: 'connector', side: 'right'},
    {register: 'FIO3', yLocation: 0.550, type: 'dac', board: 'connector', side: 'right'},
    {register: 'FIO5', yLocation: 0.525, type: 'dac', board: 'connector', side: 'right'},
    {register: 'FIO7', yLocation: 0.500, type: 'dac', board: 'connector', side: 'right'},
    {register: 'EIO7', yLocation: 0.300+0.010, type: 'fio', board: 'connector', side: 'right'},
    {register: 'EIO5', yLocation: 0.275+0.010, type: 'fio', board: 'connector', side: 'right'},
    {register: 'EIO3', yLocation: 0.250+0.010, type: 'fio', board: 'connector', side: 'right'},
    {register: 'EIO1', yLocation: 0.225+0.010, type: 'fio', board: 'connector', side: 'right'},
    {register: 'CIO2', yLocation: 0.175+0.010, type: 'fio', board: 'connector', side: 'right'},
    {register: 'CIO0', yLocation: 0.150+0.010, type: 'fio', board: 'connector', side: 'right'}
];

var INITIALIZATION_STRATEGIES = {
    'fio': noopStrategy,
    'dac': noopStrategy
};

var START_READ_STRATEGIES = {
    'fio': setFIOToInput,
    'dac': noopStrategy
};

var START_WRITE_STRATEGIES = {
    'fio': setFIOToOutput,
    'dac': noopStrategy
};

var EDIT_CONTROLS_TEMPLATE_STR = '<div class="edit-control row-fluid" id="{{ . }}-edit-control">' +
    '<div class="span1 edit-label">{{ . }}</div>' +
    '<div class="span5 val-input-holder"><input id="{{ . }}-val-input" type="text" placeholder="val to write"></div>' +
    '<div class="span6">' +
    '<a id="{{ . }}-write-btn" class="write-button btn btn-success">write</a>' +
    '<a id="{{ . }}-close-btn" class="close-button btn btn-warning">return {{ . }} to read-mode</a>' +
    '</div>' +
    '</div>';
var EDIT_CONTROLS_TEMPLATE = handlebars.compile(EDIT_CONTROLS_TEMPLATE_STR);
var EDIT_CONTROL_ID_TEMPLATE = handlebars.compile('#{{ . }}-edit-control');
var WRITE_BTN_ID_TEMPLATE = handlebars.compile('#{{ . }}-write-btn');
var CLOSE_BTN_ID_TEMPLATE = handlebars.compile('#{{ . }}-close-btn');
var VAL_INPUT_ID_TEMPLATE = handlebars.compile('#{{ . }}-val-input');

var writing = false;
var selectedDevice = device_controller.getDeviceKeeper().getDevices()[0];
var currentDeviceSelection = 0;
var tabID = getActiveTabID();
var switchFuncs = [];


function formatNum(target) {
    if (target >= 10 || target <= -10)
        return parseFloat(Math.round(target * 100000) / 100000).toFixed(4);
    else
        return parseFloat(Math.round(target * 100000) / 100000).toFixed(5);
}


function createGetOverlayElementYPos(offset, imageHeight) {
    return function (yElementOffset) {
        return offset + yElementOffset * imageHeight;
    };
}


function createOverlayLinePoints(spec) {
    var yElementOffset = spec.yLocation;
    var overlayFunc;

    if (spec.board === 'device') {
        overlayFunc = createGetOverlayElementYPos(
            DEVICE_IMAGE_Y_OFFSET,
            DEVICE_IMG_HEIGHT
        );
    } else {
        overlayFunc = createGetOverlayElementYPos(
            CONNECTOR_IMAGE_Y_OFFSET,
            CONNECTOR_IMG_HEIGHT
        );
    }

    return [
        DEVICE_IMAGE_X_OFFSET + LINE_START_X[spec.side],
        overlayFunc(yElementOffset),
        DEVICE_IMAGE_X_OFFSET + LINE_START_X[spec.side] + VALUE_LABEL_X_OFFSET[spec.side],
        overlayFunc(yElementOffset)
    ];
}


function createOverlayElement(layer, overlayElementSpec) {
    var connectingLine;
    var valueText;
    var textXPos;
    var textYPos;
    var editRect;
    var editText;
    var editCtrl;
    var editCtrlXOffset;
    var editCtrlYOffset;
    var state;
    var updateFunction;
    var writeFunction;
    var getOverlayElementYPos;
    var self = this;

    if (overlayElementSpec.board === 'device') {
        getOverlayElementYPos = createGetOverlayElementYPos(
            DEVICE_IMAGE_Y_OFFSET,
            DEVICE_IMG_HEIGHT
        );
    } else {
        getOverlayElementYPos = createGetOverlayElementYPos(
            CONNECTOR_IMAGE_Y_OFFSET,
            CONNECTOR_IMG_HEIGHT
        );
    }

    textXPos = VALUE_LABEL_X_OFFSET[overlayElementSpec.side];
    textXPos += DEVICE_IMAGE_X_OFFSET;
    textXPos += VALUE_TEXT_X_OFFSET[overlayElementSpec.side];
    textYPos = getOverlayElementYPos(overlayElementSpec.yLocation);
    textYPos += VALUE_TEXT_Y_OFFSET;
    editCtrlXOffset = textXPos + EDIT_RECT_X_OFFSET[overlayElementSpec.side];
    editCtrlYOffset = textYPos + EDIT_RECT_Y_OFFSET;

    connectingLine = new Kinetic.Line({
        points: createOverlayLinePoints(overlayElementSpec),
        stroke: '#A0A0A0',
        strokeWidth: 1,
        lineCap: 'round',
        lineJoin: 'round'
    });

    valueText = new Kinetic.Text({
        x: textXPos + VALUE_TEXT_PAD_OFFSET[overlayElementSpec.side],
        y: textYPos,
        text: 'wait...',
        fontSize: 13,
        fontFamily: 'Helvetica',
        fill: 'black'
    });

    state = {
        isEditing: false
    };

    layer.add(connectingLine);
    layer.add(valueText);

    writeFunction = function (value) {
        writing = true;
        valueText.setText(formatNum(value));
        writing = false;
    };

    if (overlayElementSpec.type !== null) {
        editCtrl = new Kinetic.Group({
            x: editCtrlXOffset,
            y: editCtrlYOffset
        });

        editRect = new Kinetic.Rect({
            x: 0,
            y: 0,
            width: EDIT_RECT_WIDTH,
            height: EDIT_RECT_HEIGHT,
            fill: '#D0D0D0'
        });

        editText = new Kinetic.Text({
            x: EDIT_TEXT_X_OFFSET,
            y: EDIT_TEXT_Y_OFFSET,
            text: 'edit',
            fontSize: 12,
            fontFamily: 'Helvetica',
            fill: '#404040'
        });

        editCtrl.on('mouseover', function() {
            editRect.setFill('black');
            editText.setFill('white');
            layer.draw();
        });

        editCtrl.on('mouseout', function() {
            editRect.setFill('#D0D0D0');
            editText.setFill('#404040');
            layer.draw();
        });

        var switchToRead = function () {
            state.isEditing = false;
            layer.add(editCtrl);
            layer.draw();
        };

        var switchToWrite = function () {
            state.isEditing = true;
            editCtrl.remove();
            layer.draw();
        };

        switchFuncs.push({
            register: overlayElementSpec.register,
            switchToWrite: switchToWrite,
            switchToRead: switchToRead,
            writeFunction: writeFunction
        });

        editCtrl.on('mousedown', function () {
            switchFuncs.forEach(function (switchSpec) {
                if (switchSpec.register == overlayElementSpec.register)
                    switchSpec.switchToWrite();
            });

            showEditControls(
                overlayElementSpec.register,
                function (value) {
                    switchFuncs.forEach(function (switchSpec) {
                        if (switchSpec.register == overlayElementSpec.register)
                            switchSpec.writeFunction(value);
                    });
                    selectedDevice.write(overlayElementSpec.register, value);
                },
                function () {
                    switchFuncs.forEach(function (switchSpec) {
                        if (switchSpec.register == overlayElementSpec.register)
                            switchSpec.switchToRead();
                    });
                }
            );
        });

        editCtrl.add(editRect);
        editCtrl.add(editText);
        layer.add(editCtrl);
    }

    updateFunction = function (registersToRead) {
        if (state.isEditing)
            return null;

        registersToRead.push(overlayElementSpec.register);
        return function (result) {
            valueText.setText(formatNum(result));
        };
    };

    return updateFunction;
}


function showEditControls (registerLabel, writeFunction, closeFunction) {
    var resultingHTML = EDIT_CONTROLS_TEMPLATE(registerLabel);
    var editControlID = EDIT_CONTROL_ID_TEMPLATE(registerLabel);
    var writeBtnID = WRITE_BTN_ID_TEMPLATE(registerLabel);
    var closeBtnID = CLOSE_BTN_ID_TEMPLATE(registerLabel);
    var valInputID = VAL_INPUT_ID_TEMPLATE(registerLabel);

    $('#edit-fields').append(resultingHTML);
    $(editControlID).hide();
    $(editControlID).slideDown();
    $(writeBtnID).click(function () {
        // TODO: Error handler here if cannot convert
        writeFunction(parseFloat($(valInputID).val()));
        return false;
    });
    $(closeBtnID).click(function () {
        $(editControlID).slideUp(function () {
            $(editControlID).remove();
        });
        closeFunction();
    });
}


function createDrawing (overlaySpec, onFinish) {
    var deviceStage;
    var connectorStage;
    var layer;
    var deviceImageObj;
      var connectorImageObj;
    var updateFunctions;

    // Create containing structures
    deviceStage = new Kinetic.Stage({
        container: 'device-container',
        width: 400,
        height: 600
    });
    connectorStage = new Kinetic.Stage({
        container: 'connector-container',
        width: 400,
        height: 600
    });
    mainDeviceLayer = new Kinetic.Layer();
    connectorLayer = new Kinetic.Layer();

    // Create device image
    var createDeviceImage = function (onFinish) {
        deviceImageObj = new Image();
        deviceImageObj.onload = function() {
            var deviceImage = new Kinetic.Image({
                x: DEVICE_IMAGE_X_OFFSET,
                y: DEVICE_IMAGE_Y_OFFSET,
                image: deviceImageObj,
                width: DEVICE_IMG_WIDTH,
                height: DEVICE_IMG_HEIGHT
            });
            mainDeviceLayer.add(deviceImage);
            if (onFinish) { onFinish(); }
        };
        deviceImageObj.src = LABJACK_OVERVIEW_IMG_SRC;
    };

    var createConnectorImage = function (onFinish) {
        connectorImageObj = new Image();
        connectorImageObj.onload = function() {
            var connectorImage = new Kinetic.Image({
                x: CONNECTOR_IMAGE_X_OFFSET,
                y: CONNECTOR_IMAGE_Y_OFFSET,
                image: connectorImageObj,
                width: CONNECTOR_IMG_WIDTH,
                height: CONNECTOR_IMG_HEIGHT
            });
            connectorLayer.add(connectorImage);
            if (onFinish) { onFinish(); }
        };
        connectorImageObj.src = CONNECTOR_OVERVIEW_IMG_SRC;
    };

    // Create overlay graphical elements
    var createOverlayElements = function (onFinish) {
        updateFunctions = overlaySpec.map(function (e) {
            if (e.board === 'device')
                return createOverlayElement(mainDeviceLayer, e);
            else
                return createOverlayElement(connectorLayer, e);
        });
        if (onFinish) { onFinish(updateFunctions); }
    };

    // add the layer to the stage
    var addLayerToStage = function (onFinish) {
        deviceStage.add(mainDeviceLayer);
        connectorStage.add(connectorLayer);
        if (onFinish) { onFinish(); }
    };

    var refreshFunction = function () {
        mainDeviceLayer.draw();
        connectorLayer.draw();
    };

    createDeviceImage(function () {
        createConnectorImage(function () {
            createOverlayElements(function () {
                addLayerToStage(function () {
                    onFinish(refreshFunction, updateFunctions);
                });
            });
        });
    });
}


function readDeviceValues (refreshFunction, updateFunctions, deviceSelection) {
    var registersToRead;
    var numCallbacks;
    var callbacks;
    var setReadTimeout;

    var changedDevice = deviceSelection !== currentDeviceSelection;
    var changedTab = tabID !== getActiveTabID();
    if (changedDevice || changedTab)
        return;

    setReadTimeout = function () {
        setTimeout(
            function () {
                readDeviceValues(
                    refreshFunction,
                    updateFunctions,
                    deviceSelection
                );
            },
            750
        );
    };

    if (!writing) {
        registersToRead = [];

        callbacks = updateFunctions.map(function (func) {
            return func(registersToRead);
        });

        callbacks = callbacks.filter(function (func) {
            return func !== null;
        });

        registersToRead = registersToRead.filter(function(elem, pos) {
            var curIndex = registersToRead.indexOf(elem);
            return true;
        });

        selectedDevice.readMany(registersToRead)
        .then(
            function (values) {
                numCallbacks = callbacks.length;
                for (var i=0; i<numCallbacks; i++) {
                    callbacks[i](values[i]);
                }

                setReadTimeout();
            },
            function (err) {
                showError(err);
            }
        );

        refreshFunction();

    } else {
        setReadTimeout();
    }
}


function setFIOToInput (device, registerInfo) {

}


function setFIOToOutput (device, registerInfo) {

}


function noopStrategy (device, registerInfo) {}


function setupDevice (targetSpec) {
    var targetFunc;

    selectedDevice.write('FIO_DIRECTION', 0);

    targetSpec.forEach(function (specComponent) {
        targetFunc = INITIALIZATION_STRATEGIES[specComponent.type];
        if(targetFunc !== undefined)
            targetFunc(selectedDevice, specComponent);
    });
}


$('#device-info-inspector').ready(function () {
    $('.device-selection-radio').first().prop('checked', true);
    $('.device-selection-radio').change( function (event) {
        var serial = event.target.id.replace('-selector', '');
        $('.edit-control').slideUp(function () {
            $('.edit-control').remove();
        });
        $('#device-container').fadeOut(function () {
            var deviceKeeper = device_controller.getDeviceKeeper();
            selectedDevice = deviceKeeper.getDevice(serial);
            setupDevice(TEST_OVERLAY_SPEC);
            currentDeviceSelection++;
            createDrawing(
                TEST_OVERLAY_SPEC,
                function (refreshFunction, updateFunctions) {
                    readDeviceValues(
                        refreshFunction,
                        updateFunctions,
                        currentDeviceSelection
                    );
                });
            $('#device-container').fadeIn();
        });
    });

    var devices = device_controller.getDeviceKeeper().getDevices();
    selectedDevice = devices[0];
    setupDevice(TEST_OVERLAY_SPEC);
    createDrawing(
        TEST_OVERLAY_SPEC,
        function (refreshFunction, updateFunctions) {
            readDeviceValues(
                refreshFunction,
                updateFunctions,
                currentDeviceSelection
            );
        }
    );
});
