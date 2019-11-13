--[[
    Name: color-sensor-tcs34725.lua
    Desc: This is an example that uses the TCS34725 Color Sensor on the I2C Bus
          on EIO4(SCL) and EIO5(SDA), LED pin to FIO6
    Note: See the TCS34725 datasheet for more information
--]]

--Outputs data to Registers:
--Raw:
--clear: 46100
--red: 46102
--green: 46104
--blue: 46106
--Intensity:
--red: 46000
--green: 46002
--blue: 46004

SLAVE_ADDRESS = 0x29

-- Configure the I2C Bus
I2C.config(13, 12, 65516, 0, SLAVE_ADDRESS, 0)
-- Turn the LED on
MB.writeName("FIO6", 0)
local addrs = I2C.search(0, 127)
local addrslen = table.getn(addrs)
local found = 0
-- Make sure we can detect the slave address
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
-- Turn the LED on
MB.writeName("FIO6", 1)
-- Used to control program progress
local stage = 0
-- Configure a 1000ms interval
local interval = 1000
LJ.IntervalConfig(0, interval)
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    if stage == 0 then
      -- Set a new interval of 100ms
      LJ.IntervalConfig(0, 100)
      stage = 1
    elseif stage == 1 then
      I2C.write({0x80+0x00, 0x03})
      -- Set a new interval of 50ms
      LJ.IntervalConfig(0, 50)
      stage = 2
    elseif stage == 2 then
      local indata = {}
      for i=0,3 do
        I2C.write({0x80+0x14+2*i, 0x80+0x15+2*i})
        -- Read the raw sensor data
        local raw = I2C.read(2)
        table.insert(indata, raw[2]*256+raw[1])
      end
      -- Write the clear light value in raw form
      MB.writeName("USER_RAM0_U32", indata[1])
      --Write the red value
      MB.writeName("USER_RAM1_U32", indata[2])
      --Write the green value
      MB.writeName("USER_RAM2_U32", indata[3])
      --Write the blue value
      MB.writeName("USER_RAM3_U32", indata[4])
      red =   ((indata[2])/indata[1])
      MB.writeName("USER_RAM0_F32", red)
      green = ((indata[3])/indata[1])
      MB.writeName("USER_RAM1_F32", green)
      blue =  ((indata[4])/indata[1])
      MB.writeName("USER_RAM2_F32", blue)
      -- Print raw light values
      print("Clear:", indata[1], "Red:",  indata[2], "Green:",  indata[3], "Blue:", indata[4])
      -- Print the dominant color
      if red > blue and red > green then
        print("Dominant: Red")
      elseif blue > green and blue > red then
        print("Dominant: Blue")
      else
        print("Dominant: Green")
      end
      print("-----------")
      -- Configure the original interval duration
      LJ.IntervalConfig(0, interval)
      stage = 0
    end
  end
end