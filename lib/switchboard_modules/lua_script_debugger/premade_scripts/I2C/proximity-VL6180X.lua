--This is an example that uses the VL6180X TOF Ranging sensor on the I2C Bus on EIO4(SCL) and EIO5(SDA), following the AN4545 Application note.
--Outputs data to Registers:
-- Value in mm: 46080
-- Value in in: 46000

fwver = MB.R(60004, 3)
if fwver < 1.0224 then
  print("This lua script requires a firmware version of 1.0224 or higher. Program Stopping")
  MB.W(6000, 1, 0)
end

sI = {}
sI[1] =  {0x02, 0x07, 0x01}
sI[2] =  {0x02, 0x08, 0x01}
sI[3] =  {0x00, 0x96, 0x00}
sI[4] =  {0x00, 0x97, 0xfd}
sI[5] =  {0x00, 0xe3, 0x00}
sI[6] =  {0x00, 0xe4, 0x04}
sI[7] =  {0x00, 0xe5, 0x02}
sI[8] =  {0x00, 0xe6, 0x01}
sI[9] =  {0x00, 0xe7, 0x03}
sI[9] =  {0x00, 0xf5, 0x02}
sI[10] = {0x00, 0xd9, 0x05}
sI[11] = {0x00, 0xdb, 0xce}
sI[12] = {0x00, 0xdc, 0x03}
sI[13] = {0x00, 0xdd, 0xf8}
sI[14] = {0x00, 0x9f, 0x00}
sI[15] = {0x00, 0xa3, 0x3c}
sI[16] = {0x00, 0xb7, 0x00}
sI[17] = {0x00, 0xbb, 0x3c}
sI[18] = {0x00, 0xb2, 0x09}
sI[19] = {0x00, 0xca, 0x09}
sI[20] = {0x01, 0x98, 0x01}
sI[21] = {0x01, 0xb0, 0x17}
sI[22] = {0x01, 0xad, 0x00}
sI[23] = {0x00, 0xff, 0x05}
sI[24] = {0x01, 0x00, 0x05}
sI[25] = {0x01, 0x99, 0x05}
sI[26] = {0x01, 0xa6, 0x1b}
sI[27] = {0x01, 0xac, 0x3e}
sI[28] = {0x01, 0xa7, 0x1f}
sI[29] = {0x00, 0x30, 0x00}

SLAVE_ADDRESS = 0x29
I2C.config(13, 12, 65516, tempOptions, SLAVE_ADDRESS, 0)--configure the I2C Bus

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

errorOut = 0
for i = 1, 29 do--send the neccissarry intialization bytes to the slave    
  errorOut = I2C.write(I2C, sI[i])
end
if errorOut == 0 then
  print("Sensor Initialized")
else
  print("Writing sint["..i.."] failed")
end

LJ.IntervalConfig(0, 500)             --set interval
stage = 0 --used to monitor program progress
while true do
  if LJ.CheckInterval(0) then
    if stage == 0 then
      I2C.write({0x00, 0x18, 0x03})
      LJ.IntervalConfig(0, 40)       --set interval to give the range finder some processing time
      stage = 1
    elseif stage == 1 then
      I2C.write({0x00, 0x62})
      LJ.IntervalConfig(0, 40)       --set interval to give the range finder some processing time
      stage = 2
    elseif stage == 2 then
      distRaw = I2C.read(2)
      MB.W(46080, 2, distRaw[2])--Store value, in mm, for user to access with another program, such as LabVIEW or Python
      MB.W(46000, 3,  distRaw[2]/25.4)--Store value in inches
      print("Distance: "..string.format("%.2f", distRaw[2]).."mm "..string.format("%.2f", distRaw[2]/25.4).."in")
      LJ.IntervalConfig(0, 420)       --reset interval
      stage = 0
    end
  end
end


