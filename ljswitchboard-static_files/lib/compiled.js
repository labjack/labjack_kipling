const d3Base = require('d3');
const d3Time = require('d3-time');
const d3TimeFormat = require('d3-time-format').timeFormat;

const d3 = Object.assign({}, d3Base, {
    time: Object.assign({}, d3Time, {
        format: d3TimeFormat
    })
});

global.d3 = d3;
window.d3 = d3;

const epoch = require('epoch-charting');
global.epoch = epoch;

const kinetic = require('kinetic');
global.kinetic = kinetic;

const typeahead = require('typeahead');
global.typeahead = typeahead;

export {
    d3, kinetic
};
