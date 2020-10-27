function getDeviceDashboardController(deviceInfo, moduleData) {
    var DEVICE_D3_CONTAINER;
    var DEVICE_IMAGE_CONTAINER;
    this.displayTemplateData = {};

    var imgSpecs;
    try {
        imgSpecs = new getDashboardGuiConstants(
            deviceInfo.deviceTypeName,
            deviceInfo.fullType
        );
    } catch(err) {
        console.error('ERROR DOING STUFF!!:',err);
        throw err;
    }

    // Device Image Info
    var LABJACK_OVERVIEW_IMG_SRC = imgSpecs.LABJACK_OVERVIEW_IMG_SRC;
    var DEVICE_IMAGE_ALLOCATED_WIDTH = imgSpecs.DEVICE_IMAGE_ALLOCATED_WIDTH;
    var DEVICE_IMAGE_X_OFFSET = imgSpecs.DEVICE_IMAGE_X_OFFSET;
    var DEVICE_IMAGE_Y_OFFSET = imgSpecs.DEVICE_IMAGE_Y_OFFSET;
    var DEVICE_IMG_WIDTH = imgSpecs.DEVICE_IMG_WIDTH;
    var DEVICE_IMG_HEIGHT = imgSpecs.DEVICE_IMG_HEIGHT;
    var DEVICE_IMG_SPLINES_HEIGHT_MULTIPLIER = imgSpecs.DEVICE_IMG_SPLINES_HEIGHT_MULTIPLIER;
    var DEVICE_IMAGE_Y_SPLINES_OFFSET = imgSpecs.DEVICE_IMAGE_Y_SPLINES_OFFSET;
    var LINE_X_OFFSET = imgSpecs.LINE_X_OFFSET;
    var LINE_Y_OFFSET = imgSpecs.LINE_Y_OFFSET;
    var DEVICE_IMAGE_X_OVERLAP = imgSpecs.DEVICE_IMAGE_X_OVERLAP;
    var CONNECTOR_SIZE_X = imgSpecs.CONNECTOR_SIZE_X;

    var DEVICE_RIGHT_SIDE_OFFSET = imgSpecs.DEVICE_RIGHT_SIDE_OFFSET;
    var DEVICE_CONNECTOR_SIZE_X = imgSpecs.DEVICE_CONNECTOR_SIZE_X;
    var DEVICE_BUTTON_LEFT_PADDING = imgSpecs.DEVICE_BUTTON_LEFT_PADDING;

    // Determines the image+lines & register's offset. Higher #'s push registers higher up
    var DEVICE_LINE_Y_OFFSET = imgSpecs.DEVICE_LINE_Y_OFFSET;

    // DB Image Info
    var LABJACK_DB_IMG_SRC = imgSpecs.LABJACK_DB_IMG_SRC;
    var DB_IMG_WIDTH = imgSpecs.DB_IMG_WIDTH;
    var DB_IMG_HEIGHT = imgSpecs.DB_IMG_HEIGHT;
    var DB_ALLOCATED_HEIGHT = imgSpecs.DB_ALLOCATED_HEIGHT;
    var DB_IMG_SPLINES_HEIGHT_MULTIPLIER = imgSpecs.DB_IMG_SPLINES_HEIGHT_MULTIPLIER;
    var DB_IMAGE_Y_SPLINES_OFFSET = imgSpecs.DB_IMAGE_Y_SPLINES_OFFSET;
    var DB_IMAGE_X_OFFSET = imgSpecs.DB_IMAGE_X_OFFSET;
    var DB_IMAGE_Y_OFFSET = imgSpecs.DB_IMAGE_Y_OFFSET;
    var DB_LINE_X_OFFSET = imgSpecs.DB_LINE_X_OFFSET;
    var DB_IMAGE_X_OVERLAP = imgSpecs.DB_IMAGE_X_OVERLAP;
    var DB_RIGHT_SIDE_OFFSET = imgSpecs.DB_RIGHT_SIDE_OFFSET;
    var DB_CONNECTOR_SIZE_X = imgSpecs.DB_CONNECTOR_SIZE_X;
    var DB_BUTTON_LEFT_PADDING = imgSpecs.DB_BUTTON_LEFT_PADDING;
    var DB_LINE_Y_OFFSET = imgSpecs.DB_LINE_Y_OFFSET;


    var DEVICE_REGISTER_DISPLAY_ID_TEMPLATE = handlebars.compile('{{register}}-device-display');
    var REGISTER_DISPLAY_ID_TEMPLATE = handlebars.compile('{{register}}-display');
    var TRANSLATE_TEMPLATE = handlebars.compile('translate({{x}},{{y}})');
    var STRATEGY_NAME_TEMPALTE = handlebars.compile('{{type}}-{{direction}}');
    var PATH_TEMPALTE = handlebars.compile(
        'M {{start.x}} {{start.y}} C{{#each coords}} {{x}} {{y}}{{/each}}'
    );
    var DIGITAL_CONTROL_HEADER = handlebars.compile(
        '<div id="{{register}}-digitalControl" class="digitalControlObject">'
    );

    var REGISTER_OVERLAY_SPEC = imgSpecs.REGISTER_OVERLAY_SPEC;


    this.loadResources = function() {
        var fileList = [
            'ain-in',
            'dac-out',
            'dio',
            'flex-io',
        ];
        var fileBase = 'dashboard/resources/';
        var fileExtension = '.html';

        fileList.forEach(function(fileName) {
            if(moduleData.htmlFiles[fileName]) {
                self.displayTemplateData[fileName] = '';
                self.displayTemplateData[fileName] = handlebars.compile(
                    moduleData.htmlFiles[fileName]
                );
            } else {
                var filePath = fileBase + fileName + fileExtension;
                var templateLoad = "Error loading file: ";
                templateLoad += filePath + ". Error Message: ";
                console.error(templateLoad);
            }
        });
    };
    this.drawDBs = function (containerID, initializedData) {
        // Save the necessary ID's for creating the DBs D3 object
        DB_D3_CONTAINER = containerID;
        DB_IMAGE_CONTAINER = containerID + '-svg';
        DB_REGISTERS_CONTAINER = containerID + '-registers';

        // Define a function that returns the y-location of where each register
        // should be placed in relation to the DB's image.
        var getOverlayYPos = function(registerInfo) {
            var yFromTopOfImage = registerInfo.yLocation * DB_IMG_HEIGHT * DB_IMG_SPLINES_HEIGHT_MULTIPLIER;
            var retVal = DB_IMAGE_Y_OFFSET + yFromTopOfImage - DB_IMAGE_Y_SPLINES_OFFSET;
            return retVal;
        };
        // Determine the top-margin that should be applied to properly align the
        // registers.
        var marginTopVal;
        // if($(window).width() < 768) {
        //     marginTopVal = $('#device-selector').height();
        // } else {
        //     marginTopVal = $('#device-view').offset().top - 10;
        // }
        marginTopVal = $('#device-view').offset().top - 10;

        // Set the margin-top .css style of the registers-container.
        $(DB_REGISTERS_CONTAINER).css(
            'margin-top',
            (-1 * marginTopVal).toString() + 'px'
        );
        $(DB_IMAGE_CONTAINER).css(
            'margin-top',
            marginTopVal.toString() + 'px'
        );

        // Apply Height-fixes
        $(DB_D3_CONTAINER).css(
            'height',
            DB_ALLOCATED_HEIGHT.toString() + 'px'
        );
        // Get a few module-attributes needed to calculate imageY, a constant
        // required to calculate the y-location of where each register-object
        // should be placed
        var moduleContentsOffset = $('#module-chrome-contents').position().top;
        var deviceSelectorOffset = $('#device-view').position().top;
        var imageY = moduleContentsOffset + deviceSelectorOffset-20;
        var getOverlayYPosWithPx = function (registerInfo) {
            return imageY + getOverlayYPos(registerInfo) + 'px';
        };
        //---------------------- Draw DB image ---------------------------------
        // Add the image to the DIV containing the device visualization in order
        // to add the db-cartoon.
        var image = d3.select(DB_IMAGE_CONTAINER)                               // Tell D3 to insert data into the DEVICE_IMAGE_CONTAINER div-id
        .append('image')                                                        // Tell D3 to make an image object
        .attr('xlink:href', LABJACK_DB_IMG_SRC)                                 // Set the image src. to be the LABJACK_DB_IMG_SRC
        .attr('x', DB_IMAGE_X_OFFSET)                                           // Set the X-offset.  Padding added to the left of image.
        .attr('y', DB_IMAGE_Y_OFFSET)                                           // Set the Y-offset.  Padding added to the top of image.
        .attr('width', DB_IMG_WIDTH)
        .attr('height', DB_IMG_HEIGHT);

        //---------------------- Draw Lines image ------------------------------
        // Again, select the DIV containing the device visualization.  This time
        // to draw the object that the lines protruding off to the left of the
        // device will go into.
        var lineGroup = d3.select(DB_IMAGE_CONTAINER)
        .selectAll('.connector-line-left')                                      // Not quite sure what is being select here...
        .data(function () {                                                     // Adding data to the D3 object by...
            return REGISTER_OVERLAY_SPEC.filter(function (registerInfo) {       // Filtering the REGISTER_OVERLAY_SPEC
                return (registerInfo.board === 'connector');                    // To get only 'device' registers.
            });
        })
        .enter()                                                                // Enter each data point defined above.
        .append('g')                                                            // Create an html attribute called "g".  D3:
        .attr('transform', function (registerInfo) {                            // Set the X and Y coordinates for where the base of the line should go
            var y = getOverlayYPos(registerInfo);
            return TRANSLATE_TEMPLATE({x: 0, y: y});                            // Define drawn X and Y coordinates
        })
        .attr('class','connector-line-left');

        // Define a function that places the "spline" lines.  These 4 points
        // are why the some of the lines are curvey & others aren't.
        var lineFunction = function (coordSpec) {
            var yOffset = coordSpec.yOffset;
            if (yOffset === undefined)                                          // if a yOffset is defined in REGISTER_OVERLAY_SPEC then use it.
                yOffset = 0;
            var xOffset = 0;
            var offsetA = 0;
            var offsetB = yOffset;
            if(coordSpec.side === 'right') {
                xOffset = DB_RIGHT_SIDE_OFFSET;
                offsetB = 0;
                offsetA = yOffset;
            }
            return PATH_TEMPALTE({                                              // Use the yOffset to make the curvey line.
                start: {x: DB_CONNECTOR_SIZE_X+xOffset, y: offsetA},            // Start line
                coords: [
                    {x: DB_CONNECTOR_SIZE_X-40+xOffset, y: offsetA},            // First "Spline" line
                    {x: DB_LINE_X_OFFSET+40+xOffset, y: offsetB},               // First "Spline" line
                    {x: DB_LINE_X_OFFSET+xOffset, y: offsetB}                   // Finish line at this point
                ]
            });
        };

        // Determine if antialiasing should be used.  Antialiasing causes the
        // "blured" straight lines instead of making them "crisp".
        var determineAntialiasing = function (spec) {
            // If a yOffset is defined in the REGISTER_OVERLAY_SPEC then set to
            // auto.
            if (spec.yOffset)
                return 'auto';
            else
                return 'crispEdges';
        };

        // Append Paths that each of the previously defined line objects should
        // follow. Draw the white line that goes in each of the defined line
        // groups. (3px tall)
        lineGroup.append('path')
        .attr('d', lineFunction)
        .attr('stroke', 'white')
        .attr('fill', 'none')
        .attr('stroke-width', 3)
        .style('shape-rendering', determineAntialiasing);

        // Append Paths that each of the previously defined line objects should
        // follow. Draw the black line that goes in each of the defined line
        // groups. (1px tall)
        lineGroup.append('path')
        .attr('d', lineFunction)
        .attr('stroke', 'black')
        .attr('fill', 'none')
        .attr('stroke-width', 1)
        .style('shape-rendering', determineAntialiasing);

        // Create a DIV for each of the registers for the main device
        var overlays = d3.select(DB_REGISTERS_CONTAINER)
        .selectAll('.register-overlay')                                         // Try to replace any existing elements w/ this class
        .data(function () {                                                     // fill all of the elements with data.
            return REGISTER_OVERLAY_SPEC.filter(function (registerInfo) {
                return registerInfo.board === 'connector';
            });
        })
        .enter()
        .append('div')
        .attr('class', function (registerInfo) {
            var appendClass = '';
            var isAIN = registerInfo.register.indexOf('AIN') !== -1;
            var isDAC = registerInfo.register.indexOf('DAC') !== -1;
            if(isAIN || isDAC) {
                if(registerInfo.side === 'left') {
                    appendClass = ' register-overlay-left';
                } else {
                    appendClass = ' register-overlay-right';
                }
            }
            if (registerInfo.type === 'dio') {
                return 'register-overlay fio-overlay' + appendClass;
            } else if(registerInfo.type === 'flex') {
                return 'register-overlay flex-overlay' + appendClass;
            } else {
                return 'register-overlay' + appendClass;
            }
        })
        .style('top', function (registerInfo) {
            var yFromTopOfImage = imageY + getOverlayYPos(registerInfo) - DB_LINE_Y_OFFSET;
            if (registerInfo.yOffset)
                yFromTopOfImage += registerInfo.yOffset;
            return yFromTopOfImage + 'px';
        })
        .style('left', function (registerInfo) {
            var xOffset = 0;
            if(registerInfo.side === 'right') {
                xOffset = DB_RIGHT_SIDE_OFFSET;
                xOffset += DB_CONNECTOR_SIZE_X;
                xOffset += DB_BUTTON_LEFT_PADDING;
            }
            return xOffset + 'px';
        })
        .attr('id', function (registerInfo) {
            return REGISTER_DISPLAY_ID_TEMPLATE(registerInfo);
        })
        .html(function (registerInfo) {
            var curData;
            var registerName = registerInfo.register;
            if(initializedData[registerName]) {
                // console.log('Drawing Register', registerName, registerInfo, initializedData[registerName]);
                curData = initializedData[registerName];
            } else {
                curData = {state:null,direction:null,type:null,value:null};
            }
            // var curData = initializedData.get(registerInfo.register,{state:null,direction:null,type:null,value:null});
            registerInfo.state = curData.state;
            registerInfo.direction = curData.direction;
            registerInfo.regType = curData.type.toLowerCase();
            registerInfo.value = curData.val;
            registerInfo.ainEnabled = curData.ainEnabled;
            registerInfo.directionStr = curData.directionStr;
            registerInfo.stateStr = curData.stateStr;

            try {
                if(registerInfo.register.indexOf('DAC') !== -1) {
                    registerInfo.value = registerInfo.value.toFixed(3);
                } else if(registerInfo.register.indexOf('AIN') !== -1) {
                    // registerInfo.value = registerInfo.value.toFixed(6);
                    registerInfo.value = registerInfo.value;
                }
            } catch(err) {
                registerInfo.value = -9999;
            }
            var loadname = 'ain-in';
            if (registerInfo.type === 'dio') {
                loadname = 'dio';
            } else if (registerInfo.type === 'dac') {
                loadname = 'dac-out';
            } else if (registerInfo.type === 'flex') {
                loadname = 'flex-io';
            }
            return self.displayTemplateData[loadname](registerInfo);
        });
    };
    this.drawDevice = function (containerID, initializedData) {
        // Save the necessary ID's for creating the D3 object
        DEVICE_D3_CONTAINER = containerID;
        DEVICE_IMAGE_CONTAINER = containerID + '-svg';
        DEVICE_REGISTERS_CONTAINER = containerID + '-registers';

        // Define function that returns the y-location of where each register
        // should be placed
        var getOverlayYPos = function (registerInfo) {
            var yFromTopOfImage = registerInfo.yLocation * DEVICE_IMG_HEIGHT * DEVICE_IMG_SPLINES_HEIGHT_MULTIPLIER;
            return DEVICE_IMAGE_Y_OFFSET + yFromTopOfImage - DEVICE_IMAGE_Y_SPLINES_OFFSET;
        };

        // Determine the top-margin that should be applied to properly align the
        // registers.
        var marginTopVal = (-1 * $('#device-view').offset().top);

        // Set the margin-top .css style of the registers-container.
        $(DEVICE_REGISTERS_CONTAINER).css(
            'margin-top',
            marginTopVal.toString() + 'px'
        );
        $(DEVICE_IMAGE_CONTAINER).css(
            'margin-top',
            (-1 * marginTopVal).toString() + 'px'
        );

        // Apply width & height fixes to allow for T4 to have register controls
        // on the right side.
        $(DEVICE_D3_CONTAINER).css(
            'width',
            DEVICE_IMAGE_ALLOCATED_WIDTH.toString() + 'px'
        );
        $(DEVICE_D3_CONTAINER).css(
            'height',
            DEVICE_IMG_HEIGHT.toString() + 'px'
        );
        $(DEVICE_IMAGE_CONTAINER).css(
            'width',
            DEVICE_IMAGE_ALLOCATED_WIDTH.toString() + 'px'
        );

        // Get a few module-attributes needed to calculate imageY, a constant
        // required to calculate the y-location of where each register-object
        // should be placed
        var moduleContentsOffset = $('#module-chrome-contents').position().top;
        var deviceSelectorOffset = $('#device-view').position().top;
        var imageY = moduleContentsOffset + deviceSelectorOffset-20;
        // if($(window).width() < 768) {
        //     imageY -= $(DEVICE_IMAGE_CONTAINER).position().top;
        // }

        var getOverlayYPosWithPx = function (registerInfo) {
            return imageY + getOverlayYPos(registerInfo) + 'px';
        };

        // Add the image to the DIV containing the device visualization in order
        // to add the device-cartoon.
        var image = d3.select(DEVICE_IMAGE_CONTAINER)                           // Tell D3 to insert data into the DEVICE_IMAGE_CONTAINER div-id
        .append('image')                                                        // Tell D3 to make an image object
        .attr('xlink:href', LABJACK_OVERVIEW_IMG_SRC)                           // Set the image src. to be the LABJACK_OVERVIEW_IMG_SRC
        .attr('x', DEVICE_IMAGE_X_OFFSET)                                       // Set the X-offset.  Padding added to the left of image.
        .attr('y', DEVICE_IMAGE_Y_OFFSET)                                       // Set the Y-offset.  Padding added to the top of image.
        .attr('width', DEVICE_IMG_WIDTH)
        .attr('height', DEVICE_IMG_HEIGHT);

        // Again, select the DIV containing the device visualization.  This time
        // to draw the object that the lines protruding off to the left of the
        // device will go into.
        var lineGroup = d3.select(DEVICE_IMAGE_CONTAINER)
        .selectAll('.connector-line')                                           // Not quite sure what is being select here...
        .data(function () {                                                     // Adding data to the D3 object by...
            return REGISTER_OVERLAY_SPEC.filter(function (registerInfo) {       // Filtering the REGISTER_OVERLAY_SPEC
                return registerInfo.board === 'device';                         // To get only 'device' registers.
            });
        })
        .enter()                                                                // Enter each data point defined above.
        .append('g')                                                            // Create an html attribute called "g".  D3:
        .attr('transform', function (registerInfo) {                            // Set the X and Y coordinates for where the base of the line should go
            var y = getOverlayYPos(registerInfo);
            y += DEVICE_LINE_Y_OFFSET;
            if(typeof(registerInfo.yShift) !== 'undefined') {
                y += registerInfo.yShift;
            }
            return TRANSLATE_TEMPLATE({x: 0, y: y});                            // Define drawn X and Y coordinates
        })
        .attr('class','connector-line');

        // Define a function that places the "spline" lines.  These 4 points
        // are why the some of the lines are curvey & others aren't.
        var lineFunction = function (coordSpec) {
            var yOffset = coordSpec.yOffset;
            if (yOffset === undefined)                                          // if a yOffset is defined in REGISTER_OVERLAY_SPEC then use it.
                yOffset = 0;
            var xOffset = 0;
            var offsetA = 0;
            var offsetB = yOffset;
            if(coordSpec.side === 'right') {
                xOffset = DEVICE_RIGHT_SIDE_OFFSET;
                offsetB = 0;
                offsetA = yOffset;
            }

            return PATH_TEMPALTE({                                              // Use the yOffset to make the curvey line.
                start: {x: CONNECTOR_SIZE_X+xOffset, y: offsetA},               // Start line
                coords: [
                    {x: CONNECTOR_SIZE_X-40+xOffset, y: offsetA},               // First "Spline" line
                    {x: LINE_X_OFFSET+40+xOffset, y: offsetB},                  // First "Spline" line
                    {x: LINE_X_OFFSET+xOffset, y: offsetB}                      // Finish line at this point
                ]
            });
        };

        // Determine if antialiasing should be used.  Antialiasing causes the
        // "blured" straight lines instead of making them "crisp".
        var determineAntialiasing = function (spec) {
            // If a yOffset is defined in the REGISTER_OVERLAY_SPEC then set to
            // auto.
            if (spec.yOffset)
                return 'auto';
            else
                return 'crispEdges';
        };

        // Append Paths that each of the previously defined line objects should
        // follow. Draw the white line that goes in each of the defined line
        // groups. (3px tall)
        lineGroup.append('path')
        .attr('d', lineFunction)
        .attr('stroke', 'white')
        .attr('fill', 'none')
        .attr('stroke-width', 3)
        .style('shape-rendering', determineAntialiasing);

        // Append Paths that each of the previously defined line objects should
        // follow. Draw the black line that goes in each of the defined line
        // groups. (1px tall)
        lineGroup.append('path')
        .attr('d', lineFunction)
        .attr('stroke', 'black')
        .attr('fill', 'none')
        .attr('stroke-width', 1)
        .style('shape-rendering', determineAntialiasing);

        // var lineFunction = d3.svg.line()
        // .x(function(d) { return d.x; })
        // .y(function(d) { return d.y; })
        // .interpolate("linear");

        // lineGroup.append('path')
        // .attr('x1', LINE_X_OFFSET)
        // .attr('y1', 0)
        // .attr('stroke', 'white')
        // .attr('fill', 'none')
        // .attr('stroke-width', 3);

        // lineGroup.append('line')
        // .attr('x1', LINE_X_OFFSET)
        // .attr('y1', 0)
        // .attr('x2', CONNECTOR_SIZE_X)
        // .attr('y2', 0)
        // .attr('stroke', 'black')
        // .attr('fill', 'none')
        // .attr('stroke-width', 1);

        // Create a DIV for each of the registers for the main device
        var overlays = d3.select(DEVICE_REGISTERS_CONTAINER)
        .selectAll('.device-register-overlay')                                         // Try to replace any existing elements w/ this class
        .data(function () {                                                     // fill all of the elements with data.
            return REGISTER_OVERLAY_SPEC.filter(function (registerInfo) {
                return registerInfo.board === 'device';
            });
        })
        .enter()
        .append('div')
        .attr('class', function (registerInfo) {
            var appendClass = '';
            var isAIN = registerInfo.register.indexOf('AIN') !== -1;
            var isDAC = registerInfo.register.indexOf('DAC') !== -1;
            if(isAIN || isDAC) {
                if(registerInfo.side === 'left') {
                    appendClass = ' register-overlay-left';
                } else {
                    appendClass = ' register-overlay-right';
                }
            }
            if (registerInfo.type === 'dio') {
                return 'device-register-overlay fio-device-overlay' + appendClass;
            } else if(registerInfo.type === 'flex') {
                return 'device-register-overlay flex-device-overlay' + appendClass;
            } else {
                return 'device-register-overlay' + appendClass;
            }
        })
        .style('top', function (registerInfo) {
            var yFromTopOfImage = imageY + getOverlayYPos(registerInfo);
            if (registerInfo.yOffset)
                yFromTopOfImage += registerInfo.yOffset;
            if(registerInfo.yOverlayOffset)
                yFromTopOfImage += registerInfo.yOverlayOffset;
            return yFromTopOfImage + 'px';
        })
        .style('left', function (registerInfo) {
            var xOffset = 0;
            if(registerInfo.side === 'right') {
                xOffset = DEVICE_RIGHT_SIDE_OFFSET;
                xOffset += DEVICE_CONNECTOR_SIZE_X;
                xOffset += DEVICE_BUTTON_LEFT_PADDING;
            }
            return xOffset + 'px';
        })
        .attr('id', function (registerInfo) {
            return DEVICE_REGISTER_DISPLAY_ID_TEMPLATE(registerInfo);
        })
        .html(function (registerInfo) {
            var curData;
            var registerName = registerInfo.register;
            if(initializedData[registerName]) {
                // console.log('Drawing Register', registerName, registerInfo, initializedData[registerName]);
                curData = initializedData[registerName];
            } else {
                curData = {state:null,direction:null,type:null,value:null};
            }
            // var curData = initializedData.get(registerInfo.register,{state:null,direction:null,type:null,value:null});
            registerInfo.state = curData.state;
            registerInfo.direction = curData.direction;
            registerInfo.regType = curData.type.toLowerCase();
            registerInfo.value = curData.val;
            registerInfo.ainEnabled = curData.ainEnabled;
            registerInfo.directionStr = curData.directionStr;
            registerInfo.stateStr = curData.stateStr;

            if(registerInfo.register.indexOf('-device') === -1) {
                registerInfo.register += "-device";
            }
            try {
                if(registerInfo.register.indexOf('DAC') !== -1) {
                    registerInfo.value = registerInfo.value.toFixed(3);
                } else if(registerInfo.register.indexOf('AIN') !== -1) {
                    // registerInfo.value = registerInfo.value.toFixed(6);
                    registerInfo.value = imgSpecs.parseAINVal(registerInfo.value);
                }
            } catch(err) {
                registerInfo.value = -9999;
            }
            var loadname = 'ain-in';
            if (registerInfo.type === 'dio') {
                loadname = 'dio';
            } else if (registerInfo.type === 'dac') {
                loadname = 'dac-out';
            } else if (registerInfo.type === 'flex') {
                loadname = 'flex-io';
            }
            return self.displayTemplateData[loadname](registerInfo);
        });
    };
    this.roundReadings = function(reading) {
        return Math.round(reading*1000)/1000;
    };
     /**
      * Interprets the dict of currentValues for appropriate digital I/O data
      * @param  {string} reg            register name to parse from dict
      * @param  {dict} currentValues    Last-saved device values
      * @return {object}                Parsed state and direction values
    **/
    this.getCurInfo = function(reg, currentValues) {
        var baseReg = reg.slice(0,reg.length-1);
        var offset = Number(reg[reg.length-1]);
        var stateReg = baseReg + '_STATE';
        var directionReg = baseReg + '_DIRECTION';

        var stateMask = currentValues.get(stateReg);
        var directionMask = currentValues.get(directionReg);

        var stateVal = (stateMask >> offset) & 0x1;
        var directionVal = (directionMask >> offset) & 0x1;
        return {state:stateVal,direction:directionVal};
    };
    this.fixVal = function(value) {
        if(typeof(value) === 'undefined') {
            value = -9999;
        }
        return value;
    };

    function getRegisterType (registerName, deviceType) {
        var deviceType = imgSpecs;
    }
    this.testGetRegisterType = function() {
        console.log('imgSpecs', imgSpecs.REGISTER_OVERLAY_SPEC);
        var list = ['AIN0', 'FIO0', 'EIO0', 'EIO7', 'DAC0'];
        list.forEach(function getRegisterType(register) {
            console.log(register+' Type', imgSpecs.getRegisterType(register));
        });
    };

    this.updateValueStrategies = {
        'ain': function(registerInfo) {
            // console.log('Updating ain register', registerInfo);
            var id = REGISTER_DISPLAY_ID_TEMPLATE(registerInfo);
            var dID = DEVICE_REGISTER_DISPLAY_ID_TEMPLATE(registerInfo);
            var ainVal = $('#'+id).find('.value');
            var dAINVal = $('#'+dID).find('.value');
            var val = self.fixVal(registerInfo.val);
            ainVal.html(imgSpecs.parseAINVal(val));
            dAINVal.html(imgSpecs.parseAINVal(val));
        },
        'dac': function(registerInfo) {
            var val = self.fixVal(registerInfo.val);
            if(val < 0) {
                val = 0;
            }
            $('#' + registerInfo.register + '_input_spinner')
                .val(val.toFixed(3));
            $('#' + registerInfo.register + '-device_input_spinner')
                .val(val.toFixed(3));
        },
        'dio': function(registerInfo) {
            var template = self.displayTemplateData[registerInfo.templateName];
            var htmlData = template(registerInfo);
            var id = REGISTER_DISPLAY_ID_TEMPLATE(registerInfo);
            var devID = DEVICE_REGISTER_DISPLAY_ID_TEMPLATE(registerInfo);
            var deviceContainer = $('#'+'device-display-container');
            var dbContainer = $('#'+'db-display-container');

            var dioRef = dbContainer.find('#'+id);
            var devDIORef = deviceContainer.find('#'+devID);
            dioRef.html(htmlData);
            devDIORef.html(htmlData);
        },
        'flex': function(registerInfo) {
            // console.log('Updating Flex Register', registerInfo);
            var id = REGISTER_DISPLAY_ID_TEMPLATE(registerInfo);
            var devID = DEVICE_REGISTER_DISPLAY_ID_TEMPLATE(registerInfo);
            if(registerInfo.ainEnabled) {
                // console.log('Updating analog flex', registerInfo.val);
                var ainVal = $('#'+id).find('.ainValue');
                var dAINVal = $('#'+devID).find('.ainValue');
                var val = self.fixVal(registerInfo.val);
                ainVal.html(imgSpecs.parseAINVal(val));
                dAINVal.html(imgSpecs.parseAINVal(val));
                // ainVal.html(val);
                // dAINVal.html(val);
            } else {
                var template = self.displayTemplateData[registerInfo.templateName];
                var htmlData = template(registerInfo);

                var deviceContainer = $('#'+'device-display-container');
                var dbContainer = $('#'+'db-display-container');
                var dioRef = dbContainer.find('#'+id);
                var devDIORef = deviceContainer.find('#'+devID);
                dioRef.html(htmlData);
                devDIORef.html(htmlData);
            }
            // console.log('Finished updating Flex Register', registerInfo);
        }
    };
    this.updateValues_v2 = function(channelList, newData, cachedData) {
        // console.log('Channels to Update', channelList.filter(function(ch) {
        //     if(ch.indexOf('AIN') >= 0) {
        //         return false;
        //     } else {
        //         return true;
        //     }
        // }));

        var dataToUpdate = [];

        channelList.forEach(function(channel) {
            var channelData = newData[channel];
            var fullChannelData = cachedData[channel];
            var printDebugData = false;
            if(channel.indexOf('AIN') >= 0) {
                printDebugData = false;
            }
            if(printDebugData) {
                console.log('Channel Name', channel);
                console.log('New Data:', channelData);
                console.log('All Data:', fullChannelData);
            }

            var registerInfo = fullChannelData;
            registerInfo.register = fullChannelData.channelName;

            var registerType = imgSpecs.getRegisterType(channel);
            var registerTemplateName = 'ain-in';
            if (registerType === 'dio') {
                registerTemplateName = 'dio';
            } else if (registerType === 'dac') {
                registerTemplateName = 'dac-out';
            } else if (registerType === 'flex') {
                registerTemplateName = 'flex-io';
            }
            registerInfo.templateName = registerTemplateName;
            var htmlData = self.displayTemplateData[registerTemplateName](registerInfo);
            var device_id = DEVICE_REGISTER_DISPLAY_ID_TEMPLATE(registerInfo);
            var db_id = REGISTER_DISPLAY_ID_TEMPLATE(registerInfo);
            if(printDebugData) {
                // console.log('HTML Data', htmlData);
                console.log('HTML ID', device_id);
                console.log('DB ID', db_id);
            }

            var strategy = self.updateValueStrategies[registerType];
            if(typeof(strategy) === 'function') {
                try {
                    strategy(registerInfo);
                } catch(err) {
                    console.error('(deviceDashboardController.js): Error updating value', registerInfo, err);
                }
            } else {
                console.error('(deviceDashboardController.js): Strategy not defined', registerType);
            }
        });
        // var overlays = d3.select(DEVICE_REGISTERS_CONTAINER)
        // .selectAll('.device-register-overlay')
        // .data(function() {
        //     return
        // })

    };
    /**
     * A function that gets called by the controller.js onRefreshed function
     * that updates the GUI with changed values.  Allows other applications to
     * edit the device settings over a different connection type and the values
     * to be automatically updated here.  More importantly it updates the analog
     * input and digital input values periodically.
     * @param  {array} channels        Array of channels to be updated w/ data
     * @param  {dict} currentValues    Dict of Last-saved device values
    **/
    this.updateValues = function (channels,currentValues) {
        // console.log('In deviceDashboardController.js', channels, currentValues);
        var outputStrategies = {
            'analogInput-': function (channel, register) {
                var id = REGISTER_DISPLAY_ID_TEMPLATE({register: register});
                var dID = DEVICE_REGISTER_DISPLAY_ID_TEMPLATE({register: register});
                var ainVal = $('#'+id).find('.value');
                var dAINVal = $('#'+dID).find('.value');
                var val = self.fixVal(channel.value);
                ainVal.html(imgSpecs.parseAINVal(val));
                dAINVal.html(imgSpecs.parseAINVal(val));
            },
            'analogOutput-': function (channel, register) {
                var val = self.fixVal(channel.value);
                if(val < 0) {
                    val = 0;
                }
                $('#' + register + '_input_spinner')
                    .val(val.toFixed(3));
                $('#' + register + '-device_input_spinner')
                    .val(val.toFixed(3));
            },
            'dynamic-0': function (channel, register) {
                var ids = [];
                ids.push(REGISTER_DISPLAY_ID_TEMPLATE({register: register}));
                ids.push(DEVICE_REGISTER_DISPLAY_ID_TEMPLATE({register: register}));
                var elems = [];
                ids.forEach(function(id){
                    elems.push($('#' + id));
                });
                var state = {
                    '0': {'status': 'inactive', 'text': 'Low'},
                    '1': {'status': 'active', 'text': 'High'}
                }[channel.state.toString()];
                // Get the previously set state & direction for current register
                var curState = self.getCurInfo(register,currentValues);
                if(curState.direction == 1) {
                    elems.forEach(function(elem){
                        // if the previous set direction was 1 (Output), configure GUI as input
                        var inputDisplayId = '.digitalDisplayIndicator';
                        var outputDisplayId = '.digitalStateSelectButton';
                        var dirDisplayId = '.digitalSelectButton .currentValue';
                        var outObj = elem.find(outputDisplayId);
                        var inObj = elem.find(inputDisplayId);
                        var dirObj = elem.find(dirDisplayId);
                        outObj.hide();
                        inObj.show();
                        dirObj.html('Input');
                    });
                }
                // Update input GUI element text color and state-text
                elems.forEach(function(elem){
                    var stateIndicator = elem.find('.state-indicator')
                    .removeClass('active inactive')
                    .addClass(state.status);
                    stateIndicator.html(state.text);
                });
            },
            'dynamic-1': function (channel, register) {
                var ids = [];
                ids.push(REGISTER_DISPLAY_ID_TEMPLATE({register: register}));
                ids.push(DEVICE_REGISTER_DISPLAY_ID_TEMPLATE({register: register}));
                var elems = [];
                ids.forEach(function(id){
                    elems.push($('#' + id));
                });

                // Get the previously set state & direction for current register
                var curState = self.getCurInfo(register,currentValues);
                if(curState.direction == 0) {
                    elems.forEach(function(elem){
                        // if the previous set direction was 0 (Input), configure GUI as output
                        var inputDisplayId = '.digitalDisplayIndicator';
                        var outputDisplayId = '.digitalStateSelectButton';
                        var dirDisplayId = '.digitalSelectButton .currentValue';
                        var outObj = elem.find(outputDisplayId);
                        var inObj = elem.find(inputDisplayId);
                        var dirObj = elem.find(dirDisplayId);
                        inObj.hide();
                        outObj.show();
                        dirObj.html('Output');
                    });
                }
                // Update the GUI element text High/Low
                elems.forEach(function(elem){
                    var statusId = '.digitalStateSelectButton .currentValue';
                    var statusEl = elem.find(statusId);
                    var state = {
                        '0': {'text': 'Low'},
                        '1': {'text': 'High'}
                    }[channel.state.toString()];
                    statusEl.html(state.text);
                });
            }
        };

        channels.forEach(function (channel, register) {
            outputStrategies[STRATEGY_NAME_TEMPALTE(channel)](
                channel,
                register
            );
        });
    };
    var self = this;
}
