# Getting set up

## Prerequisites

 - Install the [LJM library](https://labjack.com/support/software/installers/ljm).
 - Install Node 12.16.3.
     - This version is likely to change. Use `nave` or `nvm` to manage node versions.
 - Install git


## Instructions

Setup on Windows:

1. **(Windows)** Install windows-build-tools using npm.  In a new Powershell window in admin (Run As Administrator) mode, run the following command:

```
> npm install --vs2015 -g windows-build-tools
```

2. **(Windows)** Install node-gyp.  Do this in a command prompt window (Windows key, type cmd) with standard user permissions, not admin.

```
> npm install -g node-gyp@v3.2.1
```

3. **(Windows)** Configure msvs version

```
> npm config set msvs_version 2015
```

4. **(Windows)** Configure it globally

```
> npm config set msvs_version 2015 --global
```

Clone:

```
git clone https://github.com/labjack/labjack_kipling
cd labjack_kipling
```

Install local project-wide dependencies:

```
npm install
```

Install per-package dependencies:

```
npm run setup
```

Optionally: Enable [testing mode](https://github.com/labjack/labjack_kipling/blob/master/README.md#test-mode).

Start the development version of Kipling:

```
npm start
```

See [distribution.md](distribution.md) to build a Kipling executable.



## macOS Notes:

Setup:

Install xcode 5.1.1:
https://teamtreehouse.com/community/installing-xcode-on-1085-mac

Depending on your setup, you may want to manually remove npm from the path by e.g. editing your .bash_profile file:

```
# The new path for npm and node:
export PATH="/usr/local/bin/node":$PATH
export PATH="/usr/local/bin/npm":$PATH
# the old path for npm:
# export PATH="/usr/local/share/npm/bin":$PATH
```

You may also need to uninstall the global node-gyp:

```
npm uninstall -g node-gyp
```

