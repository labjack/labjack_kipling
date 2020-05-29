--[[
    Name: device_information.lua
    Desc: Reads device information from the LabJack device and prints it out
    Note: This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

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

-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
print('')
print('Device Information:');
-- Read the SERIAL_NUMBER register
local serialnum = MB.readName("SERIAL_NUMBER")
print('- Serial Number:',string.format("%d",serialnum))
local model = ''
-- Read the PRODUCT_ID register
local pid = MB.readName("PRODUCT_ID")
-- Read the HARDWARE_INSTALLED register
local hwinstalled = MB.readName("HARDWARE_INSTALLED")

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
namearr = MB.readNameArray("DEVICE_NAME_DEFAULT", 50, 99)
devname = parse_string_from_array(namearr)
print('- Device Name',devname)

iparr = MB.readNameArray("ETHERNET_IP", 4, 99)
ethernetip = get_ip_from_array(iparr)
print('- Ethernet IP', ethernetip)

macarr = MB.readNameArray("ETHERNET_MAC", 8, 99)
ethernetmac = get_mac_from_array(macarr)
print('- Ethernet MAC', ethernetmac)

hwversion = MB.readName("HARDWARE_VERSION")
print('- Hardware Version', string.format("%.2f",hwversion))

fwversion = MB.readName("FIRMWARE_VERSION")
print('- Firmware Version', string.format("%.4f",fwversion))

devtemp = MB.readName("TEMPERATURE_DEVICE_K")
print('- Device Temperature', string.format("%.2f",devtemp),'(K)')

print('')
print("Exiting Lua Script")
-- Writing 0 to LUA_RUN stops the script
MB.writeName("LUA_RUN", 0)
