/* jshint undef: true, unused: true, undef: true */
/* global console, module_manager, dict, q, showAlert, modbus_map, $ */
/* global ljmmm_parse, handlebars */

/* exported activeModule, module, MODULE_UPDATE_PERIOD_MS */

/**
 * Goals for the Register Matrix module:
**/

// imports
// import { Component, ElementRef, Input, OnChanges } from '@angular/core';
// import * as d3 from 'd3';

// components
// @Component({
//     selector: 'app-line-chart',
//     templateUrl: './view.html',
//     styleUrls: ['./style.css']
// })


// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 1000;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module(){
    this.moduleConstants = {};

    this.startupData = {};
    this.moduleName = '';
    this.moduleContext = {};
    this.activeDevice = undefined;

    this.updateTimer = undefined;

    var data = [];
    var displayData = [];
    var totalPoints = 300;

    this.allowUpdate = false;
    this.getDataSize = function() {
        return data.length;
    };
    this.getDisplayDataSize = function() {
        return displayData.length;
    };
    var getRandomData = function(numNewDataPoints) {
        var i = 0;

        var numOriginal = data.length;

        for(i = 0; i < numNewDataPoints; i++) {
            data.shift();
            displayData.shift();
        }

        
        var numNew = 0;
        while(data.length < totalPoints) {
            var prev = data.length > 0 ? data[data.length - 1] : 50,
                y = prev + Math.random() * 10 - 5;

            if(y < 0) {
                y = 0;
            } else if (y > 100) {
                y = 100;
            }

            data.push(y);
            numNew += 1;
        }

        

        // var numToRemove = displayData.length - totalPoints;
        // if(numToRemove > 0) {
        //     displayData.
        // }
        // console.log('numNew Vals', numNew);
        for(i = 0; i < numNew; i++) {
            displayData.push([i + numOriginal, data[i]]);
        }
        var numShifted = 0;
        while(displayData.length > totalPoints) {
            displayData.shift(1);
            numShifted += 1;
        }
        // console.log('Shifted...', numShifted, displayData.length);

        // Re-index data
        for(i = 0; i < data.length; i++) {
            displayData[i][0] = i;
        }

        // displayData = [];
        // for(i = 0; i < data.length; i++) {
        //     displayData.push([i, data[i]]);
        // }


        return displayData;
    };

    this.chartUpdateInterval = 1000;
    this.numDataPointsPerUpdate = 1;
    var initializeUpdater = function() {
        $("#updateInterval").val(self.chartUpdateInterval).change(function () {
            var v = $(this).val();
            if (v && !isNaN(+v)) {
                self.chartUpdateInterval = +v;
                if (self.chartUpdateInterval < 1) {
                    self.chartUpdateInterval = 1;
                } else if (self.chartUpdateInterval > 2000) {
                    self.chartUpdateInterval = 2000;
                }
                $(this).val("" + self.chartUpdateInterval);
            }
        });
        function update() {
            if(self.allowUpdate) {
                var y = Math.random()*10;

                if(y < 0) {
                    y = 0;
                } else if (y > 10) {
                    y = 10;
                }
                // self.addData(y);
                var trace1 = {
                    x: [1, 2, 3, 4],
                    y: [10, 15, 13, 17],
                    type: 'scatter'
                  };
                  
                  var trace2 = {
                    x: [1, 2, 3, 4],
                    y: [16, 5, 11, 9],
                    type: 'scatter'
                  };
                  
                  var data = [trace1, trace2];
                  
                Plotly.newPlot('myDiv', data);
                self.addData(data)
                // var newData = getRandomData(self.numDataPointsPerUpdate);
                // self.plot.setData([newData]);

                // Since the axes don't change, we don't need to call plot.setupGrid()

                // self.plot.draw();

                setTimeout(update, self.chartUpdateInterval);
            }
        }

        update();
    };

    // this is suposuvly a better way of tring to get d3.js to working order
    var api = 'https://api.coindesk.com/v1/bpi/historical/close.json?start=2017-12-31&end=2018-04-01';
    document.addEventListener("DOMContentLoaded", function(event) {
        fetch(api)
        .then(function(response){
            return response.json();
        })
        .then(function(data){
            // WILL DO SOMETHING WITH THE DATA
        })
        .then(function(data){
            var parsedData = parseData(data);
            drawChart(parsedData);
        })
    })

    function parseData(data) {
        var arr = [];
        for(var i in data.bpi) {
            arr.push({
                date: new Date(i), // date
                value: +data.bpi[i] // used to convert the string to a number
            });
        }
        return arr;
    }

    // function drawChart(data) {
    //     var svgWidth = 600, svgHeight = 400;
    //     var margin = Margin = {
    //         top: 20
    //     }
    // }

    // Constructor(public chartElem: ElementRef){}
    // this is the d3.js testing thing    
    // var initializeChart = function() {
    //     this.svg = d3
    //         .select(this.charElem.nativeElement)
    //         .select('.demo-container')
    //         .append('svg')
    //         .attr('height', this.height);
        
    //     this.svgInner = this.svg
    //         .append('g')
    //         .style('transform', 'translate(' + this.margin + 'px, ' + this.margin + 'px)');

    //     this.yScale = d3
    //         .scaleLiner()
    //         .domain([d3.max(this.data, d => d.value) + 1, d3.margin(this.data, d => d.value) -1])
    //         .range([0, this.height - 2 * this.margin]);

    //     this.xScale = d3.scaleTime().domain(d3.extent(this.data, d => new Date(d.date)));

    //     this.yAxis = this.svgInner
    //         .append('g')
    //         .attr('id', 'y-axis')
    //         .style('transform', 'translate(' + this.margin + 'px, 0)');

    //     this.xAxis = this.svgInner
    //         .append('g')
    //         .attr('id', 'x-axis')
    //         .style('transform', 'translate(0, ' + (this.height - 2 * this.margin) + 'px)');

    //     this.lineGroup = this.svgInner
    //         .append('g')
    //         .append('path')
    //         .attr('id', 'line')
    //         .style('fill', 'none')
    //         .style('stroke', 'red')
    //         .style('stroke-width', '2px');
    // }

    // var drawChart = function() {
    //     this.width = this.charElem.nativeElement.getBoundingClientRect().width;

    //     this.svg.attr('width', this.width);

    //     this.xScale.range([this.margin, this.width - 2 * this.margin]);

    //     const xAxis = d3
    //         .axisBottom(this.xScale)
    //         .tick(10)
    //         .tickFormat(d3.timeFormat('%m, %Y'))
        
    //     this.xAxis.call(xAxis);

    //     const yAxis = d3
    //         .axisRight(this.yScale);
        
    //     this.yAxis.call(yAxis);

    //     const line = d3
    //         .line()
    //         .x(d => d[0])
    //         .y(d => d[1])
    //         .curve(d3.curveMonotoneX);

    //     // this will most lickly need to be changed to 'int' not 'number'
    //     const points: [number, number][] = this.data.map(d => [this.xScale(new Date(d.date))]);

    //     this.lineGroup.attr('d', line(points));
    // }

    

    this.chartInstance = undefined;
    var initializeFlotPlot = function() {
        var dateInstance = new Date();
        var timeA = dateInstance.getTime();
        var timeB = timeA + 10;
        var timeC = timeB + 10;
        console.log('Times', timeA, timeB, timeC);

        // var data = [
        //   { label: 'Layer 1', values: [ {time: 0, y: 0}, {time: 1, y: 1}, {time: 2, y: 2} ] },
        //   { label: 'Layer 2', values: [ {time: 0, y: 0}, {time: 1, y: 1}, {time: 2, y: 4} ] }
        // ];
        // self.chartInstance = $('#area').epoch({
        //     type: 'time.line',
        //     data: data,
        //     axes: ['left', 'right', 'bottom']
        // });
    };

    this.numAdded = 3;
    this.addData = function(newVal) {
        // self.chartInstance.push([
        //     {time: self.numAdded, y: newVal},
        //     {time: self.numAdded, y: newVal + 1}
        // ]);
        self.numAdded += 1;
    };
    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        self.startupData = framework.moduleData.startupData;
        self.moduleName = framework.moduleData.name;

        onSuccess();
    };

    /**
     * Function is called once every time a user selects a new device.  
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        self.activeDevices = device;
        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');
        
        onSuccess();
    };

    /**
     * Function that gets executed after the module's template is displayed.
     * @param  {object} framework framework object.
     * @param  {function} onError   function to be called on error.
     * @param  {function} onSuccess function to be called on success
     * @return {[type]}           [description]
     */
    this.onTemplateDisplayed = function(framework, onError, onSuccess) {
        self.allowUpdate = true;
        initializeFlotPlot();
        initializeUpdater();
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        self.allowUpdate = false;
        onSuccess();
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
        onHandle(true);
    };

    var self = this;
}
