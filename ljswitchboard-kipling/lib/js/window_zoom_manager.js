

var q = require('q');
var async = require('async');

// Define the window zoom manager
function createWindowZoomManager() {
    this.zoomLevel = 1;
    this.zoomIncrement = 0.05;

    this.keyboardEventHandler = undefined;

    // Set the initial body zoom.
    window.document.body.style.zoom = this.initialZoom;

    function zoomIn() {
        self.zoomLevel = self.zoomLevel + self.zoomIncrement;
        window.document.body.style.zoom = self.zoomLevel;
    }
    
    function zoomOut() {
        self.zoomLevel = self.zoomLevel - self.zoomIncrement;
        window.document.body.style.zoom = self.zoomLevel;
    }
    

    this.zoomIn = zoomIn;
    this.zoomOut = zoomOut;

    // The window zoom manager is initialized by the index.js file in the 
    // Kipling application.
    this.init = function(bundle) {
        // console.log('Initializing window zoom manager', bundle);
        var defered = q.defer();

        defered.resolve(bundle);
        return defered.promise;
    };
    var self = this;
}
var WINDOW_ZOOM_MANAGER = new createWindowZoomManager();