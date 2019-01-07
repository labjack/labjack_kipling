--The loop runs at about 130 Hz, meaning that frequencies up to about 65 Hz can
-- be accurately counted.
--The index of each counter within an array is 1 more than its
-- associated counter.  E.g. counter 10 (AIN113) corresponds with an array
-- index of 11.
--Counters 0-3 correspond with AIN0-AIN3
--Counters 4-13 correspond with AIN107-116 as the following:
	--Counter:  4             Channel:  AIN107
	--Counter:  5             Channel:  AIN108
	--Counter:  6             Channel:  AIN109
	--Counter:  7             Channel:  AIN110
	--Counter:  8             Channel:  AIN111
	--Counter:  9             Channel:  AIN112
	--Counter:  10            Channel:  AIN113
	--Counter:  11            Channel:  AIN114
	--Counter:  12            Channel:  AIN115
	--Counter:  13            Channel:  AIN116
--Counters 14-36 correspond with DIO0-22 as the following:
	--Counter:  14            Channel:  FIO0  (DIO0)
	--Counter:  15            Channel:  FIO1  (DIO1)
	--Counter:  16            Channel:  FIO2  (DIO2)
	--Counter:  17            Channel:  FIO3  (DIO3)
	--Counter:  18            Channel:  FIO4  (DIO4)
	--Counter:  19            Channel:  FIO5  (DIO5)
	--Counter:  20            Channel:  FIO6  (DIO6)
	--Counter:  21            Channel:  FIO7  (DIO7)
	--Counter:  22            Channel:  EIO0  (DIO8)
	--Counter:  23            Channel:  EIO1  (DIO9)
	--Counter:  24            Channel:  EIO2  (DIO10)
	--Counter:  25            Channel:  EIO3  (DIO11)
	--Counter:  26            Channel:  EIO4  (DIO12)
	--Counter:  27            Channel:  EIO5  (DIO13)
	--Counter:  28            Channel:  EIO6  (DIO14)
	--Counter:  29            Channel:  EIO7  (DIO15)
	--Counter:  30            Channel:  CIO0  (DIO16)
	--Counter:  31            Channel:  CIO1  (DIO17)
	--Counter:  32            Channel:  CIO2  (DIO18)
	--Counter:  33            Channel:  CIO3  (DIO19)
	--Counter:  34            Channel:  MIO0  (DIO20)
	--Counter:  35            Channel:  MIO1  (DIO21)
	--Counter:  36            Channel:  MIO2  (DIO22)
--Counters 37-47 correspond with AIN117-AIN127 as the following:
	--Counter:  37            Channel:  AIN117
	--Counter:  38            Channel:  AIN118
	--Counter:  39            Channel:  AIN119
	--Counter:  40            Channel:  AIN120
	--Counter:  41            Channel:  AIN121
	--Counter:  42            Channel:  AIN122
	--Counter:  43            Channel:  AIN123
	--Counter:  44            Channel:  AIN124
	--Counter:  45            Channel:  AIN125
	--Counter:  46            Channel:  AIN126
	--Counter:  47            Channel:  AIN127
--Counters 48-106 correspond with AIN48-106

print("Create and read 107 counters.")

local mbRead=MB.R               --Local functions for faster processing
local mbWrite=MB.W

if (mbRead(60000, 3) ~= 7) then
  print("This example is only for the T7. Exiting Lua Script.")
  mbWrite(6000, 1, 0)
end

local threshold = {}

for i=1, 107 do
	--Thresholds can be changed to be specific to each analog input
	threshold[i] = 1.4
end

--1 = Rising edge, 0 = falling
local edge = {}
for i=1, 107 do
	edge[i] = 0 --sets all 107 counters to increment on falling edges
end

local bits = {}
local bits_new = {}
local count = {}

--The throttle setting can correspond roughly with the length of the Lua
--script. A rule of thumb for deciding a throttle setting is
--throttle = (3*NumLinesCode) + 20
local throttleSetting = 100    --Default throttle setting is 10 instructions
LJ.setLuaThrottle(throttleSetting)
ThrottleSetting = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", throttleSetting)

mbWrite(2600, 0, 0)  --FIO to input
mbWrite(2601, 0, 0)  --EIO to input
mbWrite(2602, 0, 0)  --COI to input
mbWrite(2603, 0, 0)  --MIO to input

mbWrite(43903, 0, 1) --AIN_ALL_RESOLUTION_INDEX to 1
mbWrite(6006, 1, 37)

for i=1, 107 do
  bits[i] = 0
  bits_new[i] = 99
  count[i] = 0
end

while true do
  --Analog channels AIN0-AIN3
  for i=1, 4 do
    if mbRead((i-1)*2, 3) > threshold[i] then
      bits_new[i]=1
    else
      bits_new[i]=0
    end
  end
  --Analog channels AIN107-AIN116
  for i=5, 14 do
    if mbRead((i+102)*2, 3) > threshold[i] then
      bits_new[i]=1
    else
      bits_new[i]=0
    end
  end
  --Digital channels DIO0-22
  for i=15, 37 do
    bits_new[i] = mbRead((i-15)+2000, 0)
  end
  --Analog channels AIN117-AIN127
  for i=38, 48 do
    if mbRead((i+79)*2, 3) > threshold[i] then
      bits_new[i]=1
    else
      bits_new[i]=0
    end
  end
  --Analog channels AIN48-AIN106
  for i=49, 107 do
    if mbRead((i-1)*2, 3) > threshold[i] then
      bits_new[i]=1
    else
      bits_new[i]=0
    end
  end

  --Compare bits_new to bits
  for i=1, 107 do
    if bits[i] ~= bits_new[i] then
      if edge[i] == 1 then
        if bits[i] == 0 then
          count[i] = count[i] + 1
          print ("Counter: ", i-1, " Rising: ", count[i])
        end -- ==0
      else
        if bits[i] == 1 then
          count[i] = count[i] + 1
          print ("Counter: ", i-1, " Falling: ", count[i])
        end
      end
      bits[i] = bits_new[i]
      if i<100 then --Only the first 100 counters can be saved in User RAM
        mbWrite(((i-1)*2)+46000, 3, count[i])
      end
    end
  end
end
