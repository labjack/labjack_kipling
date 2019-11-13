--[[
    Name: accel-and-compass-lsm303dlhc.lua
    Desc: This is an example that uses the LSM303DLHC Accelerometer &
          Magnetometer on the I2C Bus on EIO4(SCL) and EIO5(SDA)
    Note: This example is a combination of the LSM303 Accelerometer and
          LSM303 Magnetometer Lua scripts
--]]

--Outputs data to Registers:
--X mag = 46000
--Y mag = 46002
--Z mag = 46004
--X accel = 46006
--Y accel = 46008
--Z accel = 46010

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

local MAG_ADDRESS = 0x1E
local ACCEL_ADDRESS = 0x19

I2C.config(13, 12, 65516, 0, MAG_ADDRESS, 0)--configure the I2C Bus
I2C.config(13, 12, 65516, 0, ACCEL_ADDRESS, 0)--configure the I2C Bus
local addrs = I2C.search(0, 127)
local addrslen = table.getn(addrs)
local found = 0
-- Make sure all device slave addresses are found
for i=1, addrslen do
  if addrs[i] == MAG_ADDRESS then
    print("I2C Magnetometer Slave Detected")
    found = found+1
  end
  if addrs[i] == ACCEL_ADDRESS then
    print("I2C Accelerometer Slave Detected")
    found = found+1
  end
end
if found ~= 2 then
  print(string.format("%d", found).." slave devices found (looking for 3 devices), program stopping")
  MB.writeName("LUA_RUN", 0)
end

-- Change the target to the magnetometer
MB.writeName("I2C_SLAVE_ADDRESS", MAG_ADDRESS)
-- Data Output Rate set (30Hz), disable temp sensor
I2C.write({0x00, 0x14})
-- Amplifier Gain set (+-1.3 Gauss)
I2C.write({0x01, 0x20})
-- Set mode (continous conversion)
I2C.write({0x02, 0x00})
-- Change the target to the accelerometer
MB.writeName("I2C_SLAVE_ADDRESS", ACCEL_ADDRESS)
--Data Rate: 10Hz, disable low-power, enable all axes
I2C.write({0x20, 0x27})
-- Continuous update, LSB at lower addr, +- 2g, Hi-Res disable
I2C.write({0x23, 0x49})

LJ.IntervalConfig(0, 500)
while true do
  if LJ.CheckInterval(0) then
    -- Change the target to the magnetometer
    MB.writeName("I2C_SLAVE_ADDRESS", MAG_ADDRESS)
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
    -- Change the target to the accelerometer
    MB.writeName("I2C_SLAVE_ADDRESS", ACCEL_ADDRESS)
    local rawacceldata = {}
    -- Sequentially read the addresses containing the accel data
    for i=0, 5 do
      I2C.write({0x28+i})
      local indata = I2C.read(2)
      table.insert(rawacceldata, indata[1])
    end
    local acceldata = {}
    -- Convert the data into Gs
    for i=0, 2 do
      table.insert(acceldata, convert_16_bit(rawacceldata[1+i*2], rawacceldata[2+i*2], (0x7FFF/2)))
    end

    -- Add magX value, in Gauss, to the user_ram registers
    MB.writeName("USER_RAM0_F32", magdata[1])
    -- Add magY
    MB.writeName("USER_RAM1_F32", magdata[2])
    -- Add magZ
    MB.writeName("USER_RAM2_F32", magdata[3])
    -- Add accelX value, in Gs, to the user_ram register
    MB.writeName("USER_RAM3_F32", acceldata[1])
    -- Add accelY
    MB.writeName("USER_RAM4_F32", acceldata[2])
    -- Add accelZ
    MB.writeName("USER_RAM5_F32", acceldata[3])
    print("Accel X: "..acceldata[1].." Mag X: "..magdata[1])
    print("Accel Y: "..acceldata[2].." Mag Y: "..magdata[2])
    print("Accel Z: "..acceldata[3].." Mag Z: "..magdata[3])
    print("------")
  end
end