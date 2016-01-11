#!/usr/bin/env node
require('cli').withStdinLines(function(lines, newline) {
    this.output(lines.sort().join(newline));
});