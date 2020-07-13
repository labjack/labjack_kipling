module.exports = function(grunt) {

  // TODO: If we ever lint everything, we can lint **/*.js or something
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'scripts/**/*.js',
        '@labjack/ljm-ffi/**/*.js',
        '@labjack/ljswitchboard-builder/**/*.js',
        '@labjack/ljswitchboard-core/**/*.js',
        '@labjack/ljswitchboard-io_manager/**/*.js',
        '@labjack/ljswitchboard-kipling_tester/**/*.js',
        '@labjack/ljswitchboard-kipling/**/*.js',
        '@labjack/ljswitchboard-ljm_driver_checker/**/*.js',
        // '@labjack/ljswitchboard-module_manager/**/*.js',
        // '@labjack/ljswitchboard-static_files/**/*.js',
        // '@labjack/LabJack-nodejs/**/*.js',
        // '@labjack/ljswitchboard-data_parser/**/*.js',
        // '@labjack/ljswitchboard-device_scanner/**/*.js',
        // '@labjack/ljswitchboard-ljm_device_curator/**/*.js',
        // '@labjack/ljswitchboard-ljm_driver_constants/**/*.js',
        // '@labjack/process_manager/**/*.js',
        // '@labjack/ljswitchboard-modbus_map/**/*.js',
        // '@labjack/ljswitchboard-package_loader/**/*.js',
        // '@labjack/ljswitchboard-require/**/*.js',
        // '@labjack/ljswitchboard-window_manager/**/*.js',
        // '@labjack/ljswitchboard-splash_screen/**/*.js',
        // '@labjack/ljmmm-parse/**/*.js',
        // '@labjack/ljswitchboard-version_manager/**/*.js',
        // '@labjack/ljswitchboard-firmware_verifier/**/*.js',
        // '@labjack/ljswitchboard-simple_logger/**/*.js',
        // '@labjack/ljm-shell_logger/**/*.js',
        // '@labjack/kipling-cli/**/*.js',
        // '@labjack/ljswitchboard-server/**/*.js',
        // '@labjack/ljswitchboard-electron_splash_screen/**/*.js',
        // '@labjack/ljswitchboard-ljm_special_addresses/**/*.js',
        // '@labjack/ljswitchboard-device_manager/**/*.js',
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', ['jshint']);

};
