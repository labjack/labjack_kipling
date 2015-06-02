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

    MB.W(5300, 0, 14)     -- Set the DQ pin
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

    MB.W(5300, 0, 14)     -- Set the DQ pin
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

   return temp, error
end


print("Read and display the device temperature 10 times at 0.5 Hz.")
count = 0
MB.W(48005, 0, 1)        --Ensure analog is on
LJ.IntervalConfig(0, 1000)

NumSensors = 2
ROM0 = {[0] = 0x4800, [1] = 0x0000, [2] = 0x24AA, [3] = 0xC622}
ROM1 = {[0] = 0xB600, [1] = 0x0000, [2] = 0x24B5, [3] = 0xF622}
ROMs = {[0] = ROM0, [1] = ROM1} 
temps = {}
while true do
  if LJ.CheckInterval(0) then
    
    print("Reading sensors:")
    for i=0, NumSensors - 1, 1 do

      temp = DS18xx_Read(ROMs[i])
      DS18xx_Start(ROMs[i])
   
      print(i, temp, "K")
      temps[i] = temp
      MB.W(46000+i*2, temps[i])
    end
    
    count = count + 1
  end
end