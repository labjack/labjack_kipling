 --This is an example that uses the SX1509 I/O Expander on the I2C Bus on EIO4(SCL) and EIO5(SDA)
--[[
User RAM registers- change these in another program (LabVIEW, Python, C++ and more) to change the state of pins
To understand this script, it is very important to be familiar with the datasheet
This script uses only a small amount of features available on the slave devices. 
Modification of the script is needed to utilize the keypad engine and PWM functionalities of the slave device.

chanAdata  = 46080 (USER_RAM0_I32)
chanBdata  = 46082 (USER_RAM1_I32)
chanAdir   = 46084 (USER_RAM2_I32)
chanBdir   = 46086 (USER_RAM3_I32)
chanAinput = 46088 (USER_RAM4_I32)
chanBinput = 46090 (USER_RAM5_I32)
chanApup   = 46092 (USER_RAM6_I32)
chanBpup   = 46094 (USER_RAM7_I32)
]]--

fwver = MB.R(60004, 3)
devType = MB.R(60000, 3)
if (fwver < 1.0224 and devType == 7) or (fwver < 0.2037 and devType == 4) then
  print("This lua script requires a higher firmware version (T7 Requires 1.0224 or higher, T4 requires 0.2037 or higher). Program Stopping")
  MB.W(6000, 1, 0)
end

SLAVE_ADDRESS = 0x3E
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

--Channel A is 0-7, Channel B is 8-15
chanAdir = MB.R(46084, 2)--1 = output, 0 = input
chanBdir = MB.R(46086, 2)

chanApup = MB.R(46092, 2)--0 = pullup enabled, 1 = disabled
chanBpup = MB.R(46094, 2)

--config clock and debounce
I2C.write({0x1E, 0x4F})--config clock
I2C.write({0x1F, 0x70})--RegMisc

--config channel A inputs/outputs
I2C.write({0x01, chanAdir})--input buffer disable
I2C.write({0x07, chanApup})--pull up disable
I2C.write({0x0B, chanAdir})--open drain
I2C.write({0x0F, 0xFF-chanAdir})--output
I2C.write({0x11, 0xFF})--all LED off (initially)
I2C.write({0x21, 0x00})--disable LED Driver for ALL(which diables PWM and fade)
--config channel B inputs/outputs
I2C.write({0x01-1, chanBdir})
I2C.write({0x07-1, chanBpup})
I2C.write({0x0B-1, chanBdir})
I2C.write({0x0F-1, 0xFF-chanBdir})
I2C.write({0x11-1, 0xFF})
I2C.write({0x21-1, 0x00})

LJ.IntervalConfig(0, 10)--check every 10ms
while true do
  if LJ.CheckInterval(0) then
    if MB.R(46080, 2) ~= data then
      --Read Inputs
      I2C.write({0x11})
      chanAinput = I2C.read(2)
      I2C.write({0x11-1})
      chanBinput = I2C.read(2)
      print(chanBinput[1])
      MB.W(46088, 2, chanAinput)
      MB.W(46090, 2, chanBinput)
      --Write Outputs
      chanAdata = MB.R(46080, 2)
      I2C.write({0x11, chanAdata})--all LEDs written depending on User RAM Register
      chanBdata = MB.R(46082, 2)
      I2C.write({0x11-1, chanBdata})--all LEDs written depending on User RAM Register
    end
  end
end