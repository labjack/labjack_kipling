print("Communicate with several DS18S20 1-wire sensors")
--Requires Firmware 1.0161 or newer on the T7. FW 1.0 or newer required on T4
--First change the ROM IDs of each sensor to use this example. Also change eioNum
--Discover the ROM IDs using the "1-Wire Read ROM ID" example.
--Note, there are several kinds of 1-wire sensors from Maxim.
--Some variants: DS1820, DS1821, DS1822, DS18S20, and DS18B20.
--T7 1-Wire documentation
--https://labjack.com/support/datasheets/t7/digital-io/1-wire
--DS18S20 datasheet
--http://datasheets.maximintegrated.com/en/ds/DS18S20.pdf

--The data line(DQ) needs a pullup resister of 2.2-4.7 kΩ to VS.
--FIO lines can NOT be used for 1-Wire. They have too much impedance 
--which prevent the signal from reaching logic thresholds

local mbRead=MB.R
local mbWrite=MB.W

function round(num, idp)
  local mult = 10^(idp or 0)
  return math.floor(num * mult + 0.5) / mult
end

function DS18xx_Start(target_rom)
  if target_rom[3] == 0 then
    mbWrite(5307, 0, 0xCC) -- Set to skip ROM
  else
    mbWrite(5307, 0, 0x55) -- Set to match ROM
  end
  -- ONEWIRE_ROM_MATCH_H
  mbWrite(5320, 0, target_rom[0])
  mbWrite(5321, 0, target_rom[1])
  -- ONEWIRE_ROM_MATCH_L
  mbWrite(5322, 0, target_rom[2])
  mbWrite(5323, 0, target_rom[3])

  mbWrite(5300, 0, SensPinNum)     -- Set the DQ pin
  mbWrite(5302, 0, 0)       -- Set the options
  mbWrite(5308, 0, 1)       -- Write one byte
  mbWrite(5309, 0, 0)       -- Read no bytes
  -- ONEWIRE_DATA_WRITE
  mbWrite(5340, 0, 0x4400) -- Send the start conv command

  -- ONEWIRE_GO
  return mbWrite(5310, 0, 1)       -- GO
end
function DS18xx_GlobStart()
  local data = {}
  data[1] = 0
  data[2] = 0
  data[3] = 0
  data[4] = 0
  return DS18xx_Start(data)
end

function DS18xx_Read(target_rom)
  local temp = 0
  local error = 0
  local msb = 0
  local lsb = 0
  if target_rom[3] == 0 then
    mbWrite(5307, 0, 0xCC) -- Set to skip ROM
  else
    mbWrite(5307, 0, 0x55) -- Set to match ROM
  end
  
  mbWrite(5320, 0, target_rom[0])
  mbWrite(5321, 0, target_rom[1])
  mbWrite(5322, 0, target_rom[2])
  mbWrite(5323, 0, target_rom[3])
  
  mbWrite(5300, 0, SensPinNum)     -- Set the DQ pin
  mbWrite(5302, 0, 0)       -- Set the options
  mbWrite(5308, 0, 1)       -- Write one byte
  mbWrite(5309, 0, 9)       -- Read nine bytes
  -- ONEWIRE_DATA_WRITE
  mbWrite(5340, 0, 0xBE00) -- Send the read command
  
  -- ONEWIRE_GO
  mbWrite(5310, 0, 1)       -- GO
  
  temp, error = mbRead(5370, 0, 1)        -- Read two bytes
  
  lsb = temp / 256
  lsb = math.floor(lsb)
  msb = temp % 256
  msb = round(msb * 256, 0)
  -- print("temp",temp,"msb",msb,"signBit",signBit)
  temp = (msb  + lsb)
  if(temp == 0xFFFF) then
    error = sensorNotFound
  elseif(temp == 170) then
    error = invalidReading
    error = sensorFound
  elseif(msb == 1280) then
    error = invalidReading
    error = sensorFound
  else
    error = sensorFound
  end
  -- print("msb",msb,"lsb",lsb)
  return temp, error
end

function DS18xx_Exec(target_rom,i)
  local isValue = 0
  local retVal = 0
  local temp = 0
  local err = 0
  
  temp,err = DS18xx_Read(ROMs[curProbe])
  if(err == sensorNotFound) then
    isValue = sensorNotFound
  elseif(err ==invalidReading) then
    isValue = invalidReading
  else
    local sign = 1
    local signBit = temp / 0x8000
    signBit = math.floor(signBit,0)
    -- print("raw",temp)
    -- print("raw",temp,"signBit",signBit)
    if(signBit == 1) then
      sign = -1
      temp = 0xFFFF-temp+1
    end
    temp = sign * temp * convMult[i]
    -- print("temp",temp)
    retVal = (temp * 1.8) + 32
    isValue = sensorFound
  end
  return retVal,isValue
end


LJ.IntervalConfig(0, 100)       		--configure script interval for 100ms
local checkInterval=LJ.CheckInterval	--create local function for faster proccessing

eioNum = 0
--Some ROM IDs of DS18S20s
FV0 = {[0] = 0xF100, [1] = 0x0802, [2] = 0xB082, [3] = 0x8010, [4] = 0.5, [5] = "0", [6] = 8}
FV1 = {[0] = 0x2200, [1] = 0x0802, [2] = 0xB009, [3] = 0xB710, [4] = 0.5, [5] = "1", [6] = 8}
FV2 = {[0] = 0x7400, [1] = 0x0802, [2] = 0xB012, [3] = 0x2210, [4] = 0.5, [5] = "2", [6] = 8}
FV3 = {[0] = 0x3200, [1] = 0x0802, [2] = 0xAFA7, [3] = 0x0810, [4] = 0.5, [5] = "3", [6] = 8}
FV4 = {[0] = 0xCB00, [1] = 0x0802, [2] = 0xB013, [3] = 0xD210, [4] = 0.5, [5] = "4", [6] = 8}
FV5 = {[0] = 0x8C00, [1] = 0x0802, [2] = 0xB07A, [3] = 0xFC10, [4] = 0.5, [5] = "5", [6] = 8}
FV6 = {[0] = 0x5A00, [1] = 0x0802, [2] = 0xB005, [3] = 0xB410, [4] = 0.5, [5] = "6", [6] = 8}
FV7 = {[0] = 0xAE00, [1] = 0x0802, [2] = 0xAFB6, [3] = 0xCE10, [4] = 0.5, [5] = "7", [6] = 8}
ROMs = {[0] = FV0, [1] = FV1, [2] = FV2, [3] = FV3, [4] = FV4, [5] = FV5, [6] = FV6, [7] = FV7} 
NumSensors = 8

--more unused ROM IDs of DS18B20s
ROMA = {[0] = 0xC100, [1] = 0x0004, [2] = 0xCD4F, [3] = 0xED28, [4] = 0.0625, [5] = "A", [6] = 8}
ROMB = {[0] = 0x5300, [1] = 0x0004, [2] = 0xCDF8, [3] = 0x2328, [4] = 0.0625, [5] = "B", [6] = 8}
ROMC = {[0] = 0x8700, [1] = 0x0004, [2] = 0xCD50, [3] = 0x8428, [4] = 0.0625, [5] = "C", [6] = 8}
ROMD = {[0] = 0xB900, [1] = 0x0004, [2] = 0xCE4B, [3] = 0xCE28, [4] = 0.0625, [5] = "D", [6] = 8}
-- ROMs = {[0] = FV3, [1] = ROMA, [2] = ROMB, [3] = ROMC, [4] = ROMD}
-- NumSensors = 5



convMult = {}
convDelay = 0
for i=0, (NumSensors-1) do
  convMult[i] = ROMs[i][4]
  if (convDelay < ROMs[i][6]) then
    convDelay = ROMs[i][6]
  end
end

sensorNotFound = 0
sensorFound = 1
invalidReading = 2
SensPinNum = eioNum + 8
curProbe = 0
curStep = 0
curDelay = 0

while true do
  if checkInterval(0) then
    if(curStep == 0) then
      print("Starting Conversion")
      DS18xx_GlobStart()
      curDelay = 0
      curStep = 1
    elseif(curStep == 1) then
      if(curDelay > convDelay) then
        curStep = 2
        curProbe = 0
      end
      curDelay = curDelay + 1
    elseif(curStep == 2) then
      curName = ROMs[curProbe][5]
      temp,err = DS18xx_Exec(ROMs[curProbe], curProbe)
      if(err == sensorFound) then
        if(curProbe == 0) then
          print("Reading sensors:")
        end
        print(curName, temp, "F")
        mbWrite(46000+curProbe*2, temp)  --USER_RAM#_F32
      elseif(err == sensorNotFound) then
        print(curName,"N/A")
        mbWrite(46000+curProbe*2, 0)     --USER_RAM#_F32
      elseif(err == invalidReading) then
        print(curName,"Inv")
        mbWrite(46000+curProbe*2, 0)     --USER_RAM#_F32
      else
        print(curName,"Unknown State")
      end
      curProbe = curProbe + 1
      if(curProbe >= NumSensors) then
        curStep = 0
      end
    else
      print("Err")
    end
  end
end