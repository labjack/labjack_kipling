
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var archiver = require('archiver');
var cwd = process.cwd();
// var ndd = require('node-dir-diff');
var util = require('util');

var fileOps = require('../build_scripts/file_operations');


var TEMP_ZIP_TEST_DIR = 'temp_zip_test_dir';
var TEMP_ZIP_TEST_PATH = path.normalize(path.join(cwd, TEMP_ZIP_TEST_DIR));

var TEMP_EXTRACT_TEST_DIR = 'temp_extract_test_dir';
var TEMP_EXTRACT_TEST_PATH = path.normalize(path.join(cwd, TEMP_EXTRACT_TEST_DIR));

// Have the test compress all folders in the temp_project_files dir and try
// to un-archive them to the temp_zip_test_dir folder.
var DIR_OF_FILES_TO_ZIP = 'temp_project_files';
var PATH_OF_FILES_TO_ZIP = path.normalize(path.join(cwd, DIR_OF_FILES_TO_ZIP));

var testFolders = [];

var createTestZipFiles = true;
var parseTestZipFiles = true;
var extractTestZipFiles = true;
exports.tests = {
    'create temporary .zip output directory': function(test) {
        try {
            if(createTestZipFiles) {
                fse.ensureDirSync(TEMP_ZIP_TEST_PATH);
                fse.emptyDirSync(TEMP_ZIP_TEST_PATH);
            }

            if(extractTestZipFiles) {
                fse.ensureDirSync(TEMP_EXTRACT_TEST_PATH);
                fse.emptyDirSync(TEMP_EXTRACT_TEST_PATH);
            }
        } catch(err) {
            test.ok(false, 'failed to ensureDirSync');
            console.error(err);
        }
        test.done();
    },
    'verify that there is data to test on': function(test) {
        var folders = fs.readdirSync(PATH_OF_FILES_TO_ZIP);

        var testFolderInFolders = function(expectedFolder) {
            var str = 'Expected ' + expectedFolder + ' in ' + PATH_OF_FILES_TO_ZIP;
            test.ok(folders.indexOf(expectedFolder) != -1, str);
        };
        testFolderInFolders('ljswitchboard-core');
        testFolderInFolders('ljswitchboard-io_manager');
        testFolderInFolders('ljswitchboard-kipling');
        testFolderInFolders('ljswitchboard-module_manager');
        testFolderInFolders('ljswitchboard-splash_screen');
        testFolderInFolders('ljswitchboard-static_files');

        folders.forEach(function(folder) {
            var origin = path.normalize(path.join(PATH_OF_FILES_TO_ZIP, folder));
            var zipPath = path.normalize(path.join(TEMP_ZIP_TEST_PATH, folder + '.zip'));
            var extractPath = path.normalize(path.join(TEMP_EXTRACT_TEST_PATH, folder));
            testFolders.push({
                'name': folder,
                'origin': origin,
                'zipPath': zipPath,
                'extractPath': extractPath,
            });
        });

        test.done();
    },
    'create test .zip files': function(test) {
        if(createTestZipFiles) {
            var folders = testFolders.map(function(testFolder) {
                return {'from': testFolder.origin, 'to': testFolder.zipPath};
            });
            fileOps.compressFolders(folders)
            .then(function() {
                // console.log('Finished Compressing (test)');
                test.done();
            });
        } else {
            console.log('Skipping...');
            test.done();
        }
    },
    'parse .zip files': function(test) {
        if(parseTestZipFiles) {
            var files = testFolders.map(function(testFolder) {
                return {'path': testFolder.zipPath};
            });
            fileOps.parseZipFiles(files)
            .then(function() {
                // console.log('Finished Parsing');
                test.done();
            });
        } else {
            console.log('Skipping...');
            test.done();
        }
    },
    'extract test .zip files': function(test) {
        if(extractTestZipFiles) {
            var files = testFolders.map(function(testFolder) {
                return {'from': testFolder.zipPath, 'to': testFolder.extractPath};
            });
            fileOps.extractFiles(files)
            .then(function() {
                // console.log('Finished Extracting (test)');
                test.done();
            });
        } else {
            console.log('Skipping...');
            test.done();
        }
    },
    // 'verify output directories': function(test) {
    //     var dd = new ndd.Dir_Diff(
    //         [
    //             // TEMP_EXTRACT_TEST_PATH,
    //             // PATH_OF_FILES_TO_ZIP,
    //             path.resolve(cwd, TEMP_EXTRACT_TEST_DIR),
    //             path.resolve(cwd, DIR_OF_FILES_TO_ZIP),
    //         ],
    //         'list'
    //     );

    //     // console.log('Comparing directories', TEMP_EXTRACT_TEST_PATH);
    //     // console.log('Comparing directories', PATH_OF_FILES_TO_ZIP);
    //     console.log('Comparing directories', path.resolve(cwd, TEMP_EXTRACT_TEST_DIR));
    //     console.log('Comparing directories', path.resolve(cwd, DIR_OF_FILES_TO_ZIP));
    //     dd.compare(function (err, result) {
    //         if (result.deviation > 0){
    //             console.log('you have %s deviations!', result.deviation);
    //             console.log(util.inspect(result.deviation));
    //             // console.log(JSON.stringify(result, null, 2));
    //         }
    //         test.done();
    //     });
    // },
};

