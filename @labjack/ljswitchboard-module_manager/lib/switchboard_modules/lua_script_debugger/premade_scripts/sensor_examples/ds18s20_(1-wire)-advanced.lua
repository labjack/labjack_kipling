--[[
    Name: ds18s20_(1-wire)-advanced.lua
    Desc: This is an example that can get temperature readings from multiple
          DS18XX 1-wire sensors
    Note: There are several kinds of 1-wire sensors from Maxim such as the
          DS1820, DS1821, DS1822, DS18S20, and DS18B20

          Change the ROM IDs of each sensor to use this example. Also set
          eionum. Discover the ROM ID using the "1-Wire Read ROM ID" example

          T7 1-Wire documentation:
            https://labjack.com/support/datasheets/t7/digital-io/1-wire

          DS18B20 datasheet:
            http://datasheets.maximintegrated.com/en/ds/DS18B20.pdf

          The data line(DQ) needs a pullup resister of 2.2-4.7 kΩ to VS.
          This example used a 3.3kΩ resistor between VS and EIO0

          FIO lines cannot be used for 1-Wire. They have too much impedance,
          which prevents the signal from reaching logic thresholds
--]]

--Some ROM IDs of DS18S20s
--                  MW             UW            HW            LW   conv factor    name   conv delay
local FV1 = {[1] = 0xF100, [2] = 0x0802, [3] = 0xB082, [4] = 0x8010, [5] = 0.5, [6] = "1", [7] = 8}
local FV2 = {[1] = 0x2200, [2] = 0x0802, [3] = 0xB009, [4] = 0xB710, [5] = 0.5, [6] = "2", [7] = 8}
local FV3 = {[1] = 0x7400, [2] = 0x0802, [3] = 0xB012, [4] = 0x2210, [5] = 0.5, [6] = "3", [7] = 8}
local FV4 = {[1] = 0x3200, [2] = 0x0802, [3] = 0xAFA7, [4] = 0x0810, [5] = 0.5, [6] = "4", [7] = 8}
local FV5 = {[1] = 0xCB00, [2] = 0x0802, [3] = 0xB013, [4] = 0xD210, [5] = 0.5, [6] = "5", [7] = 8}
local FV6 = {[1] = 0x8C00, [2] = 0x0802, [3] = 0xB07A, [4] = 0xFC10, [5] = 0.5, [6] = "6", [7] = 8}
local FV7 = {[1] = 0x5A00, [2] = 0x0802, [3] = 0xB005, [4] = 0xB410, [5] = 0.5, [6] = "7", [7] = 8}
local FV8 = {[1] = 0xAE00, [2] = 0x0802, [3] = 0xAFB6, [4] = 0xCE10, [5] = 0.5, [6] = "8", [7] = 8}
local ROMS = {[1] = FV1, [2] = FV2, [3] = FV3, [4] = FV4, [5] = FV5, [6] = FV6, [7] = FV7, [8] = FV8}
local NUM_SENSORS = 8

-- Some ROM IDs of DS18B20s
local ROMA = {[1] = 0xC100, [2] = 0x0004, [3] = 0xCD4F, [4] = 0xED28, [5] = 0.0625, [6] = "A", [7] = 6}
local ROMB = {[1] = 0x5300, [2] = 0x0004, [3] = 0xCDF8, [4] = 0x2328, [5] = 0.0625, [6] = "B", [7] = 6}
local ROMC = {[1] = 0x8700, [2] = 0x0004, [3] = 0xCD50, [4] = 0x8428, [5] = 0.0625, [6] = "C", [7] = 6}
local ROMD = {[1] = 0xB900, [2] = 0x0004, [3] = 0xCE4B, [4] = 0xCE28, [5] = 0.0625, [6] = "D", [7] = 6}
-- local ROMS = {[1] = FV4, [2] = ROMA, [3] = ROMB, [4] = ROMC, [5] = ROMD}
-- local NUM_SENSORS = 5

function round(num, idp)
  local mult = 10^(idp or 0)
  return math.floor(num * mult + 0.5) / mult
end

local function ds18xx_start(targetrom, sensorpin)
  -- ONEWIRE_FUNCTION: 85=Match ROM, 51=Read, 240=Search, 204=Skip
  if targetrom[4] == 0 then
    MB.writeName("ONEWIRE_FUNCTION", 204)
  else
    MB.writeName("ONEWIRE_FUNCTION", 85)
  end
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
  MB.writeName("ONEWIRE_DATA_TX", 0x4400)
  return MB.writeName("ONEWIRE_GO", 1)
end

local function ds18xx_start_any(sensorpin)
  local data = {}
  -- data[1] = 49408
  -- data[2] = 4
  -- data[3] = 52559
  -- data[4] = 60712
  data[1] = 0
  data[2] = 0
  data[3] = 0
  data[4] = 0
  return ds18xx_start(data, sensorpin)
end

local function ds18xx_read(targetrom, sensorpin, sensorfound, sensornotfound, invalidreading)
  local temparray = {}
  local error = 0
  local msb = 0
  local lsb = 0
  -- ONEWIRE_FUNCTION: 85=Match ROM, 51=Read, 240=Search, 204=Skip
  if targetrom[4] == 0 then
    MB.writeName("ONEWIRE_FUNCTION", 204)
  else
    MB.writeName("ONEWIRE_FUNCTION", 85)
  end
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
  -- print("temp",temp,"msb",msb,"signbit",signbit)
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

local function ds18xx_exec(curprobe, sensorpin, sensorfound, sensornotfound, invalidreading)
  local isvalue = 0
  local retval = 0
  local temp = 0
  local err = 0
  temp,err = ds18xx_read(ROMS[curprobe], sensorpin, sensorfound, sensornotfound, invalidreading)
  if(err == sensornotfound) then
    isvalue = sensornotfound
  elseif(err ==invalidreading) then
    isvalue = invalidreading
  else
    local sign = 1
    local signbit = temp / 0x8000
    signbit = math.floor(signbit,0)
    -- print("raw",temp)
    -- print("raw",temp,"signbit",signbit)
    if(signbit == 1) then
      sign = -1
      temp = 0xFFFF-temp+1
    end
    -- Scale the temperature value according to sign and conversion factor
    temp = sign * temp * ROMS[curprobe][5]
    -- print("temp",temp)
    retval = (temp * 1.8) + 32
    isvalue = sensorfound
  end
  return retval,isvalue
end


print("Communicate with several DS18S20 1-wire sensors")
local sensornotfound = 0
local sensorfound = 1
local invalidreading = 2
local eionum = 0
-- EIO0 = DIO8
local sensorpin = eionum + 8
local curprobe = 1
local curstep = 0
local curdelay = 0
-- Initialize to the first sensors conversion delay value
local convdelay = ROMS[curprobe][7]
-- Get the base address for USER_RAM#_F32
local ramaddress = MB.nameToAddress("USER_RAM0_F32")
-- Configure a 100ms interval
LJ.IntervalConfig(0, 100)

while true do
  if LJ.CheckInterval(0) then
    -- Get ready for conversion
    if(curstep == 0) then
      print("Starting Conversion")
      ds18xx_start_any(sensorpin)
      curdelay = 0
      curstep = 1
    -- Delay conversion for convdelay*100ms
    elseif(curstep == 1) then
      if(curdelay > convdelay) then
        curstep = 2
        curprobe = 1
      end
      curdelay = curdelay + 1
    -- Do the temperature conversion
    elseif(curstep == 2) then
      local curname = ROMS[curprobe][6]
      local temp,err = ds18xx_exec(curprobe, sensorpin, sensorfound, sensornotfound, invalidreading)
      if(err == sensorfound) then
        if(curprobe == 0) then
          print("Reading sensors:")
        end
        print(curname, temp, "F")
        MB.W(ramaddress+(curprobe-1)*2, temp)
      elseif(err == sensornotfound) then
        print(curname,"N/A")
        MB.W(ramaddress+(curprobe-1)*2, 0)
      elseif(err == invalidreading) then
        print(curname,"Inv")
        MB.W(ramaddress+(curprobe-1)*2, 0)
      else
        print(curname,"Unknown State")
      end
      curprobe = curprobe + 1
      if(curprobe > NUM_SENSORS) then
        curstep = 0
      else
        -- Set the conversion delay to the next sensors delay value
        convdelay = ROMS[curprobe][7]
      end
    else
      print("Err")
    end
  end
end