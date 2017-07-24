--This is an example that uses the TCS34725 Color Sensor on the I2C Bus on EIO4(SCL) and EIO5(SDA), LED pin to FIO6
--See datasheet for TCS34725 for more information
--Outputs data to Registers:
--Raw:
--clear: 46100
--red: 46102
--green: 46104
--blue: 46106
--Intensity:
--red: 46000
--green: 46002
--blue: 46004
MB.W(2006, 0, 0)-- turn LED on, connected to FIO6

fwver = MB.R(60004, 3)
if fwver < 1.0224 then
  print("This lua script requires a firmware version of 1.0224 or higher. Program Stopping")
  MB.W(6000, 1, 0)
end

SLAVE_ADDRESS = 0x29
I2C.config(13, 12, 65516, 0, SLAVE_ADDRESS, 0)--configure the I2C Bus

addrs = I2C.search(0, 127)
addrsLen = table.getn(addrs)
for i=1, addrsLen do--verify that the target device was found     
  if addrs[i] == SLAVE_ADDRESS then
    print("I2C Slave Detected")
    break
  end
end
if addrsLen == 0 then
  print("No I2C Slave detected, program stopping")
  MB.W(6000, 1, 0)
end

--init slave
MB.W(2006, 0, 1)-- turn LED on, connected to FIO6

LJ.IntervalConfig(0, 1500)             
stage = 0 --used to control program progress
while true do
  if LJ.CheckInterval(0) then
    if stage == 0 then
      LJ.IntervalConfig(0, 100)
      stage = 1
    elseif stage == 1 then
      I2C.write({0x80+0x00, 0x03})
      LJ.IntervalConfig(0, 50)
      stage = 2
    elseif stage == 2 then
      dataIn = {}
      for i=0,3 do
        I2C.write({0x80+0x14+2*i, 0x80+0x15+2*i})
        raw = I2C.read(2)
        table.insert(dataIn, raw[2]*256+raw[1])
      end
      MB.W(46100, 1, dataIn[1])--write clear light value in raw form
      MB.W(46102, 1, dataIn[2])--write red
      MB.W(46104, 1, dataIn[3])--write green
      MB.W(46106, 1, dataIn[4])--write blue
      red =   ((dataIn[2])/dataIn[1])
      MB.W(46000, 3, red)
      green = ((dataIn[3])/dataIn[1])
      MB.W(46002, 3, green)
      blue =  ((dataIn[4])/dataIn[1])
      MB.W(46004, 3, blue)
      --print(red, green, blue)--print relative (to clear) intesity
      print("Clear:", dataIn[1], "Red:",  dataIn[2], "Green:",  dataIn[3], "Blue:", dataIn[4])--print absolute intesity
      if red > blue and red > green then
        print("Dominant: Red")
      elseif blue > green and blue > red then
        print("Dominant: Blue")
      else
        print("Dominant: Green")
      end
      print("-----------")
      LJ.IntervalConfig(0, 1000)
      stage = 0
    end
  end
end