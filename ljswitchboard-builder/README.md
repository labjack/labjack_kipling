# ljswitchboard-builder
A repository dedicated to building and packing the ljswitchboard program.

The list of possible commands (As per the package.json file):
"test": "node ./node_modules/nodeunit/bin/nodeunit ./test/test.js",
"prepare_build": "node build_scripts/prepare_build.js",
"gather_project_files": "node build_scripts/gather_project_files.js",
"gather_test_project_files": "node build_scripts/gather_project_files.js test",
"rebuild_native_modules": "node build_scripts/rebuild_native_modules",
"clean_project": "node build_scripts/clean_project.js",
"organize_project_files": "node build_scripts/organize_project_files.js",
"brand_project": "node build_scripts/brand_project.js",
"build_project": "node build_scripts/build_project.js",
"quick_build_project": "node build_scripts/quick_build_project.js"

To build the project:
"npm run build_project"
