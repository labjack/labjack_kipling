'use strict';

const path = require('path');
const PersistentDataManager = require('./persistent_data_manager').PersistentDataManager;
const {checkRequirements} = require('./check_requirements');
const manifest = require('../package.json');

async function loadProgramPackages(package_loader) {
    const splashScreenUpdater = package_loader.getPackage('splashScreenUpdater');

    package_loader.on('starting_extraction', function(packageInfo) {
        console.log('Extracting package', packageInfo.name);
        splashScreenUpdater.update('Extracting ' + packageInfo.name, 'info');
    });
    package_loader.on('finished_extraction', function(packageInfo) {
        console.log('Finished Extracting package', packageInfo.name);
        splashScreenUpdater.update('Finished Extracting ' + packageInfo.name, 'pass');
    });
    package_loader.on('failed_to_initialize_package_manager', function(message) {
        console.log('Failed to initialize package_manager', message);
        splashScreenUpdater.update(message.toString(), 'fail');
    });
    package_loader.on('failed_to_load_managed_package', function(packageInfo) {
        console.log('failed_to_load_managed_package', packageInfo.name);
        splashScreenUpdater.update('Failed to load ' + packageInfo.name + ' from locations: ' + JSON.stringify(packageInfo.locations), 'fail');
    });
    package_loader.on('FINISHED_RESETTING_PACKAGE_ERROR', function (bundle) {
        splashScreenUpdater.update('Error resetting the package-cache, try manually deleting the folder:' + bundle.currentPackage.location, 'fail');
    });
    package_loader.on('DETECTED_UNINITIALIZED_PACKAGE_WO_UPGRADE', function (bundle) {
        splashScreenUpdater.update('Detected an uninitialized package with no upgrade options: ' + bundle.name, 'fail');
    });

    const info = require('./get_cwd');

    await package_loader.loadPackage({
        'name': 'ljm_driver_checker',
        'loadMethod': 'set',
        'ref': require('ljswitchboard-ljm_driver_checker')
    });

    await checkRequirements(package_loader);

    await package_loader.loadPackage({
        'name': 'manifest',
        'loadMethod': 'set',
        'ref': manifest
    });
    await package_loader.loadPackage({
        'name': 'info',
        'loadMethod': 'set',
        'ref': info
    });
    await package_loader.loadPackage({
        'name': 'handleBarsService',
        'loadMethod': 'set',
        'ref': require('./handlebar_service').handleBarsService
    });
    await package_loader.loadPackage({
        'name': 'fs_facade',
        'loadMethod': 'set',
        'ref': require('./fs_facade')
    });

    const ljm_driver_checker = package_loader.getPackage('ljm_driver_checker');

    let res;
    try {
        res = await ljm_driver_checker.verifyCoreInstall();
        console.log('Core Req Check', res);
        // Make sure that the LabJack directory has been created
        if (!res.overallResult) {
            console.log('Failed core-check');
            splashScreenUpdater.update('Failed installation verification', 'fail');
            throw {'code': 'core', 'data': res};
        }

    } catch (err) {
        console.log('Failed while executing verifyCoreInstall', err);
        splashScreenUpdater.update('Failed to verify installation', 'fail');
        throw err;
    }

    const lj_folder_path = res['LabJack folder'].path;

    const persistentDataManager = new PersistentDataManager(
        lj_folder_path,
        (!!process.env.TEST_MODE || manifest.test) ? manifest.testPersistentDataFolderName : manifest.persistentDataFolderName,
        manifest.persistentDataVersion
    );

    try {
        const initRes = await persistentDataManager.init(manifest.forceRefreshOfPersistentData);
        console.log('Re-Initialized Data:', initRes);
    } catch (err) {
        console.log('Failed to initialize data', err);
        const appDataPath = persistentDataManager.getPath();
        console.log('Write-access required for:', appDataPath.toString());
        splashScreenUpdater.update('App Failed: write-access required for: ' + appDataPath.toString(), 'fail');
        throw {'code': 'persistentData', 'data': err};
    }

    console.log('Loading Secondary Packages');

    const appDataPath = persistentDataManager.getPath();
    await package_loader.setExtractionPath(appDataPath);

    const startDir = info.startDir;
    console.warn("==== Start Directory =====", info, info.startDir);

    await package_loader.loadPackage({
        'name': 'static_files',
        'folderName': 'ljswitchboard-static_files',
        'loadMethod': 'managed',
        'forceRefresh': false,
        'directLoad': true,
        'locations': [
            // Add path to files for development purposes, out of a repo. These are local repo file changes
            path.join(__dirname, '..', '..', 'ljswitchboard-static_files'),

            // If those files aren't found, check the node_modules directory of
            // the current application for upgrades.
            // path.join(startDir, 'node_modules', 'ljswitchboard-static_files'),

            // For non-development use, check the LabJack folder/K3/downloads
            // file for upgrades.
            // TODO: Add this directory

            // If all fails, check the starting directory of the process for the
            // zipped files originally distributed with the application.
            path.join(startDir, 'resources', 'app', 'ljswitchboard-static_files.zip'),
            path.resolve(startDir, '..', 'Resources', 'app', 'ljswitchboard-static_files.zip'),
            path.join(startDir, 'ljswitchboard-static_files.zip')
        ]
    });

    await package_loader.loadPackage({
        'name': 'io_manager',
        'folderName': 'ljswitchboard-io_manager',
        'loadMethod': 'managed',
        'forceRefresh': false,
        'directLoad': true,
        'locations': [
            // Add path to files for development purposes, out of a repo.
            path.join(__dirname, '..', '..', 'ljswitchboard-io_manager'),

            // If those files aren't found, check the node_modules directory of
            // the current application for upgrades.
            // path.join(startDir, 'node_modules', 'ljswitchboard-io_manager'),

            // For non-development use, check the LabJack folder/K3/downloads
            // file for upgrades.
            // TODO: Add this directory

            // If all fails, check the starting directory of the process for the
            // zipped files originally distributed with the application.
            path.join(startDir, 'resources', 'app', 'ljswitchboard-io_manager.zip'),
            path.resolve(startDir, '..', 'Resources', 'app', 'ljswitchboard-io_manager.zip'),
            path.join(startDir, 'ljswitchboard-io_manager.zip')
        ]
    });
    await package_loader.loadPackage({
        'name': 'module_manager',
        'folderName': 'ljswitchboard-module_manager',
        'loadMethod': 'managed',
        'forceRefresh': false,
        'directLoad': true,
        'locations': [
            // Add path to files for development purposes, out of a repo.
            path.join(__dirname, '..', '..', 'ljswitchboard-module_manager'),

            // If those files aren't found, check the node_modules directory of
            // the current application for upgrades.
            // path.join(startDir, 'node_modules', 'ljswitchboard-module_manager'),

            // For non-development use, check the LabJack folder/K3/downloads
            // file for upgrades.
            // TODO: Add this directory

            // If all fails, check the starting directory of the process for the
            // zipped files originally distributed with the application.
            path.join(startDir, 'resources', 'app', 'ljswitchboard-module_manager.zip'),
            path.resolve(startDir, '..', 'Resources', 'app', 'ljswitchboard-module_manager.zip'),
            path.join(startDir, 'ljswitchboard-module_manager.zip')
        ]
    });
    await package_loader.loadPackage({
        'name': 'kipling',
        'folderName': 'ljswitchboard-kipling',
        'loadMethod': 'managed',
        'forceRefresh': false,
        'directLoad': true,
        'locations': [
            // Add path to files for development purposes, out of a repo.
            path.join(__dirname, '..', '..', 'ljswitchboard-kipling'),

            // If those files aren't found, check the node_modules directory of
            // the current application for upgrades.
            path.join(startDir, 'node_modules', 'ljswitchboard-kipling'),

            // For non-development use, check the LabJack folder/K3/downloads
            // file for upgrades.
            // TODO: Add this directory

            // If all fails, check the starting directory of the process for the
            // zipped files originally distributed with the application.
            path.join(startDir, 'resources', 'app', 'ljswitchboard-kipling.zip'),
            path.resolve(startDir, '..', 'Resources', 'app', 'ljswitchboard-kipling.zip'),
            path.join(startDir, 'ljswitchboard-kipling.zip')
        ]
    });

    if (!!process.env.TEST_MODE || manifest.test) {
        console.log('Adding kipling_tester');
        await package_loader.loadPackage({
            'name': 'kipling_tester',
            'folderName': 'ljswitchboard-kipling_tester',
            'loadMethod': 'managed',
            'forceRefresh': false,
            'directLoad': true,
            'locations': [
                // Add path to files for development purposes, out of a repo.
                path.join(__dirname, '..', '..', 'ljswitchboard-kipling_tester'),
                // path.join(startDir, 'node_modules', 'ljswitchboard-kipling_tester'),
                path.join(startDir, 'resources', 'app', 'ljswitchboard-kipling_tester.zip'),
                path.resolve(startDir, '..', 'Resources', 'app', 'ljswitchboard-kipling_tester.zip'),
                path.join(startDir, 'ljswitchboard-kipling_tester.zip')
            ]
        });
    }

    try {
        const managedPackages = await package_loader.runPackageManager();
        console.log('Managed Packages', Object.keys(managedPackages));
        const keys = Object.keys(managedPackages);

        let continueLaunch = true;
        for (const key of keys) {
            const curPackage = managedPackages[key];
            if (curPackage.isError) {
                continueLaunch = false;
            }
            splashScreenUpdater.update('Launching ' + curPackage.name, 'info');
        }
    } catch (err) {
        console.log('Failed to run package manager (sp)', err);
        splashScreenUpdater.update('Failed to run package manager (sp)', 'fail');
    }

    console.log('Program initialized');
}

exports.loadProgramPackages = loadProgramPackages;
