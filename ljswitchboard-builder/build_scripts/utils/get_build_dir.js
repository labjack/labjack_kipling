'use strict';

const fs = require('fs');

let build_dir = process.env.BUILD_DIR ? process.env.BUILD_DIR : process.cwd();

if (!fs.existsSync(build_dir)) {
    fs.mkdirSync(build_dir, { recursive: true });
}

exports.getBuildDirectory = function() {
    return build_dir;
};
