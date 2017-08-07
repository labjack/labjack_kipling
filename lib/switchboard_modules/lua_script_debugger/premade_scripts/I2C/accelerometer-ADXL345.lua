--This is an example that uses the ADXL345 Accelerometer on the I2C Bus on EIO4(SCL) and EIO5(SDA)
--Outputs data to Registers:
--X accel = 46000
--Y accel = 46002
--Z accel = 46004

fwver = MB.R(60004, 3)
devType = MB.R(60000, 3)
if (fwver < 1.0224 and devType == 7) or (fwver < 0.2037 and devType == 4) then
  print("This lua script requires a higher firmware version (T7 Requires 1.0224 or higher, T4 requires 0.2037 or higher). Program Stopping")
  MB.W(6000, 1, 0)
end

function convert_16_bit(msb, lsb, conv)--Returns a number, adjusted using the conversion factor. Use 1 if not desired  
  res = 0
  if msb >= 128 then
    res = (-0x7FFF+((msb-128)*256+lsb))/conv
  else
    res = (msb*256+lsb)/conv
  end
  return -1*res
end

SLAVE_ADDRESS = 0x53
I2C.config(13, 12, 65516, 0, SLAVE_ADDRESS, 0)--configure the I2C Bus

addrs = I2C.search(0, 127)
addrsLen = table.getn(addrs)
found = 0
for i=1, addrsLen do--verify that the target device was found     
  if addrs[i] == SLAVE_ADDRESS then
    print("I2C Slave Detected")
    found = 1
    break
  end
end
if found == 0 then
  print("No I2C Slave detected, program stopping")
  MB.W(6000, 1, 0)
end

--init accelerometer
I2C.write({0x31, 0x09})--set for +/-4g (use 0x08 for 2g) in full resolution mode
I2C.write({0x2D, 0x08})--Disable power saving

LJ.IntervalConfig(0, 500)
stage = 0 --used to control program progress
while true do
  if LJ.CheckInterval(0) then
    if stage == 0 then
      I2C.write({0x32}) --begin the stream of 6 bytes
      LJ.IntervalConfig(0, 100)       --set interval to 100 for 100ms to give the range finder some processing time
      stage = 1
    elseif stage == 1 then
      raw = I2C.read(6)
      data = {}
      for i=0, 2 do
        table.insert(data, convert_16_bit(raw[(2*i)+2], raw[(2*i)+1], 233))
      end
      MB.W(46000, 3, data[1])--add X value, in G's, to the user_ram register
      MB.W(46002, 3, data[2])--add Y
      MB.W(46004, 3, data[3])--add Z
      print("X", data[1])
      print("Y", data[2])
      print("Z", data[3])
      print("-----------")
      LJ.IntervalConfig(0, 400)
      stage = 0
    end
  end
end
