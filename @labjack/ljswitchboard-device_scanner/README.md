# ljswitchboard-device_scanner
A node project dedicated to finding ALL LabJack devices that are able to be connected to.  Uses LabJack-nodejs for LJM's scanning functionality as well as some special node additions.



## findAllDevices
Takes an optional parameter of a list of connected device objects.

Returns an array,
- containing device types (T7/Digit/etc.) as objects, which includes an array `"devices"`,
  - which contain discovered devices as objects grouped by device serial number, which contains an array of `"connectionTypes"`,
    - which are objects describing how each discovered device is available

### findAllDevices return example and format:
```json5
[
  {
    "deviceType": 7,
    // Integer device type

    "deviceTypeString": "LJM_dtT7",
    // The LJM device type

    "deviceTypeName": "T7",
    // A human-readable device type - never indicates device subclass

    "devices":
    // A list of devices, grouped by serial number
    [
      {
        "deviceType": 7,
        // Integer device type

        "deviceTypeString": "LJM_dtT7",
        // The LJM device type

        "deviceTypeName": "T7",
        // A human-readable device type - never indicates device subclass

        "serialNumber": 470010103,
        // Integer serial number

        "acquiredRequiredData": true,
        // true if data was collected successfully, false if not

        "isMockDevice": true,
        // True if mock device, false if real device

        "productType": "T7-Pro",
        // Human-readable device class / subclass name, e.g. "T7" or "T7-Pro"
n
        "modelType": "T7-Pro",
        // Same as productType

        "isActive": false,
        // true if user has connected to this device, false if not

        "connectionTypes":
        // Array of objects for each connection this device has
        [
          {
            "dt": 7,
            // Legacy, (non-canonical) integer LJM device type

            "ct": 3,
            // Legacy, (non-canonical) integer LJM connection type

            "connectionType": 3,
            // Integer LJM connection type

            "str": "LJM_ctETHERNET",
            // String LJM connection type

            "name": "Ethernet",
            // Human-readable connection type name

            "ipAddress": "192.168.1.207",
            // Human-readable IP address string. Meaningless if USB.

            "safeIP": "192_168_1_207",
            // ipAddress with underscores (_) instead of periods (.)

            "verified": true,
            // true if the device could be opened directly, false if not

            "isActive": false,
            // true if connection was previously opened by the user before scan, false if not

            "foundByAttribute": false,
            // true if found through checking device attributes, false if found in by scan

            "insertionMethod": "scan",
            // "attribute" foundByAttribute is true, "scan" if foundByAttribute is false
          },
          {
            // Another connection, e.g. for USB, WiFi, etc.
          }
        ]

        // The following attributes are controlled by ljswitchboard-ljm_device_curator
        "DEVICE_NAME_DEFAULT",
        "HARDWARE_INSTALLED",
        "ETHERNET_IP",
        "WIFI_STATUS",
        "WIFI_IP",
        "WIFI_RSSI",
        "FIRMWARE_VERSION",
        "DGT_INSTALLED_OPTIONS",
        // etc.
      },
      {
        // Another device of the same class with a different serial number
      }
    ]
  },
  {
    // Another device class, e.g. Digits
  }
]
```