const path = require('path');
const persistent_data_manager = require('./persistent_data_manager');

function loadProgramPackages(injector, splashScreenUpdater) {
    const package_loader = injector.get('package_loader');

    // Attach various event listeners to the package_loader
// package_loader.on('opened_window', windowManager.addWindow);
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
        console.log('Failed to initialize pagkage_manager', message);
        splashScreenUpdater.update(message.toString());
    });
    package_loader.on('failed_to_load_managed_package', function(message) {
        // console.warn('failed_to_load_managed_package:', message);
    });

    const errorHandler = function(err) {
        console.log('Error encountered', err);
        return Promise.reject(err);
    };

    const gui = injector.get('gui');
    const window_manager = injector.get('window_manager');

    const rootPackages = [{
        'name': 'req',
        'loadMethod': 'set',
        'ref': require('ljswitchboard-require')
    }, {
        'name': 'ljm_driver_checker',
        'loadMethod': 'set',
        'ref': require('ljswitchboard-ljm_driver_checker')
// }, {
//     'name': 'win',
//     'loadMethod': 'set',
//     'ref': win
    }, {
        'name': 'gui',
        'loadMethod': 'set',
        'ref': gui
    }, {
        'name': 'window_manager',
        'loadMethod': 'set',
        'ref': window_manager
    }, {
        'name': 'splash_screen',
        'loadMethod': 'set',
        'ref': splashScreenUpdater
    }, {
        'name': 'info',
        'loadMethod': 'set',
        'ref': "require('./get_cwd')"
    }
    ];

    const startDir = injector.get('startDir');

    const secondaryPackages = [
        {
            // 'name': 'ljswitchboard-static_files',
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
                path.join(startDir, 'ljswitchboard-static_files.zip')
            ]
        },
        {
            // 'name': 'ljswitchboard-core',
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
                path.join(startDir, 'ljswitchboard-core.zip')
            ]
        }
    ];

    const initializeProgram = function() {
        return new Promise((resolve, reject) => {
            // Show the window's dev tools
            // win.showDevTools();

            // Perform synchronous loading of modules:
            rootPackages.forEach(function(packageInfo) {
                package_loader.loadPackage(packageInfo);
            });

            // Perform async operations
            // const ljm_driver_checker = global.ljswitchboard.ljm_driver_checker;

            const ljm_driver_checker = package_loader.getPackage('ljm_driver_checker');

            ljm_driver_checker.verifyCoreInstall()
                .then(function(res) {
                    console.log('Core Req Check', res);
                    // Make sure that the LabJack directory has been created
                    if (res.overallResult) {
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
                        injector.bindSingleton('appDataPath', appDataPath);

                        const forceRefresh = gui.App.manifest.forceRefreshOfPersistentData;
                        persistentDataManager.init(forceRefresh)
                            .then(function(res) {
                                console.log('Re-Initialized Data:', res);
                                resolve();
                            }, function(err) {
                                appExtractionFailed = true;
                                console.log('Failed to initialize data', err);
                                console.log('Write-access required for:', appDataPath.toString());
                                splashScreenUpdater.update('App Failed: write-access required for: ' + appDataPath.toString());
                                reject({'code': 'persistentData', 'data': err});
                            });
                    } else {
                        reject({'code': 'core', 'data': res});
                        console.log('Failed core-check');
                        splashScreenUpdater.update('Failed installation verification');
                    }
                }, function(err) {
                    console.log('Failed while executing verifyCoreInstall', err);
                    splashScreenUpdater.update('Failed to verify installation');
                });
        });
    };

    let appExtractionFailed = false;

    function loadSecondaryPackages() {
        return new Promise((resolve, reject) => {
            if(appExtractionFailed) {
                reject();
            } else {
                console.log('Loading Secondary Packages');

                // Get the appDataPath
                const appDataPath = injector.get('appDataPath');

                // Configure the package_loader with this path
                package_loader.setExtractionPath(appDataPath);

                secondaryPackages.forEach(function(packageInfo) {
                    package_loader.loadPackage(packageInfo);
                });

                package_loader.runPackageManager()
                    .then(function(packages) {
                        const managedPackageKeys = Object.keys(packages);
                        console.log('Managed Packages', managedPackageKeys);
                        managedPackageKeys.forEach((managedPackageKey) => {
                            // Add the managed packages root locations to the req library.
                            const baseDir = packages[managedPackageKey].packageInfo.location;
                            const extraPaths = [
                                '',
                                'node_modules',
                                'lib',
                                path.join('lib', 'node_modules')
                            ];
                            extraPaths.forEach(function(extraPath) {
                                const modulesDirToAdd = path.normalize(path.join(baseDir, extraPath));
                                const req = package_loader.getPackage('req');
                                req.addDirectory(modulesDirToAdd);
                            });
                        });

                        console.log('Opening managed apps', Object.keys(packages));
                        try {
                            // Instruct the window_manager to open any managed nwApps
                            window_manager.linkOutput(console);
                            window_manager.openManagedApps(packages, console).then(resolve, reject);
                        } catch(err) {
                            console.error('Error opening', err);
                            console.log('Failed to open managed apps (sp)', err);
                            splashScreenUpdater.update('Failed to open managed apps (sp)');
                            reject(err);
                        }
                    }, function(err) {
                        console.log('Failed to run package manager (sp)', err);
                        splashScreenUpdater.update('Failed to run package manager (sp)');

                        reject();
                    });
            }
        });
    }


    initializeProgram()
        .then(loadSecondaryPackages, errorHandler)
        .then(() => {
            console.log('Program initialized');
        });
}

exports.loadProgramPackages = loadProgramPackages;
