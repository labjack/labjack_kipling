var path = require('path'), fs=require('fs');

// find . | grep package.json.lerna_backup | while read NAME ; do mv $NAME $(echo $NAME | sed s/.lerna_backup//) ; done

var walk = function(directoryName) {
    // console.log('Processing: ' + directoryName);
    var files = fs.readdirSync(directoryName);
    files.forEach(function(file) {
        var f = fs.statSync(path.join(directoryName, file));
        if (f.isDirectory()) {
            walk(path.join(directoryName, file));
        } else {
            if (file.endsWith('lerna_backup')) {
                console.log('Renaming: ' + path.join(directoryName, file));
                fs.renameSync(path.join(directoryName, file), path.join(directoryName, file).replace('.lerna_backup', ''));
            }
        }
    });
};

walk(process.env.GITHUB_WORKSPACE);
