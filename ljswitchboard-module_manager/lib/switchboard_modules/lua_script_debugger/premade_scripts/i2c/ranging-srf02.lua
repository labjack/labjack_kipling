--[[
    Name: ranging-srf02.lua
    Desc: This is an example that uses the SRF02 sensor with the I2C Bus on
          EIO4(SCL) and EIO5(SDA)
    Note: I2C examples assume power is provided by a LJTick-LVDigitalIO at 3.3V
          (a DAC set to 3.3V or a DIO line could also be used for power)
--]]

--Outputs data to Registers:
-- Value in cm: 46000
-- Value in inches: 46002

SLAVE_ADDRESS = 0x70

-- Configure the I2C Bus
I2C.config(13, 12, 65200, 0, SLAVE_ADDRESS, 0)
-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
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
-- Configure a 900ms interval
LJ.IntervalConfig(0, 900)
-- Used to control program progress
local stage = 0

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    if stage == 0 then
      -- Command to fetch the range in inches(0x50)
      I2C.write({0x00, 0x50})
      -- Set an interval to give the range finder some processing time
      LJ.IntervalConfig(0, 100)
      stage = 1
    elseif stage == 1 then
      distRaw = I2C.read(4)
      distin = distRaw[3]
      distcm = distin*2.54
      --Store the value in cm for users to access with another program
      MB.writeName("USER_RAM0_F32", distcm)
      --Store the value in inches
      MB.writeName("USER_RAM1_F32", distin)
      print("Measured Distance: "..string.format("%d", distcm).."cm".."  ("..string.format("%.1f", distin).."in)")
      print("-----------")
      -- Reset the initial interval
      LJ.IntervalConfig(0, 800)
      stage = 0
    end
  end
end