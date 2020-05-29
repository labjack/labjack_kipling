# Getting set up


## Instructions

First, install the [LJM library](https://labjack.com/support/software/installers/ljm). Then:


1. Install Project Building Dependencies
 Setup Node, git, and some other things on your computer.  LJ-ers, check out the QMS-xxx~new computer for details.  Others, feel free to email us and we can make a public document.  The first few following steps are Windows only.
    1. **(Windows)** Install Windows-build-tools using npm.  After installing node.js open a new Powershell window as an admin user (Windows key, type powershell, right click, run as admin) and then run the following command:
    ```bash
    > npm install -g Windows-build-tools
    ```
    2. **(Windows)** Install node-gyp.  Do this in a command prompt window (Windows key, type cmd) with standard user permissions, not admin.
    ```bash
    > npm install -g node-gyp
    ```
    3. **(Windows)** Configure msvs version
    ```bash
    > npm config set msvs_version 2015
    ```
    4. **(Windows)** Configure it globally
    ```bash
    > npm config set msvs_version 2015 --global
    ```
2. Clone this repository:
```bash
git clone https://github.com/labjack/labjack_kipling
```
3. Navigate into the project
```bash
cd labjack_kipling
```
4. Install dependencies:
```bash
npm run setup
```
5. Optionally, enable [testing mode](https://github.com/labjack/labjack_kipling/blob/master/README.md#test-mode).
6. After the last step has finished (it takes quite a while) start Kipling by running the command "npm start".
```bash
npm start
```





## Required Node Versions
As of 2020-05-22, Windows/Mac/Linux users should be using node.js 8.9.4. This version is likely to change to newer versions over time. Use `nave` or `nvm` to manage node versions.

## Running "nave.sh"

"nave.sh" is a useful tool for installing node on Mac & Linux.
```bash
wget https://raw.github.com/isaacs/nave/master/nave.sh
sudo bash nave.sh usemain 0.10.22
```





## Common issues with node:

## Other documents
Some extra installation & setup instructions:
https://docs.google.com/document/d/1cv6Vt2i1TBBX3FfVmVyhCD3V0fwWm9nwvP3a_XmkBm0/edit?usp=sharing

A document with some of the priorities & todos:
https://docs.google.com/document/d/1l7COOy2fvlj_OOyijTg_mQJZJnLCLZDThMRwGygTTTQ/edit?usp=sharing


#### macOS:

Setup:

Install xcode 5.1.1:
https://teamtreehouse.com/community/installing-xcode-on-1085-mac

Depending on your setup, you may want to manually remove npm from my path by editing the .bash_profile file:
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

