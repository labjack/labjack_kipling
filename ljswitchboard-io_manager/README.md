ljswitchboard-io_manager
==========

A promise based &amp; multi-process based wrapper for the labjack-nodejs library that also includes logging and other features.  Primarily to be used in the ljswitchboard project.


## Master process Node version

From the master process, to get the current version of Node that the subprocess is using, enter the following into the Kipling console:

```
io_manager.io_interface().mp.getProcessInfo().then(pr,pe);
```

`pr` is a globally defined promise result printer. `pe` prints an error. `version` contains the subprocess Node version.
