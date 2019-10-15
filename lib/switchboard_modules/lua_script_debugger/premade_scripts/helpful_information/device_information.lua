--[[
    Name: device_information.lua
    Desc: Reads device information from the LabJack device and prints it out
--]]

-- Assign functions locally for faster processing
local modbus_read_name = MB.readName
local modbus_read_array = MB.RA
local modbus_write_name = MB.writeName

-------------------------------------------------
--  Desc: Takes an array of characters and parses
--        it into a string
-------------------------------------------------
local function parse_string_from_array(arr)
  local s = ''
  for i=1, table.getn(arr) do
    if(arr[i] == 0) then
      break
    else
      s = s..string.char(arr[i])
    end
  end
  return s
end

-------------------------------------------------
--  Desc: Turns an array of numbers into a string
--        with the formating of an IP address
-------------------------------------------------
local function get_ip_from_array(arr)
  local s = ''
  s = string.format("%d",arr[1])
  s = s..'.'
  s = s..string.format("%d",arr[2])
  s = s..'.'
  s = s..string.format("%d",arr[3])
  s = s..'.'
  s = s..string.format("%d",arr[4])
  return s
end

-------------------------------------------------
--  Desc: Turns an array of numbers into a string
--        with the formating of a MAC address
-------------------------------------------------
local function get_mac_from_array(arr)
  local s = ''
  local arrlength = table.getn(arr)
  for i=3, arrlength do
    s = s..string.format("%02x",arr[i])
    if (i<arrlength) then
      s = s..':'
    end
  end
  return s
end

print('')
print('Device Information:');

-- Read the SERIAL_NUMBER register
local serialnum = modbus_read_name("SERIAL_NUMBER")
print('- Serial Number:',string.format("%d",serialnum))

local model = ''
-- Read the PRODUCT_ID register
local pid = modbus_read_name("PRODUCT_ID")
-- Read the HARDWARE_INSTALLED register
local hwinstalled = modbus_read_name("HARDWARE_INSTALLED")

if (pid == 4) then
  model = 'T4'
elseif (pid == 7) then
  model = 'T7'
  local ispro = 0
  -- Check to see if the high res ADC is installed.
  ispro = bit.band(hwinstalled,1)
  if(ispro == 1) then
    model = model..'-Pro'
  end
end
print('- Model', model)

-- Read the DEVICE_NAME_DEFAULT register
namearr = modbus_read_array(60500, 99, 50)
devname = parse_string_from_array(namearr)
print('- Device Name',devname)

-- Read the ETHERNET_IP register
iparr = modbus_read_array(49100,99,4)
ethernetip = get_ip_from_array(iparr)
print('- Ethernet IP', ethernetip)

-- Read the ETHERNET_MAC register
macarr = modbus_read_array(60020,99,8)
ethernetmac = get_mac_from_array(macarr)
print('- Ethernet MAC', ethernetmac)

-- Read the HARDWARE_VERSION register
hwversion = modbus_read_name("HARDWARE_VERSION")
print('- Hardware Version', string.format("%.2f",hwversion))

-- Read the FIRMWARE_VERSION register
fwversion = modbus_read_name("FIRMWARE_VERSION")
print('- Firmware Version', string.format("%.4f",fwversion))

-- Read the TEMPERATURE_DEVICE_K register
devtemp = modbus_read_name("TEMPERATURE_DEVICE_K")
print('- Device Temperature', string.format("%.2f",devtemp),'(K)')


print('')
print("Exiting Lua Script")
-- Writing 0 to LUA_RUN stops the script
modbus_write_name("LUA_RUN", 0)
