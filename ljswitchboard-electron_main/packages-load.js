'use strict';

const path = require('path');
const persistent_data_manager = require('./persistent_data_manager');

async function loadProgramPackages(package_loader, splashScreenUpdater) {
    // Attach various event listeners to the package_loader
    package_loader.on('loaded_package', function(packageName) {
        // console.log('Loaded New Package', packageName);
    });
    package_loader.on('set_package', function(packageName) {
        // console.log('Saved New Package', packageName);
    });

    package_loader.on('starting_extraction', function(packageInfo) {
        console.log('Extracting package', packageInfo.name);
        splashScreenUpdater.update('Extracting ' + packageInfo.name);
    });
    package_loader.on('finished_extraction', function(packageInfo) {
        console.log('Finished Extracting package', packageInfo.name);
        splashScreenUpdater.update('Finished Extracting ' + packageInfo.name);
    });

    package_loader.on('failed_to_initialize_package_manager', function(message) {
        console.log('Failed to initialize package_manager', message);
        splashScreenUpdater.update(message.toString());
    });
    package_loader.on('failed_to_load_managed_package', function(message) {
        // console.warn('failed_to_load_managed_package:', message);
    });

    const gui = package_loader.getPackage('gui');
    const window_manager = package_loader.getPackage('window_manager');
    const info = require('./get_cwd');

    const startDir = info.startDir;

    const secondaryPackages = [
        {
            'name': 'static_files',
            'folderName': 'ljswitchboard-static_files',
            'loadMethod': 'managed',
            'forceRefresh': false,
            'directLoad': true,
            'locations': [
                // Add path to files for development purposes, out of a repo.
                path.join(startDir, '..', 'ljswitchboard-static_files'),

                // If those files aren't found, check the node_modules directory of
                // the current application for upgrades.
                path.join(startDir, 'node_modules', 'ljswitchboard-static_files'),

                // For non-development use, check the LabJack folder/K3/downloads
                // file for upgrades.
                // TODO: Add this directory

                // If all fails, check the starting directory of the process for the
                // zipped files originally distributed with the application.
                path.join(startDir, 'resources', 'app', 'ljswitchboard-static_files.zip'),
                path.resolve(startDir, '..', 'Resources', 'app', 'ljswitchboard-static_files.zip'),
                path.join(startDir, 'ljswitchboard-static_files.zip')
            ]
        },
        {
            'name': 'core',
            'folderName': 'ljswitchboard-core',
            'loadMethod': 'managed',
            'forceRefresh': false,
            'startApp': false,
            'showDevTools': true,
            'directLoad': true,
            'locations': [
                // Add path to files for development purposes, out of a repo.
                path.join(startDir, '..', 'ljswitchboard-core'),

                // If those files aren't found, check the node_modules directory of
                // the current application for upgrades.
                path.join(startDir, 'node_modules', 'ljswitchboard-core'),

                // For non-development use, check the LabJack folder/K3/downloads
                // file for upgrades.
                // TODO: Add this directory

                // If all fails, check the starting directory of the process for the
                // zipped files originally distributed with the application.
                path.join(startDir, 'resources', 'app', 'ljswitchboard-core.zip'),
                path.resolve(startDir, '..', 'Resources', 'app', 'ljswitchboard-core.zip'),
                path.join(startDir, 'ljswitchboard-core.zip')
            ]
        }
    ];

    const initializeProgram = async function() {
        // Perform async operations
        // const ljm_driver_checker = global.ljswitchboard.ljm_driver_checker;
        const ljm_driver_checker = package_loader.getPackage('ljm_driver_checker');

        let res;
        try {
            res = await ljm_driver_checker.verifyCoreInstall();
            console.log('Core Req Check', res);
            // Make sure that the LabJack directory has been created
            if (!res.overallResult) {
                console.log('Failed core-check');
                splashScreenUpdater.update('Failed installation verification');
                throw {'code': 'core', 'data': res};
            }

        } catch (err) {
            console.log('Failed while executing verifyCoreInstall', err);
            splashScreenUpdater.update('Failed to verify installation');
            throw err;
        }

        const lj_folder_path = res['LabJack folder'].path;

        let persistentDataManager;

        // Save to the global scope
        // global.ljswitchboard.labjackFolderPath = lj_folder_path;
        if(!!process.env.TEST_MODE || gui.App.manifest.test) {
            persistentDataManager = new persistent_data_manager.create(
                lj_folder_path,
                gui.App.manifest.testPersistentDataFolderName,
                gui.App.manifest.persistentDataVersion
            );
        } else {
            persistentDataManager = new persistent_data_manager.create(
                lj_folder_path,
                gui.App.manifest.persistentDataFolderName,
                gui.App.manifest.persistentDataVersion
            );
        }

        // Save the path to the global scope
        // global.ljswitchboard.appDataPath = persistentDataManager.getPath();
        const appDataPath = persistentDataManager.getPath();
        const forceRefresh = gui.App.manifest.forceRefreshOfPersistentData;

        try {
            const initRes = await persistentDataManager.init(forceRefresh);
            console.log('Re-Initialized Data:', initRes);
            return persistentDataManager;
        } catch (err) {
            appExtractionFailed = true;
            console.log('Failed to initialize data', err);
            console.log('Write-access required for:', appDataPath.toString());
            splashScreenUpdater.update('App Failed: write-access required for: ' + appDataPath.toString());
            throw {'code': 'persistentData', 'data': err};
        }
    };

    let appExtractionFailed = false;

    async function loadSecondaryPackages(persistentDataManager) {
        if(appExtractionFailed) {
            throw 'appExtractionFailed';
        }

        console.log('Loading Secondary Packages');

        const appDataPath = persistentDataManager.getPath();
        // Get the appDataPath

        // Configure the package_loader with this path
        package_loader.setExtractionPath(appDataPath);

        for (const packageInfo of secondaryPackages) {
            await package_loader.loadPackage(packageInfo);
        }

        try {
            const packages = await package_loader.runPackageManager()
            console.log('Opening managed apps', Object.keys(packages));
            try {
                // Instruct the window_manager to open any managed nwApps
                return window_manager.openManagedApps(packages);
            } catch (err) {
                console.error('Error opening', err);
                console.log('Failed to open managed apps (sp)', err);
                splashScreenUpdater.update('Failed to open managed apps (sp)');
                throw err;
            }
        } catch (err) {
            console.log('Failed to run package manager (sp)', err);
            splashScreenUpdater.update('Failed to run package manager (sp)');
        }
    }

    await package_loader.loadPackage({
        'name': 'ljm_driver_checker',
        'loadMethod': 'set',
        'ref': require('ljswitchboard-ljm_driver_checker')
    });
    await package_loader.loadPackage({
        'name': 'info',
        'loadMethod': 'set',
        'ref': info
    });
    await package_loader.loadPackage({
        'name': 'handleBarsService',
        'loadMethod': 'set',
        'ref': require('./lib/handlebar_service').handleBarsService
    });


    const persistentDataManager = await initializeProgram();
    await loadSecondaryPackages(persistentDataManager);
    console.log('Program initialized');
}

exports.loadProgramPackages = loadProgramPackages;
