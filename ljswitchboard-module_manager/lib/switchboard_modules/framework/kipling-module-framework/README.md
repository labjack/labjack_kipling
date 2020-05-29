kipling-module-framework
========================

Framework making Kipling modules easier to developer.
##Creating Custom Module's:
##### List of Tutorials:
[Tutorial #1](#tutorial-1): Generic Module

### Tutorial #1 
This tutorial outlines the generic process for creating a generic, no-frills, module.  Any new module should follow these basic steps to create a new module. 

#### 1. Edit Module Manager's "modules.json" file

 Inform Kipling to try and add your module to its listing by appending your module's computer-readable name (computer_readable_module_name) & setting its activity status in the <adjective describing this modules.json file> modules.json file. "switchboard_modules/modules.json"

 ```javascript
 {
   "name":"[computer_readable_module_name]",
   "active": true
 }
 ```

#### 2. Create New Module Directory

 Create a new folder in the "switchboard_modules" directory with the same name as the computer_readable_module_name & navigate to it:

 **switchboard_modules/[computer_readable_module_name]**

#### 3. Create four mandatory sub-files with the corresponding contents:

 1. controller.js<br>
 Location: switchboard_modules/[computer_readable_module_name]/controller.js<br>
 Contents:
 ```javascript
 /**
 * Initialization logic for the module, runs once when the page loads.  Works much like any web-page.
 **/
 $('#[computer_readable_module_name]').ready(function(){
     //Get a handle of the deviceKeeper, where you can gain control to a device
     var keeper = device_controller.getDeviceKeeper();

     //Get all of the open devices
     devices = keeper.getDevices(); 
 });
 ```
 
 2. module.json<br>
 Location: switchboard_modules/[computer_readable_module_name]/module.json<br>
 Contents:
 ```javascript
 {
     "name": "[computer_readable_module_name]",
     "humanName": "[human_readable_module_name]",
     "version": "[module_version_number]",
     "framework": "[module_framework_type]"
 }
 ```
(for a bare-bones module replace [module_framework_type] with 'none', types are described in detail later.)

 3. style.css<br>
 Location: switchboard_modules/[computer_readable_module_name]/style.css<br>
 Contents:
 ```css
 #[computer_readable_module_name] #myCoolStuff{
    /* Applicable CSS Style's */
 }
 ```

 4. view.html<br>
 Location: switchboard_modules/[computer_readable_module_name]/view.html<br>
 Contents:
 ```html
 <div id="[computer_readable_module_name]">
    <div id="myCoolStuff">
    </div>
 </div>
 ```

### Tutorial #2
This tutorial outlines the creation of a module that uses radio buttons to switch between currently open devices.
 



