--[[
    Name: differential-pressure-sensor-sdp611.lua
    Desc: This is an example that uses the SDP611 differential pressure sensor
    Note: The sensor should be connected with SCL on EIO4 and SDA on EIO5

          I2C examples assume power is provided by a LJTick-LVDigitalIO at 3.3V
          (a DAC set to 3.3V or a DIO line could also be used for power)

          The T7 won't allow more than 1000 clock cycles of clock stretching.
          The SDP611 datasheet calls clock stretching "master hold." The sensor
          needs to clock stretch for ~4.5ms. The clock needs to be ~20kHz or slower.
--]]

-------------------------------------------------------------------------------
-- Desc: This function will convert the binary values from the SDP611 to a
--       pressure. The binary data consists of two bytes which must be joined
--       and interpreted as 2's complement. The resulting signed binary value
--       is then converted to pascals.
-------------------------------------------------------------------------------
function bin_to_pa(upperbyte,lowerbyte)
  local value = 0
  -- Join the two bytes
  local rawval = upperbyte*256+lowerbyte
  -- Interpret as 2's complement
  if rawval >0x8000 then
    value = bit.band(bit.bnot(rawval), 0xFFFF) +1
    value = value*-1
  else
    value=rawval
  end
  -- Convert to pascals
  value = value / 60
  return value
end

-- 64 or h40, is default for SDP611 differential pressure sensor
SLAVE_ADDRESS = 0x40

-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
-- Configure the I2C Bus
I2C.config(13, 12, 65200, 0, SLAVE_ADDRESS, 0)
local addrs = I2C.search(0, 127)
local addrsLen = table.getn(addrs)
local found = 0
-- Verify that the target device was found
for i=1, addrsLen do
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
-- Configure an interval of 1000ms
LJ.IntervalConfig(0, 1000)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    rawval = {}
    rawval = I2C.writeRead({0xF1},3)
    pressure = bin_to_pa(rawval[1],rawval[2])
    print("pressure = ", pressure,"Pa")
  end
end
