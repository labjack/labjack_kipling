--[[
    Name: compass-lsm303dlhc.lua
    Desc: This is an example that uses the LSM303DLHC Magnetometer on the I2C
          Bus on EIO4(SCL) and EIO5(SDA)
--]]

--Outputs data to Registers:
--X mag = 46000
--Y mag = 46002
--Z mag = 46004

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

SLAVE_ADDRESS = 0x1E

-- Configure the I2C bus
I2C.config(13, 12, 65516, 0, SLAVE_ADDRESS, 0)
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
-- Data Output Rate set (30Hz), disable temp sensor
I2C.write({0x00, 0x14})
-- Amplifier Gain set (+-1.3 Gauss)
I2C.write({0x01, 0x20})
-- Set mode (continous conversion)
I2C.write({0x02, 0x00})
-- Configure a 500ms interval
LJ.IntervalConfig(0, 500)
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
local rawmagdata = {}
    -- Sequentially read the addresses containing the magnetic field data
    for i=0, 5 do
      I2C.write({0x03+i})
      local indata = I2C.read(2)
      table.insert(rawmagdata, indata[1])
    end
    local magdata = {}
    -- Convert the data into useful gauss values
    table.insert(magdata, convert_16_bit(rawmagdata[1], rawmagdata[2], 1100))
    table.insert(magdata, convert_16_bit(rawmagdata[3], rawmagdata[4], 11000))
    table.insert(magdata, convert_16_bit(rawmagdata[5], rawmagdata[6], 980))
    -- Add magX value, in Gauss, to the user_ram registers
    MB.writeName("USER_RAM0_F32", magdata[1])
    -- Add magY
    MB.writeName("USER_RAM1_F32", magdata[2])
    -- Add magZ
    MB.writeName("USER_RAM2_F32", magdata[3])
    print("X: "..magdata[1])
    print("Y: "..magdata[2])
    print("Z: "..magdata[3])
    print("------")
  end
end