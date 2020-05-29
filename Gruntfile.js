module.exports = function(grunt) {

  // TODO: If we ever lint everything, we can lint **/*.js or something
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'scripts/**/*.js',
        'ljm-ffi/**/*.js',
        'ljswitchboard-builder/**/*.js',
        'ljswitchboard-core/**/*.js',
        'ljswitchboard-io_manager/**/*.js',
        'ljswitchboard-kipling_tester/**/*.js',
        'ljswitchboard-kipling/**/*.js',
        'ljswitchboard-ljm_driver_checker/**/*.js',
        // 'ljswitchboard-module_manager/**/*.js',
        // 'ljswitchboard-static_files/**/*.js',
        // 'LabJack-nodejs/**/*.js',
        // 'ljswitchboard-data_parser/**/*.js',
        // 'ljswitchboard-device_scanner/**/*.js',
        // 'ljswitchboard-ljm_device_curator/**/*.js',
        // 'ljswitchboard-ljm_driver_constants/**/*.js',
        // 'LabJack-process_manager/**/*.js',
        // 'ljswitchboard-modbus_map/**/*.js',
        // 'ljswitchboard-package_loader/**/*.js',
        // 'ljswitchboard-require/**/*.js',
        // 'ljswitchboard-window_manager/**/*.js',
        // 'ljswitchboard-splash_screen/**/*.js',
        // 'ljmmm-parse/**/*.js',
        // 'ljswitchboard-version_manager/**/*.js',
        // 'ljswitchboard-firmware_verifier/**/*.js',
        // 'ljswitchboard-simple_logger/**/*.js',
        // 'ljm-shell_logger/**/*.js',
        // 'kipling-cli/**/*.js',
        // 'ljswitchboard-server/**/*.js',
        // 'ljswitchboard-electron_splash_screen/**/*.js',
        // 'ljswitchboard-ljm_special_addresses/**/*.js',
        // 'ljswitchboard-device_manager/**/*.js',
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', ['jshint']);

};
