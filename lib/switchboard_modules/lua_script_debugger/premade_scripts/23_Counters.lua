--This program demonstrates how to use digital lines as simple counters.
--Most commonly users should throttle their code execution using the functions:
--'LJ.IntervalConfig(0, 1000)', and 'if LJ.CheckInterval(0) then' ...

--Array indeces 1-23 correspond with DIO0-22 as the following:
  --Index:  1             Channel:  FIO0  (DIO0)
  --Index:  2             Channel:  FIO1  (DIO1)
  --Index:  3             Channel:  FIO2  (DIO2)
  --Index:  4             Channel:  FIO3  (DIO3)
  --Index:  5             Channel:  FIO4  (DIO4)
  --Index:  6             Channel:  FIO5  (DIO5)
  --Index:  7             Channel:  FIO6  (DIO6)
  --Index:  8             Channel:  FIO7  (DIO7)
  --Index:  9             Channel:  EIO0  (DIO8)
  --Index:  10            Channel:  EIO1  (DIO9)
  --Index:  11            Channel:  EIO2  (DIO10)
  --Index:  12            Channel:  EIO3  (DIO11)
  --Index:  13            Channel:  EIO4  (DIO12)
  --Index:  14            Channel:  EIO5  (DIO13)
  --Index:  15            Channel:  EIO6  (DIO14)
  --Index:  16            Channel:  EIO7  (DIO15)
  --Index:  17            Channel:  CIO0  (DIO16)
  --Index:  18            Channel:  CIO1  (DIO17)
  --Index:  19            Channel:  CIO2  (DIO18)
  --Index:  20            Channel:  CIO3  (DIO19)
  --Index:  21            Channel:  MIO0  (DIO20)
  --Index:  22            Channel:  MIO1  (DIO21)
  --Index:  23            Channel:  MIO2  (DIO22)

print("Create and read 23 counters.")

local mbRead=MB.R               --Local functions for faster processing
local mbWrite=MB.W

--1 = Rising edge, 0 = falling
local edge = {}
for i = 1, 23 do
  edge[i] = 0 --sets all 23 counters to increment on falling edges
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

for i=1, 23 do
  bits[i] = 0
  bits_new[i] = 99
  count[i] = 0
end

while true do
  for i=1, 23 do
    bits_new[i] = mbRead((i-1)+2000, 0)
  end

  --Compare bits_new to bits
  for i=1, 23 do
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