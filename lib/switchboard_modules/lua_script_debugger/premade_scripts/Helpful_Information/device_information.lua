print('')
print('Device Information:');


print('- Serial Number:', MB.R(60028,1))
model = ''
pid = MB.R(60000, 3)
hwInstalled = MB.R(60010, 1)
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

devNameTable = MB.RA(60500, 99, 50)
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
print('- Device Name',parseStringFromTable(devNameTable))

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
ethIPBytes = MB.RA(49100,99,4)
ethIP = getIPFromArray(ethIPBytes)
print('- Ethernet IP', ethIP)

hwVersion = MB.R(60002,3) 
print('- Hardware Version', hwVersion)
fwVersion = MB.R(60004,3)
print('- Firmware Version', fwVersion)
devTemp = MB.R(60052,3)
print('- Device Temperature', devTemp,'(K)')

print('')
print("Exiting Lua Script")
MB.W(6000, 1, 0)
