--[[
    Name: ds18b20_temperature_(1-wire).lua
    Desc: This is an example that gets temperature readings from a DS18B20
          1-wire sensor
    Note: There are several kinds of 1-wire sensors from Maxim such as the
          DS1820, DS1821, DS1822, DS18S20, and DS18B20

          Discover the ROM ID using the "1-Wire Read ROM ID" example

          T7 1-Wire documentation:
            http://labjack.com/support/datasheets/t7/digital-io/1-wire

          DS18B20 datasheet:
            http://datasheets.maximintegrated.com/en/ds/DS18B20.pdf

          The data line(DQ) needs a pullup resister of 2.2-4.7 kΩ to VS.
          This example used a 3.3kΩ resistor between VS and EIO0

          FIO lines cannot be used for 1-Wire. They have too much impedance,
          which prevents the signal from reaching logic thresholds
--]]

local function round(num, idp)
  local mult = 10^(idp or 0)
  return math.floor(num * mult + 0.5) / mult
end

local function ds18xx_start(targetrom, sensorpin)
  -- ONEWIRE_FUNCTION Set to 85=Match ROM. 51=Read, 240=Search, 204=Skip
  MB.writeName("ONEWIRE_FUNCTION", 85)
  -- Write upper and lower 2 bytes of ONEWIRE_ROM_MATCH_H as separate values
  MB.writeNameArray("ONEWIRE_ROM_MATCH_H", 2, {targetrom[1], targetrom[2]}, 0)
  -- Write upper and lower 2 bytes of ONEWIRE_ROM_MATCH_L as separate values
  MB.writeNameArray("ONEWIRE_ROM_MATCH_L", 2, {targetrom[3], targetrom[4]}, 0)
  -- Set the data line (DQ) to sensorpin
  MB.writeName("ONEWIRE_DQ_DIONUM", sensorpin)
  -- Set DPU Enable, DPU Polarity unused = 0
  MB.writeName("ONEWIRE_OPTIONS", 0)
  -- Write 1 byte
  MB.writeName("ONEWIRE_NUM_BYTES_TX", 1)
  -- Read 0 bytes
  MB.writeName("ONEWIRE_NUM_BYTES_RX", 0)
  -- Send the DS18xx the start temperature conversion command (0x44)
  MB.writeNameArray("ONEWIRE_DATA_TX", 1, {0x4400}, 0)
  return MB.writeName("ONEWIRE_GO", 1)
end

local function ds18xx_read(targetrom, sensorpin, sensorfound, sensornotfound, invalidreading)
  local temparray = {}
  local error = 0
  local msb = 0
  local lsb = 0
  -- ONEWIRE_FUNCTION Set to 85=Match ROM. 51=Read, 240=Search, 204=Skip
  MB.writeName("ONEWIRE_FUNCTION", 85)
  -- Write upper and lower 2 bytes of ONEWIRE_ROM_MATCH_H as separate values
  MB.writeNameArray("ONEWIRE_ROM_MATCH_H", 2, {targetrom[1], targetrom[2]}, 0)
  -- Write upper and lower 2 bytes of ONEWIRE_ROM_MATCH_L as separate values
  MB.writeNameArray("ONEWIRE_ROM_MATCH_L", 2, {targetrom[3], targetrom[4]}, 0)
  -- Set the data line (DQ) to sensorpin
  MB.writeName("ONEWIRE_DQ_DIONUM", sensorpin)
  -- Set DPU Enable, DPU Polarity unused = 0
  MB.writeName("ONEWIRE_OPTIONS", 0)
  -- Write 1 byte
  MB.writeName("ONEWIRE_NUM_BYTES_TX", 1)
  -- Read 9 bytes
  MB.writeName("ONEWIRE_NUM_BYTES_RX", 9)
  -- Send the DS18xx the read command (0xBE)
  MB.writeNameArray("ONEWIRE_DATA_TX", 1, {0xBE00}, 0)
  MB.writeName("ONEWIRE_GO", 1)
  temparray = MB.readNameArray("ONEWIRE_DATA_RX", 1, 0)
  -- Get two bytes (one UINT16) from ONEWIRE_DATA_RX
  local temp = temparray[1]
  -- Handle some conversion steps
  local lsb = temp / 256
  lsb = math.floor(lsb)
  local msb = temp % 256
  msb = round(msb * 256, 0)
  -- print("temp",temp,"msb",msb,"signBit",signBit)
  temp = (msb  + lsb)
  if(temp == 0xFFFF) then
    error = sensornotfound
  elseif(temp == 170) then
    error = invalidreading
    error = sensorfound
  elseif(msb == 1280) then
    error = invalidreading
    error = sensorfound
  else
    error = sensorfound
  end
  -- print("msb",msb,"lsb",lsb)
  return temp, error
end

print("Get temperature from a DS18B20 1-wire sensor.")
--From the "1-Wire Read ROM ID" example, the 64-bit ID is:
local targetrom = {}
-- MW
targetrom[1] = 49408
-- UW
targetrom[2] = 4
-- HW
targetrom[3] = 52559
-- LW
targetrom[4] = 60712
-- Use DIO8 (EIO0) for readings
local sensorpin = 8
-- 12-bit default conversion factor (DS18B20)
-- Use a conversion factor of 0.5 if using a DB18S20
local conversionfactor = 0.0625
-- Conversion delay in 100 ms; 6 = 600ms
-- If using a DS18S20 use a conversion delay of 8 (800ms)
local conversiondelay = 6
-- Initialize some other variables
local sensornotfound = 0
local sensorfound = 1
local invalidreading = 2
local curstep = 0
local curdelay = 0
local tempc = 0
local tempf = 0
-- Configure a 100ms interval
LJ.IntervalConfig(0, 100)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    if(curstep == 0) then
      print("Starting Conversion...")
      ds18xx_start(targetrom, sensorpin)
      curdelay = 0
      curstep = 1
    elseif(curstep == 1) then
      if(curdelay > conversiondelay) then
        curstep = 2
      end
      curdelay = curdelay + 1
    elseif(curstep == 2) then
      tempc, err = ds18xx_read(targetrom, sensorpin, sensorfound, sensornotfound, invalidreading)
      local sign = 1
      local signBit = tempc / 0x8000
      signBit = math.floor(signBit,0)
      -- print("raw",tempc)
      -- print("raw",tempc,"signBit",signBit)
      if(signBit == 1) then
        sign = -1
        tempc = 0xFFFF-tempc+1
      end
      tempc = sign * tempc * conversionfactor
      -- print("tempc",tempc)
      tempf = (tempc * 1.8) + 32
      if(err == sensorfound) then
        print("Reading:", tempf, "°F\n")
      elseif(err == sensornotfound) then
        print("Reading:","N/A")
      elseif(err == invalidreading) then
        print("Reading:","Inv")
      else
        print("Reading:","Unknown State")
      end
      -- Save the temperature value in User RAM so an external PC running
      -- simple logging software can easily read the temperature
      MB.writeName("USER_RAM0_F32", tempf)
      curstep = 0
    else
      print("Err")
    end
  end
end

