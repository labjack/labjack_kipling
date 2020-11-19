'use strict';

async function checkRequirements(package_loader) {
    const splashScreenUpdater = package_loader.getPackage('splashScreenUpdater');

    splashScreenUpdater.update('Verifying LJM Installation', 'info');

    try {
        const ljm_driver_checker = package_loader.getPackage('ljm_driver_checker');
        const res = await ljm_driver_checker.verifyLJMInstallation();
        splashScreenUpdater.update('Finished Verifying LJM Installation: ' + res.ljmVersion, 'pass');
        return res;
    } catch (err) {
        console.error('Failed Verifying LJM Installation', err);
        splashScreenUpdater.update('Failed Verifying LJM Installation', 'fail');
        throw err;
    }
}

exports.checkRequirements = checkRequirements;
