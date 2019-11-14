--[[
    Name: accelerometer-adxl345.lua
    Desc: This is an example that uses the ADXL345 Accelerometer on the
          I2C Bus on EIO4(SCL) and EIO5(SDA)
--]]

--Outputs data to Registers:
--X accel = 46000
--Y accel = 46002
--Z accel = 46004

-------------------------------------------------------------------------------
--  Desc: Returns a number adjusted using the conversion factor
--        Use 1 if not desired
-------------------------------------------------------------------------------
local function convert_16_bit(msb, lsb, conv)
  res = 0
  if msb >= 128 then
    res = (-0x7FFF+((msb-128)*256+lsb))/conv
  else
    res = (msb*256+lsb)/conv
  end
  return res
end

local SLAVE_ADDRESS = 0x53

-- Use EIO3 for power
MB.writeName("EIO3", 1)
-- Use EIO2 to pull up CS
MB.writeName("EIO2", 1)
-- Use EOI5(DIO13) for SDA and EIO4(DIO12) for SCL
I2C.config(13, 12, 65516, 0, SLAVE_ADDRESS, 0)
local addrs = I2C.search(0, 127)
local addrslen = table.getn(addrs)
local found = 0
-- Make sure the device slave address is found
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

-- Set for +-4g (use 0x08 for 2g) in full resolution mode
I2C.write({0x31, 0x09})
-- Disable power saving
I2C.write({0x2D, 0x08})
-- Used to control program progress
local stage = 0
-- Configure a 500ms interval
local interval = 500
LJ.IntervalConfig(0, interval)
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    if stage == 0 then
      -- Begin the stream of 6 bytes
      I2C.write({0x32})
      -- Set an interval of 100ms to give the range finder some processing time
      LJ.IntervalConfig(0, 100)
      stage = 1
    elseif stage == 1 then
      -- Read the raw data
      local raw = I2C.read(6)
      local data = {}
      -- Process the raw data
      for i=0, 2 do
        table.insert(data, convert_16_bit(raw[(2*i)+2], raw[(2*i)+1], 233))
      end
      -- Add X value, in Gs, to the user_ram register
      MB.writeName("USER_RAM0_F32", data[1])
      -- Add Y
      MB.writeName("USER_RAM1_F32", data[2])
      -- Add Z
      MB.writeName("USER_RAM2_F32", data[3])
      print("X", data[1])
      print("Y", data[2])
      print("Z", data[3])
      print("-----------")
      -- Set the interval back to the original duration
      LJ.IntervalConfig(0, interval)
      stage = 0
    end
  end
end
