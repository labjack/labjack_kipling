--[[
    Name: sht3x.lua
    Desc: This example shows how to take temperature and humidity readings
            with SHT3x sensors (EIO4 used for SCL and EIO5 used for SDA)
    Note: This script will work with SHT30, SHT31, and SHT35 sensors

          I2C examples assume power is provided by a LJTick-LVDigitalIO at 3.3V
          (a DAC set to 3.3V or a DIO line could also be used for power)

          SHT3x datasheet:
            https://www.mouser.com/datasheet/2/682/Sensirion_Humidity_Sensors_SHT3x_Datasheet_digital-971521.pdf
--]]

-- Depending on the sensor circuitry, the default slave address could be 0x45
local SLAVE_ADDRESS = 0x44
-- Set EIO3 to 1 and use it for power
MB.writeName("EIO3", 1)
-- configure I2C options with the SHT3x sensor
-- SDA = EIO5(DIO13), SCL = EIO4(DIO12). Use the 100KHz clock speed
I2C.config(13,12,65516,0,SLAVE_ADDRESS, 0)
local addrs = I2C.search(0, 127)
local addrslen = table.getn(addrs)
local found = 0
-- Make sure all device slave addresses are found
for i=1, addrslen do
  if addrs[i] == SLAVE_ADDRESS then
    print(" SHT3x Detected")
    found = found+1
  end
end
if found ~= 1 then
  print("Slave device not found, stopping program")
  MB.writeName("LUA_RUN", 0)
end

local data = {}
local numreads = 0
local maxreads = 10
local stage = 0
-- Configure a 1000ms interval
local interval = 1000
LJ.IntervalConfig(0, interval)
local stage = 0
while numreads < maxreads do
    -- If an interval is done
    if (LJ.CheckInterval(0)) then
      if stage == 0 then
        -- Send the Single Shot acquisition command
        -- 0x24 = clock stretching disabled, 0x00 = high repeatability
        I2C.write({0x24, 0x00})

        stage = 1
        -- Give the sensor some time to process data
        LJ.IntervalConfig(0,20)
      else
        data = I2C.read(6)
        -- Byte 3 and 6 returned from the read are CRC values
        local temp = data[1]*256+data[2]
        temp = (315*temp / (2^16-1))-49
        local rh = data[4]*256+data[5]
        rh = 100*rh / (2^16-1)
        print("Temperature:",temp,"Humidity%:", rh)
        numreads = numreads + 1
        stage = 0
        -- Set the original interval back up
        LJ.IntervalConfig(0, interval)
      end
    end
end

-- Writing a 0 to LUA_RUN stops the script
MB.writeName("LUA_RUN", 0)