--Requires Firmware 1.0161 or newer
function round(num, idp)
  local mult = 10^(idp or 0)
  return math.floor(num * mult + 0.5) / mult
end

function DS18xx_Start(target_rom)
  if target_rom[3] == 0 then
    MB.W(5307,0, 0xCC) -- Set to skip ROM
    print("rom skip")
  else
    MB.W(5307,0, 0x55) -- Set to match ROM
  end

    MB.W(5320, 0, target_rom[0])
    MB.W(5321, 0, target_rom[1])
    MB.W(5322, 0, target_rom[2])
    MB.W(5323, 0, target_rom[3])

    MB.W(5300, 0, SensPinNum)     -- Set the DQ pin
    MB.W(5302, 0, 0)       -- Set the options
    MB.W(5308, 0, 1)       -- Write one byte
    MB.W(5309, 0, 0)       -- Read no bytes
    MB.W(5340, 0, 0x4400) -- Send the start conv command

    return MB.W(5310, 0, 1)       -- GO
end

function DS18xx_Read(target_rom)
  if target_rom[3] == 0 then
    MB.W(5307,0, 0xCC) -- Set to skip ROM
  else
    MB.W(5307,0, 0x55) -- Set to match ROM
  end

    MB.W(5320, 0, target_rom[0])
    MB.W(5321, 0, target_rom[1])
    MB.W(5322, 0, target_rom[2])
    MB.W(5323, 0, target_rom[3])

    MB.W(5300, 0, SensPinNum)     -- Set the DQ pin
    MB.W(5302, 0, 0)       -- Set the options
    MB.W(5308, 0, 1)       -- Write one byte
    MB.W(5309, 0, 9)       -- Read nine bytes
    MB.W(5340, 0, 0xBE00) -- Send the read command

    MB.W(5310, 0, 1)       -- GO

    temp, error = MB.R(5370, 0, 1)        -- Read two bytes
    
    lsb = temp / 256
    round(lsb, 0)
    msb = temp % 256
    msb = round(msb * 256, 0)
    temp = msb  + lsb
    temp = temp * 0.0625 + 273.15
    if(msb == 65280) then
        temp = sensorNotFound
    end
    -- print("msb",msb,"lsb",lsb)
   return temp, error
end


print("Read and display the device temperature 10 times at 0.5 Hz.")
sensorNotFound = 0
MB.W(48005, 0, 1)        --Ensure analog is on
LJ.IntervalConfig(0, 3000)

-- eioNum = 6
-- ROMA = {[0] = 0xF100, [1] = 0x0802, [2] = 0xB082, [3] = 0x8010}
-- ROMB = {[0] = 0x2200, [1] = 0x0802, [2] = 0xB009, [3] = 0xB710}
-- ROMC = {[0] = 0x7400, [1] = 0x0802, [2] = 0xB012, [3] = 0x2210}
-- ROMD = {[0] = 0x3200, [1] = 0x0802, [2] = 0xAFA7, [3] = 0x0810}
-- ROMs = {[0] = ROMC}
-- NumSensors = 1

eioNum = 2
ROM0 = {[0] = 0xC100, [1] = 0x0004, [2] = 0xCD4F, [3] = 0xED28}
ROM1 = {[0] = 0x5300, [1] = 0x0004, [2] = 0xCDF8, [3] = 0x2328}
ROM2 = {[0] = 0xB900, [1] = 0x0004, [2] = 0xCE4B, [3] = 0xCE28}
ROM3 = {[0] = 0x8700, [1] = 0x0004, [2] = 0xCD50, [3] = 0x8428}
ROM4 = {[0] = 0xD800, [1] = 0x0004, [2] = 0xCE1B, [3] = 0xAF28}
ROMA = {[0] = 0xF100, [1] = 0x0802, [2] = 0xB082, [3] = 0x8010}
ROMs = {[0] = ROM0, [1] = ROM1, [2] = ROM2, [3] = ROM3, [4] = ROM4, [5] = ROMA} 
NumSensors = 6

SensPinNum = eioNum + 8
temps = {}
while true do
  if LJ.CheckInterval(0) then
    print("Reading sensors:")
    for i=0, NumSensors - 1, 1 do
        temp = DS18xx_Read(ROMs[i])
        DS18xx_Start(ROMs[i])
        if(temp == sensorNotFound) then
            print(i,"N/A")
        else
            print(i, temp, "K")
        end
        -- temps[i] = temp
        -- IOMEM.W(46000+i*2, temps[i])
        MB.W(46000+i*2, temp)
    end
  end
end