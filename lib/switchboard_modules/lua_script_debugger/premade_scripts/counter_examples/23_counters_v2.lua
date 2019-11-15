--This program demonstrates how to use AINs as counters.
--Most commonly users should throttle their code execution using the functions:
--'LJ.IntervalConfig(0, 1000)', and 'if LJ.CheckInterval(0) then' ...
--Array indeces 1-14 correspond with AIN0-13
--Array indeces 15-37 correspond with DIO0-22 as the following:
  --Index:  15            Channel:  FIO0  (DIO0)
  --Index:  16            Channel:  FIO1  (DIO1)
  --Index:  17            Channel:  FIO2  (DIO2)
  --Index:  18            Channel:  FIO3  (DIO3)
  --Index:  19            Channel:  FIO4  (DIO4)
  --Index:  20            Channel:  FIO5  (DIO5)
  --Index:  21            Channel:  FIO6  (DIO6)
  --Index:  22            Channel:  FIO7  (DIO7)
  --Index:  23            Channel:  EIO0  (DIO8)
  --Index:  24            Channel:  EIO1  (DIO9)
  --Index:  25            Channel:  EIO2  (DIO10)
  --Index:  26            Channel:  EIO3  (DIO11)
  --Index:  27            Channel:  EIO4  (DIO12)
  --Index:  28            Channel:  EIO5  (DIO13)
  --Index:  29            Channel:  EIO6  (DIO14)
  --Index:  30            Channel:  EIO7  (DIO15)
  --Index:  31            Channel:  CIO0  (DIO16)
  --Index:  32            Channel:  CIO1  (DIO17)
  --Index:  33            Channel:  CIO2  (DIO18)
  --Index:  34            Channel:  CIO3  (DIO19)
  --Index:  35            Channel:  MIO0  (DIO20)
  --Index:  36            Channel:  MIO1  (DIO21)
  --Index:  37            Channel:  MIO2  (DIO22)

print("Create and read 37 counters.")

local mbRead=MB.R               --Local functions for faster processing
local mbWrite=MB.W

if (mbRead(60000, 3) ~= 7) then
  print("This example is only for the T7. Exiting Lua Script.")
  mbWrite(6000, 1, 0)
end

--AIN thresholds for binary conversion
local threshold = {}
threshold[1] = 2.8
threshold[2] = 2.8
threshold[3] = 2.8
threshold[4] = 2.8
threshold[5] = 1.5
threshold[6] = 1.5
threshold[7] = 1.5
threshold[8] = 1.5
threshold[9] = 1.5
threshold[10] = 1.5
threshold[11] = 4.1
threshold[12] = 4.1
threshold[13] = 4.1
threshold[14] = 4.1

--1 = Rising edge, 0 = falling
local edge = {}
for i = 1, 37 do
  edge[i] = 0 --sets all 37 counters to increment on falling edges
end

local bits = {}
local bits_new = {}
local count = {}

--The throttle setting can correspond roughly with the length of the Lua
--script. A rule of thumb for deciding a throttle setting is
--throttle = (3*NumLinesCode) + 20
local throttleSetting = 100    --Default throttle setting is 10 instructions
LJ.setLuaThrottle(throttleSetting)
local throttleSetting = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", throttleSetting)

mbWrite(2600, 0, 0)  --FIO to input
mbWrite(2601, 0, 0)  --EIO to input
mbWrite(2602, 0, 0)  --COI to input
mbWrite(2603, 0, 0)  --MIO to input

mbWrite(43903, 0, 1) --AIN_ALL_RESOLUTION_INDEX to 1
mbWrite(6006, 1, 37)

for i=1, 37 do
  bits[i] = 0
  bits_new[i] = 99
  count[i] = 0
end

local rshift = bin.rshift
local band = bin.band
local dioVal = 0

while true do
  --Analog channels AIN0-13
  for i=1, 14 do
    if mbRead((i-1)*2, 3) > threshold[i] then
      bits_new[i]=1
    else
      bits_new[i]=0
    end
  end
  --Digital channels DIO0-22
  -- for i=15, 37 do
  --   bits_new[i] = mbRead((i-15)+2000, 0)
  -- end
  dioVal = MB.R(2800, 1)
  for i=0,22 do
    bits_new[i+15] = band(rshift(dioVal, i), 1)
  end

  --Compare bits_new to bits
  for i=1, 37 do
    if bits[i] ~= bits_new[i] then
      if edge[i] == 1 then
        if bits[i] == 0 then
          count[i] = count[i] + 1
          print ("Counter: ", i, " Rising: ", count[i])
        end
      else
        if bits[i] == 1 then
          count[i] = count[i] + 1
          print ("Counter: ", i, " Falling: ", count[i])
        end
      end
      bits[i] = bits_new[i]
      mbWrite(((i-1)*2)+46000, 3, count[i]) --Save in User RAM
    end
  end
end
