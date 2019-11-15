--This is an example that uses the SRF02 sensor, following the datasheet
--Outputs data to Registers:
-- Value in cm: 46000
-- Value in inches: 46002

fwver = MB.R(60004, 3)
devType = MB.R(60000, 3)
if (fwver < 1.0224 and devType == 7) or (fwver < 0.2037 and devType == 4) then
  print("This lua script requires a higher firmware version (T7 Requires 1.0224 or higher, T4 requires 0.2037 or higher). Program Stopping")
  MB.W(6000, 1, 0)
end

I2C.config(13, 12, 0, 0, 0x70, 0)--configure the I2C Bus

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

LJ.IntervalConfig(0, 900)             --set interval to 900 for 900ms
stage = 0 --used to control program progress
while true do
  if LJ.CheckInterval(0) then
    if stage == 0 then
      I2C.write({0x00, 0x50})--command for range in inches(0x50)
      LJ.IntervalConfig(0, 100)       --set interval to 100 for 100ms to give the range finder some processing time
      stage = 1
    elseif stage == 1 then
      distRaw = I2C.read(4)
      distin = distRaw[3]
      distcm = distin*2.54
      MB.W(46000, 3, distcm)--Store value, in cm, for user to access with another program, such as LabVIEW or Python
      MB.W(46002, 3, distin)--Store value, in inches
      print("Measured Distance: "..string.format("%d", distcm).."cm".."  ("..string.format("%.1f", distin).."in)")
      print("-----------")
      LJ.IntervalConfig(0, 1000)       --reset interval
      stage = 0
    end
  end
end