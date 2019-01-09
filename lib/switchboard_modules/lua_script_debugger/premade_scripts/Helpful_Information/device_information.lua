print('')
print('Device Information:');

sn = MB.R(60028,1) -- Read the SERIAL_NUMBER register
print('- Serial Number:',string.format("%d",sn))

model = ''
isPro = 0
pid = MB.R(60000, 3) -- Read the PRODUCT_ID register
hwInstalled = MB.R(60010, 1) -- Read the HARDWARE_INSTALLED register
if (pid == 4) then
	model = 'T4'
elseif (pid == 7) then
	model = 'T7'
	isPro = bit.band(hwInstalled,1)
	if(isPro == 1) then
		model = model..'-Pro'
	end
end
print('- Model', model)


function parseStringFromTable(t)
  local s = ''
  for i=1, table.getn(t) do
    if(t[i] == 0) then
      break
    else
      s = s..string.char(t[i])
    end
  end
  return s
end
devNameTable = MB.RA(60500, 99, 50) -- Read the DEVICE_NAME_DEFAULT register
devNameStr = parseStringFromTable(devNameTable) -- Parse the device name into a str.
print('- Device Name',devNameStr)

function getIPFromArray(t)
  local s = ''
	s = string.format("%d",t[1])
	s = s..'.'
	s = s..string.format("%d",t[2])
	s = s..'.'
	s = s..string.format("%d",t[3])
	s = s..'.'
	s = s..string.format("%d",t[4])
	return s
end
ethIPBytes = MB.RA(49100,99,4) -- Read the ETHERNET_IP register
ethIP = getIPFromArray(ethIPBytes) -- Parse the IP address into a string
print('- Ethernet IP', ethIP)

function getMacFromArray(t)
  local s = ''
  local tLen = table.getn(t)
  for i=3, tLen do
    s = s..string.format("%02x",t[i])
    if (i<tLen) then
      s = s..':'
    end
  end
  return s
end
ethMACBytes = MB.RA(60020,99,8) -- Read the ETHERNET_MAC register
ethMAC = getMacFromArray(ethMACBytes) -- Parse the MAC address into a string
print('- Ethernet MAC', ethMAC)

hwVersion = MB.R(60002,3) -- Read the HARDWARE_VERSION register
print('- Hardware Version', string.format("%.2f",hwVersion))

fwVersion = MB.R(60004,3) -- Read the FIRMWARE_VERSION register
print('- Firmware Version', string.format("%.4f",fwVersion))

devTemp = MB.R(60052,3) -- Read the TEMPERATURE_DEVICE_K register
print('- Device Temperature', string.format("%.2f",devTemp),'(K)')


print('')
print("Exiting Lua Script")
MB.W(6000, 1, 0)
