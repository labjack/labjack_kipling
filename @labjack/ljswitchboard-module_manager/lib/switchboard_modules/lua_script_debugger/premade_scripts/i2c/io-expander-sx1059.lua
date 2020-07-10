--[[
    Name: io-expander-sx1059.lua
    Desc: This is an example that uses the SX1509 I/O Expander on the I2C Bus
          on EIO4(SCL) and EIO5(SDA)
    Note: User RAM registers- change these in another program (LabVIEW,
          Python, C++ and more) to change the state of pins. To understand this
          script, it is very important to be familiar with the datasheet. This
          script uses only a small amount of features available on the slave
          devices. Modification of the script is needed to utilize the keypad
          engine and PWM functionalities of the slave device.

          datachana  = 46080 (USER_RAM0_I32)
          datachanb  = 46082 (USER_RAM1_I32)
          dirchana   = 46084 (USER_RAM2_I32)
          dirchanb   = 46086 (USER_RAM3_I32)
          inchana = 46088 (USER_RAM4_I32)
          inchanb = 46090 (USER_RAM5_I32)
          pupchana   = 46092 (USER_RAM6_I32)
          pupchanb   = 46094 (USER_RAM7_I32)

          I2C examples assume power is provided by a LJTick-LVDigitalIO at 3.3V
          (a DAC set to 3.3V or a DIO line could also be used for power)
--]]

SLAVE_ADDRESS = 0x3E

-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
-- Configure the I2C Bus
I2C.config(13, 12, 65516, 0, SLAVE_ADDRESS, 0)
local addrs = I2C.search(0, 127)
local addrslen = table.getn(addrs)
local found = 0
-- Verify that the target device was found
for i=1, addrslen do
  if addrs[i] == SLAVE_ADDRESS then
    print("I2C Slave Detected")
    found = 1
    break
  end
end
if found == 0 then
  print("No I2C Slave detected, program stopping")
  MB.writeName("LUA_RUN", 0)
end
-- Channel A is 0-7, Channel B is 8-15
-- 1 = output, 0 = input
local dirchana = MB.readName("USER_RAM2_I32")
local dirchanb = MB.readName("USER_RAM3_I32")
-- 0 = pullup enabled, 1 = disabled
local pupchana = MB.readName("USER_RAM6_I32")
local pupchanb = MB.readName("USER_RAM7_I32")
-- Config clock
I2C.write({0x1E, 0x4F})
-- RegMisc
I2C.write({0x1F, 0x70})
-- Input buffer disable
I2C.write({0x01, dirchana})
-- Pull up disable
I2C.write({0x07, pupchana})
-- Open drain
I2C.write({0x0B, dirchana})
-- Output
I2C.write({0x0F, 0xFF-dirchana})
-- All LED off (initially)
I2C.write({0x11, 0xFF})
-- Disable LED Driver for ALL(which disables PWM and fade)
I2C.write({0x21, 0x00})
-- Config channel B inputs/outputs
I2C.write({0x01-1, dirchanb})
I2C.write({0x07-1, pupchanb})
I2C.write({0x0B-1, dirchanb})
I2C.write({0x0F-1, 0xFF-dirchanb})
I2C.write({0x11-1, 0xFF})
I2C.write({0x21-1, 0x00})
-- Configure a 10ms interval
LJ.IntervalConfig(0, 10)
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    if MB.readName("USER_RAM0_I32") ~= nil then
      -- Read Inputs
      I2C.write({0x11})
      local inchana = I2C.read(2)
      I2C.write({0x11-1})
      local inchanb = I2C.read(2)
      print(inchanb[1])
      MB.writeName("USER_RAM4_I32", inchana)
      MB.writeName("USER_RAM5_I32", inchanb)
      --Write Outputs
      local datachana = MB.readName("USER_RAM0_I32")
      -- All LEDs written depending on User RAM Register
      I2C.write({0x11, datachana})
      local datachanb = MB.readName("USER_RAM1_I32")
      I2C.write({0x11-1, datachanb})
    end
  end
end