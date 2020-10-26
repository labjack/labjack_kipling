# ljswitchboard-static_files
A repository for all of ljswitchboard's static files that should be extracted very rarely and slow down the startup time a LOT.

Some LabJack code in this module:

```
lib/ljswitchboard-static_files.js
static/css/device_selector.css
static/css/kipling_tester.css
static/css/module_chrome.css
static/css/switchboard_base.css
static/js/device_selector.js
static/js/module_chrome.js
```

Rebuild d3, kinetic, epoch and typeahead with:

```
npm run build
```
