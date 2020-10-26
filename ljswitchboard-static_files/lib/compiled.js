const d3 = require('d3');
global.d3 = d3;
window.d3 = d3;

import * as epoch from 'epoch-charting';
global.epoch = epoch;

import * as kinetic from 'kinetic';
global.kinetic = kinetic;

import * as typeahead from 'typeahead';
global.typeahead = typeahead;

export {
    d3, kinetic
};
