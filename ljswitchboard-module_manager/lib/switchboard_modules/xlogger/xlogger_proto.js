/**
 * Charting and sampling simluation for JavaScript and NW.js evaluation.
 * 
 * Author: David Lopez @ LabJack Corporation
 * 
 */

// Notes:
// Original code using spread syntax ... is not compatible with the JavaScript
// in Node 8.9.4.

//Show the dev tools window
//nw.Window.get().showDevTools();
function XloggerProto() {
	var self = this;

    //Constant for html space character
    var SPACE = "&nbsp;"

    //Array of colors
    var COLORS = ["YellowGreen", "Violet", "CadetBlue", "Chartreuse", "Chocolate", "BlueViolet", "Brown", "AliceBlue", "Beige", "AntiqueWhite", "Aqua", "Aquamarine", "Bisque", "Black", "BlanchedAlmond", "Blue", "BurlyWood", "Coral", "CornflowerBlue", "Cornsilk", "Crimson", "Cyan", "DarkBlue", "DarkCyan", "DarkGoldenRod", "DarkGray", "DarkGrey", "DarkGreen", "DarkKhaki", "DarkMagenta", "DarkOliveGreen", "Darkorange", "DarkOrchid", "DarkRed", "DarkSalmon", "DarkSeaGreen", "DarkSlateBlue", "DarkSlateGray", "DarkSlateGrey", "DarkTurquoise", "DarkViolet", "DeepPink", "DeepSkyBlue", "DimGray", "DimGrey", "DodgerBlue", "FireBrick", "FloralWhite", "ForestGreen", "Fuchsia", "Gainsboro", "GhostWhite", "Gold", "GoldenRod", "Gray", "Grey", "Green", "GreenYellow", "HoneyDew", "HotPink", "IndianRed", "Indigo", "Ivory", "Khaki", "Lavender", "LavenderBlush", "LawnGreen", "LemonChiffon", "LightBlue", "LightCoral", "LightCyan", "LightGoldenRodYellow", "LightGray", "LightGrey", "LightGreen", "LightPink", "LightSalmon", "LightSeaGreen", "LightSkyBlue", "LightSlateGray", "LightSlateGrey", "LightSteelBlue", "LightYellow", "Lime", "LimeGreen", "Linen", "Magenta", "Maroon", "MediumAquaMarine", "MediumBlue", "MediumOrchid", "MediumPurple", "MediumSeaGreen", "MediumSlateBlue", "MediumSpringGreen", "MediumTurquoise", "MediumVioletRed", "MidnightBlue", "MintCream", "MistyRose", "Moccasin", "NavajoWhite", "Navy", "OldLace", "Olive", "OliveDrab", "Orange", "OrangeRed", "Orchid", "PaleGoldenRod", "PaleGreen", "PaleTurquoise", "PaleVioletRed", "PapayaWhip", "PeachPuff", "Peru", "Pink", "Plum", "PowderBlue", "Purple", "Red", "RosyBrown", "RoyalBlue", "SaddleBrown", "Salmon", "SandyBrown", "SeaGreen", "SeaShell", "Sienna", "Silver", "SkyBlue", "SlateBlue", "SlateGray", "SlateGrey", "Snow", "SpringGreen", "SteelBlue", "Tan", "Teal", "Thistle", "Tomato", "Turquoise", "Wheat", "White", "WhiteSmoke", "Azure", "Yellow"];

    //0 = chart.js
    //1 = plotly
    var CHART_OPTION = 0;


    //The chart object
    var myChart = null;

    //The last scan number
    var totalScans = null;

    //The scan rate of simulated sampling.
    var scanRate = null;
    //The scan interval of simulated sampling. Calculated from scanRate.
    var scanInterval = null;

    //How often the buffered data arrays are updated.
    var dataDelay = 0.005;

    //The number of channels.
    var numCh = null;

    //How much time of samples to be displayed. In seconds.
    var labelsTimeRange = null;
    //How many samples displayed. Calculated from labelsTimeRange.
    var labelsAmount = null;
    //The first label (x value which is time) on the chart
    var startLabel = null;

    //The buffered data. Arrays containing the channels sampled data. Chart values are from here.
    var bufferedData = null;
    //The max. size of buffered data
    var bufferedMax = null;

    //Samples buffer - This is the sample values that are going into the
    //buffered data. These samples will loop. This is precalculated before
    //continuous sampling occurs.
    var samplesBuffer = null;
    //The size of the samples buffer.
    var samplesBufferSize = null;
    //The current samples buffered index. This will be incremented to loop through
    //samples buffer.
    var samplesBufferIndex = null;

    //Variables for calculating the current time (from time started).
    var prevTime = null;
    var startTime = null;

    //Variables for calculating average time between renderings complete.
    var startRenderTime = null;
    var numRenders = 0;

    //How many times the chart is updated in a second (Frames Per Second).
    var chartFPS = null;

    //The interval that garbage collection is forced.
    var garbageCollectInterval = 20000;

    //Indicates if buffered data used for the chart should be decimated (makes dataset smaller for rendering performance).
    var decimate = null;
    //When decimating, the total number of points on the chart.
    var maxPoints = null;

    //The ID for the garbage collecting interval.
    var garbageInterval = null;

    //The ID for the buffered data updating interval.
    var bufferInterval = null;

    //The ID for the buffered charting interval.
    var chartInterval = null;

    //Indicates if the charting and sampling simulation is running.
    var running = false;

    var updatingChart = false;

    var maxMem = 0;
    var avgMem = 0;


    //Displays error message from exception object.
    this.dumpError = function(err) {
        if (typeof err === 'object') {
            if (err.message) {
                console.log('\nMessage: ' + err.message)
            }
            if (err.stack) {
                console.log('\nStacktrace:')
                console.log('====================')
                console.log(err.stack);
            }
        } else {
            console.log('dumpError :: argument is not an object');
        }
    };


    //Returns the milliseconds since 1 January 1970 00:00:00.
    this.getTime = function() {
        return (new Date().getTime());
    };


    //Decimates the array from arr.length size down to amount size.
    //Updates the passed arr array. 
    //To do: Double chceck this is getting the data correctly
    //Going through arr.length amount of data and decimating.
    this.decimateArray = function(arr, amount) {
        var chunks = 0;
        var i = 0;
        var j = 0;
        var newArr = null;

        if(arr.length <= amount)
            return;
        else {
            chunks = Math.floor(arr.length/amount);
            newArr = Array(amount);
            j = newArr.length-1;
            i = arr.length-1;
            while(i >= 0 && j >=0) {
                newArr[j] = arr[i];
                j--;
                i = i - chunks;
            }
        }
        arr.splice(0, arr.length);

        //arr.push(...newArr);
        Array.prototype.push.apply(arr, newArr);
    };


    //Creates the samples buffers.
    this.createSamplesBuffer = function() {
        var i = 0;
        var j = 0;
        var starts = Array(numCh);
        var amp = 0;
        var toRads = 0;
        var inc = 0;
        var range = 0;
        var offset = 0;
        var start = 0;
        var retries = 50;
        var repeat = 0;
        var doRepeat = false;
        var k = 0;

        samplesBuffer = Array(numCh);
        samplesBufferIndex = Array(numCh);
        for (i = 0; i < numCh; i++)
        {
            samplesBuffer[i] = Array(samplesBufferSize);
            samplesBufferIndex[i] = 0;
            start = 0;
            repeat = 0;
            doRepeat = false;
            k = 0;

            while(repeat < retries) {
                range = 1.2;
                offset = 2;
                start = Math.random() * range + offset;

                starts[i] = start;
                if(i == 0) {
                    break;
                }
                doRepeat = false;
                for(k = 0; k < i; k+=1) {
                    if(Math.abs(start - starts[k]) < 0.1) {
                        doRepeat = true;
                    }
                }

                if(doRepeat == true) {
                    repeat++;
                }
                else {
                    break;
                }
            }
            if(i % 3 == 0) {
                amp = 0.050;
                toRads = Math.PI / 180.0;
                inc = 360.0/samplesBufferSize;
                console.log("Sin wave");
                for (j = 0; j < samplesBufferSize; j++) {
                    samplesBuffer[i][j] = Math.sin(inc * j * toRads)*amp + start;
                }
            }
            else if(i % 3 == 1) {
                amp = 0.090;
                toRads = Math.PI / 180.0;
                inc = 360.0/samplesBufferSize;
                console.log("Cos wave");
                for (j = 0; j < samplesBufferSize; j++) {
                    samplesBuffer[i][j] = Math.cos(inc * j * toRads)*amp + start;
                }
            }
            else {
                console.log("Random");
                for (j = 0; j < samplesBufferSize; j++) {
                    amp = 0.060;
                    samplesBuffer[i][j] = Math.random()*amp + start;

                    //console.log("createSamplesBuffer : " + i + " " + samplesBuffer[i][j]);
                }

            }
            //console.log("createSamplesBuffer : " + i + " " + samplesBuffer[i]);
        }
    };


    //Returns the current index of the samples buffer. The index gets incremented afterwards
    //for the next calling.
    //ch specifies which channel's sample index to retieve.
    this.getSamplesBufferIndex = function(ch) {
        var ret = 0;
        var i = 0;

        ret = samplesBufferIndex[ch];
        samplesBufferIndex[ch]++;
        if (samplesBufferIndex[ch] >= samplesBufferSize) {
            samplesBufferIndex[ch] = 0;
        }
        return ret;
    };


    //Returns the samples from the samples buffer.
    //size indicates the amount of samples.
    //ch indicates what channel to get the samples for.
    this.getSamples = function(size, ch) {
        var data = Array(size);
        var i = 0;
        var bufLen = samplesBuffer[ch].length;
        var rand = Math.random()*.1;

        for (i = 0; i < size; i++) {
            data[i] = samplesBuffer[ch][self.getSamplesBufferIndex(ch)];
        }
        return data;
    };


    //Creates the initial buffered data (empty arrays).
    this.createBuffers = function() {
        var i = 0;
        bufferedData = Array(numCh);
        for(i = 0; i < numCh; i++) {
            bufferedData[i] = [];
        }
    };


    var bufferStart = 0;
    var bufferEnd = 0;
    this.createBuffers2 = function() {
        var i = 0;
        bufferedData = Array(numCh);
        for(i = 0; i < numCh; i++) {
            bufferedData[i] = Array(bufferedMax);
        }
        bufferStart = 0;
        bufferEnd = 0;
    };


    //Updates the buffered data which is used directly for the chart. This simulates
    //getting samples from the device / C library.
    this.updateBuffers = function() {
        if(updatingChart) {
            //return;
            console.log("Buffering while charting.");
        }

        var i = 0;
        var j = 0;
        var curTime = 0;
        var updateSize = 0;
        var timeElapsed = 0;
        var rem = 0;  // Amount of elements to remove

        curTime = self.getTime();
        timeElapsed = curTime - prevTime;
        updateSize = Math.floor(timeElapsed / 1000 * scanRate);

        if(updateSize <= 0) {
            return;  //Nothing to update
        }

        prevTime = curTime;
        totalScans += updateSize;
        var remove = 0;
        var add = 0;
        var len1 = 0;
        var len2 = 0;
        //fix len adding and removing. Use 4 chan by 100Khz scan to cause issue for debugging.
        for (i = 0; i < numCh; i++) {
            j = 0;
            if(updateSize > bufferedMax) {
                bufferedData[i].splice(0, bufferedData[i].length);
            }
            while(j < updateSize) {
                var size = Math.min(50000, updateSize-j);
                var samples = self.getSamples(size, i);
                // To keep under parameter limit which is about 65535.
                //bufferedData[i].push(...samples);
                Array.prototype.push.apply(bufferedData[i], samples);
                j += size;
            }
            len1 = bufferedData[i].length;
            remove = Math.max(bufferedData[i].length - bufferedMax, 0);
            //bufferedData[i].splice(0, Math.max(bufferedData[i].length + updateSize - bufferedMax, 0));
            bufferedData[i].splice(0, remove);
            len2 = bufferedData[i].length;
            add = j;
            //console.log("Ch" + i + " = " + len2);
            if(bufferedData[i].length > bufferedMax) {
                console.log("Ch" + i + " is larger than bufferedMax. " + bufferedData[i].length + " " + bufferedMax + ". Update size = " + updateSize);
                console.log("  len1 " + len1 + " Rem " + remove + ", len2 " + len2 + ", add " + add);
            }
        }

        if (bufferedData[0].length >= labelsAmount) {
            startLabel = (totalScans * scanInterval) - (labelsAmount * scanInterval);
        }
    };


    this.updateBuffers2 = function() {
        var i = 0;
        var curTime = 0;
        var updateSize = 0;
        var timeElapsed = 0;
        var rem = 0;  // Amount of elements to remove

        curTime = self.getTime();
        timeElapsed = curTime - prevTime;
        updateSize = Math.floor(timeElapsed / 1000 * scanRate);

        if(updateSize <= 0) {
            return;  //Nothing to update
        }

        prevTime = curTime;
        totalScans += updateSize;
        for (i = 0; i < numCh; i++) {
            bufferedData[i].splice(0, Math.max(bufferedData[i].length + updateSize - bufferedMax, 0));
            //bufferedData[i].push(...self.getSamples(updateSize, i));
            Array.prototype.push.apply(bufferedData[i], self.getSamples(updateSize, i));
        }

        if (bufferedData[0].length >= labelsAmount) {
            startLabel = (totalScans * scanInterval) - (labelsAmount * scanInterval);
        }
        document.getElementById("debug").innerHTML = bufferedData[0].length;
    };


    //Returns data/samples from the buffered data. This will be numCh
    //arrays with size amount of samples.
    //Consider adding a decimation option.
    this.getBuffers = function(size) {
        var data = Array(numCh);
        var i = 0;

        for (i = 0; i < numCh; i++) {
            if (size < bufferedData[i].length)
                data[i] = bufferedData[i].slice(-size);
            else
                data[i] = bufferedData[i].slice(0);
        }
        return data;
    };


    //Create the array of time values for the X axis of the chart.
    //Time increments are based on the scanInterval global.
    //size indicates how many values to get.
    //start indicates the start time.
    //Consider adding decimation option.
    this.createTimeArray = function(size, start) {
        var i = 0;
        var arr = null;

        if (size < 0) {
            throw new Error("invalid array size");
        }

        arr = new Array(size);
        for (i = 0; i < arr.length; i++) {
            arr[i] = (start + i * scanInterval).toFixed(2);
        }
        return arr;
    };


    //Updates the chart. Chart.JS version.
    //Fix scaling when decimating
    this.updateChart_ChartJS = function() {
        if(updatingChart) {
            return;
        }
        updatingChart = true;
        try {
            //console.log("Updating");
            var i = 0;
            var data;
            var pointsCount = 0;
            var bufferedCount = 0;

            data = self.getBuffers(labelsAmount);
            document.getElementById("info").innerHTML = "Scan Rate = " + scanRate + "Hz<br>";
            document.getElementById("info").innerHTML += "Time = " + (self.getTime()/1000.0) + "<br>";
            document.getElementById("info").innerHTML += "Scan : " + totalScans + "<br>";
            document.getElementById("info").innerHTML += "Calc. Time : " + (totalScans*scanInterval).toFixed(3) + "<br>";
            document.getElementById("info").innerHTML += "Sys. Time" + SPACE + SPACE + SPACE + ": " + ((self.getTime() - startTime)/1000.0).toFixed(3) + "<br>";
            for (i = 0; i < numCh; i++) {
                if(decimate) {
                    self.decimateArray(data[i], Math.floor(maxPoints/numCh));
                }
                myChart.data.datasets[i].data = data[i];
                if(numCh < 8) {
                    document.getElementById("info").innerHTML += myChart.data.datasets[i].label + " : ";
                    if(myChart.data.datasets[i].data.length > 0) {
                        document.getElementById("info").innerHTML += myChart.data.datasets[i].data[myChart.data.datasets[i].data.length-1].toFixed(4);
                    }
                    document.getElementById("info").innerHTML += "<br>";
                }
                pointsCount += data[i].length;
                bufferedCount += bufferedData[i].length;
            }
            document.getElementById("debug").innerHTML = "Buffered Samples = " + bufferedCount;
            document.getElementById("debug").innerHTML += "<br>Charted samples = " + pointsCount;

            // X scale is 0 to labelsAmount.
            if(decimate) {
            if(myChart.data.labels.length != Math.floor(maxPoints/numCh)) {
                    var labels = self.createTimeArray(labelsAmount, 0);
                    self.decimateArray(labels, Math.floor(maxPoints/numCh));
                    myChart.data.labels = labels;
                    console.log("Update labels (d) " + myChart.data.labels.length + " " + data[0].length + " " + Math.floor(maxPoints/numCh));
                }
            }
            else {
                if(myChart.data.labels.length != labelsAmount) {
                    var labels = self.createTimeArray(labelsAmount, 0);
                    myChart.data.labels = labels;
                }
            }

            myChart.update();
        }
        catch (err) {
            self.dumpError(err);
            document.getElementById("info").innerHTML = err.message;
        }
        updatingChart = false;
    };


    //Creates the chart. Chart.js version.
    var chartRegister = true;
    this.createChart_ChartJS = function() {
        try {
            if(chartRegister) {
                Chart.plugins.register({
                    afterRender: function(chart, options) {
                        numRenders++;
                        if(numRenders == 1) {
                            startRenderTime = self.getTime();
                            return;
                        }
                        var thisRenderTime = self.getTime();
                        var avgRenderTime = (thisRenderTime - startRenderTime) / (numRenders - 1);
                        avgRenderTime = (avgRenderTime / 1000.0).toFixed(4);
                        document.getElementById("renderinfo").innerHTML = "Avg. Render Time : " + avgRenderTime + "<br>";
                        document.getElementById("renderinfo").innerHTML += SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+
                            "Avg. FPS : " + (1/avgRenderTime).toFixed(2) + "<br>";

                        var thisMem = process.memoryUsage().rss / 1024 / 1024;
                        if(thisMem > maxMem) {
                            maxMem = thisMem;
                        }
                        avgMem = thisMem + avgMem;  //Is actually total
                        document.getElementById("renderinfo").innerHTML += SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+
                            "Avg. Mem : " + (avgMem/numRenders).toFixed(2) + ", Max. Mem: " + maxMem.toFixed(2) + "<br>";

                        var i = 0;
                        var totalPoints = 0;
                        for(i = 0; i < chart.data.datasets.length; i++) {
                            totalPoints += chart.data.datasets[i].data.length;
                        }
                        document.getElementById("renderinfo").innerHTML += SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+
                            "# of Points : " + totalPoints + "<br>";
                        document.getElementById("renderinfo").innerHTML += SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+SPACE+
                            "# of Samples : " + (bufferedMax*numCh);
                    }

                });
                chartRegister = false;
            }

            if(myChart != null) {
                myChart.destroy();
            }

            var timeArr = self.createTimeArray(labelsAmount, startLabel);
            var i = 0;

            var myDataset = new Array(numCh);
            for (i = 0; i < numCh; i++) {
                myDataset[i] = {
                    label: 'Ch' + i,
                    data: [],
                    fill: false,
                    borderColor: COLORS[i],
                    lineTension: 0,
                    borderWidth: 2,
                    radius: 0, // radius is 0 for only this dataset
                };
            }
            console.log("start labels " + timeArr.length);
            var myData = {
                labels: timeArr,
                datasets: myDataset
            }
            document.getElementById("info").innerHTML = "here";
            var ctx = document.getElementById("myChart").getContext('2d');
            ctx.canvas.width = 700; // resize to parent width
            ctx.canvas.height = 400; // resize to parent height

            var ss = labelsTimeRange/2;
            myChart = new Chart(ctx, {
                type: 'line',
                data: myData,
                options: {
                    responsive: false,
                    animation: {
                        duration: 0, // general animation time
                    },
                    hover: {
                        animationDuration: 0, // duration of animations when hovering an item
                    },
                    responsiveAnimationDuration: 0, // animation duration after a resize
                    scales: {
                        xAxes: [{
                            gridLines: {
                                display: true,
                                color: "grey",
                                tickMarkLength: 15,
                            },
                            scaleLabel: {
                                display: true,
                                labelString: 'Time'
                            },
                            ticks: {
                                //min: 0,
                                //max: labelsTimeRange,
                                //stepSize: ss,
                                autoSkip: true,
                                maxTicksLimit: 9, // This needs to be odd or else the last grid is not drawn
                            },
                        }],
                        yAxes: [{
                            gridLines: {
                                display: true,
                                color: "grey",
                                tickMarkLength: 15,
                            },
                            scaleLabel: {
                                display: true,
                                labelString: 'Amplitude',
                            }
                        }],
                    },
                    elements: {
                        line: {
                            tension: 0, // disables bezier curves
                        }
                    },
                }
            });
        }
        catch (err) {
            self.dumpError(err);
            document.getElementById("info").innerHTML = err.message;
        }
    };


    this.updateChart_plotly = function() {
        // Finish and test below
        //console.log("Updating");
        var i = 0;
        var data;
        var pointsCount = 0;
        var bufferedCount = 0;
        data = self.getBuffers(labelsAmount);
        document.getElementById("info").innerHTML = "Scan Rate = " + scanRate + "Hz<br>";
        document.getElementById("info").innerHTML += "Time = " + (self.getTime()/1000.0) + "<br>";
        document.getElementById("info").innerHTML += "Scan : " + totalScans + "<br>";
        document.getElementById("info").innerHTML += "Calc. Time : " + (totalScans*scanInterval).toFixed(3) + "<br>";
        document.getElementById("info").innerHTML += "Sys. Time" + SPACE + SPACE + SPACE + ": " + ((self.getTime() - startTime)/1000.0).toFixed(3) + "<br>";
        for (i = 0; i < numCh; i++) {
            if(decimate) {
                self.decimateArray(data[i], Math.floor(maxPoints/numCh));
            }
            document.getElementById("info").innerHTML += "Ch" + i + " : ";
            if(data[i].length > 0) {
                //console.log(data.length + " " + i + " " + (data[i].length-1) + " " + data[i][0]);
                document.getElementById("info").innerHTML += data[i][data[i].length-1].toFixed(4);
            }
            document.getElementById("info").innerHTML += "<br>";
            pointsCount += data[i].length;
            bufferedCount += bufferedData[i].length;
        }
        document.getElementById("debug").innerHTML = "Buffered Samples = " + bufferedCount;
        document.getElementById("debug").innerHTML += "<br>Charted samples = " + pointsCount;

        // X scale is 0 to labelsAmount.
        var update = {};
        var labels = null;
        if(decimate) {
            if(myChart.data[0].x.length != Math.floor(maxPoints/numCh)) {
                labels = self.createTimeArray(labelsAmount, 0);
                self.decimateArray(labels, Math.floor(maxPoints/numCh));
                //update["x"] = labels;
            }
        }
        else {
            if(myChart.data[0].x.length != labelsAmount) {
                labels = self.createTimeArray(labelsAmount, 0);
                update["x"] = labels;
            }
        }

        if(labels != null) {
            //update["x"] = [];
            Plotly.update(myChart, {x: [labels]});
            //console.log("Update labels (decimate) : ch, data, labels, max " + myChart.data[0].x.length + " " + data[0].length + " " + labels.length + " " + Math.floor(maxPoints/numCh));
        }
        update = {y: []};
        for (i = 0; i < numCh; i++) {
            update["y"][i] = data[i];
            //console.log(i + ": " + myChart.data[i].y.length + " " + myChart.data[i].y.length);
            //console.log(update["y"][i]);
            //console.log(i + " : " + data[i]);

        }
        Plotly.update(myChart, update);
        //var channels = [channel[0], channel[1], channel[2]];
        //update["y"] = data;

    };


    //figure our line shapes
    this.createChart_plotly = function() {
        myChart = document.getElementById('myChart2');
        //Plotly.deleteTraces(myChart, 0);
        Plotly.purge(myChart);
        var traces = [];
        var x_axis = self.createTimeArray(labelsAmount, startLabel);//[0.0, 0.2, 0.4, 0.6, 0.8];
        for (i = 0; i < numCh; i++) {
            console.log("trace " + i);
            traces[i] = {
                x: x_axis,
                y: [],
                name: 'Ch' + i,
                type: 'scatter',
                mode: 'lines',
                line: {shape: 'linear', simplify: false},
                //line: { simplify: false, shape: "spline"},
                stream: { maxpoints: 10000 },
            };
        }
        var x_axis_t = {
            type: 'linear',
            showgrid: true,
            zeroline: true,
            title: 'Time',
            mirror: false,
            //tickmode: 'linear',
            //nticks: 15,
            //tick0: 0
        };
    //        tickwidth: 0};
        var y_axis_t = {
            type: 'linear',
            showgrid: true,
            zeroline: true,
            title: 'Amplitude',
            mirror: false,
            //tickmode: 'linear',
            //nticks: 10,
        };
    //        tickwidth: 0};
        //var traces = [channel[0], channel[1], channel[2]];
        var layout = {xaxis: x_axis_t, yaxis: y_axis_t};
        //mode = {size: 0, opacity: 0};
        Plotly.newPlot( myChart, {data: traces, layout: layout});
    };


    //Updates the chart.
    this.updateChart = function() {
        if(CHART_OPTION == 0) {
            self.updateChart_ChartJS();
        }
        if(CHART_OPTION == 1) {
            //self.updateChart_plotly();
        }
    };


    //creates the chart.
    this.createChart = function() {
        if(CHART_OPTION == 0) {
            self.createChart_ChartJS();
        }
        if(CHART_OPTION == 1) {
            self.createChart_plotly();
        }
    };


    //Force garbage collection
    this.garbageCollect = function() {
        global.gc();
    };


    //Start the charting and sampling simulation.
    this.start = function() {
        console.log("-------- start -------------");
        if(running == true) {
            //ignore
            return;
        }
        try {

            running = true;
            console.log("---------------------------------------");
            console.log("---------------------------------------");
            decimate = document.getElementById("Decimate").checked;
            labelsTimeRange = document.getElementById("XScale").value;
            scanRate = document.getElementById("ScanRate").value;
            numCh = document.getElementById("NumChans").value;
            chartFPS = document.getElementById("FPS").value;
            samplesBufferSize = document.getElementById("SampLoopSize").value;
            scanInterval = 1.0 / scanRate;
            labelsAmount = Math.max(labelsTimeRange * scanRate, 2);
            startLabel = 0;
            bufferedMax = labelsTimeRange*scanRate;
            maxPoints = Math.floor(10000/numCh)*numCh; //700*2*numCh;  //Used when decimating
            prevTime = 0;
            startRenderTime = 0;
            numRenders = 0;
            totalScans = 0;
            maxMem = 0;
            avgMem = 0;

            self.createSamplesBuffer();
            self.createBuffers();
            self.createChart();

            prevTime = self.getTime();
            startTime = prevTime;
            garbageInterval = setInterval(self.garbageCollect, garbageCollectInterval);
            bufferInterval = setInterval(self.updateBuffers, dataDelay*1000);
            chartInterval = setInterval(self.updateChart, 1/chartFPS*1000);
            console.log("Chart Interval " + (1/chartFPS*1000));
        }
        catch (err) {
            self.dumpError(err);
            document.getElementById("debug").innerHTML = err.message;
        }
    };


    //Stop the charting and sampling simulation.
    this.stop = function() {
        console.log("-------- stop -------------");
        try {
            clearInterval(chartInterval);
            clearInterval(bufferInterval);
            clearInterval(garbageInterval);
            chartInterval = null;
            bufferInterval = null;
            garbageInterval = null;
            running = false;
            bufferedData = null;
            samplesBuffer = null;
        }
        catch (err) {
            self.dumpError(err);
            document.getElementById("debug").innerHTML = err.message;
        }
    };
}