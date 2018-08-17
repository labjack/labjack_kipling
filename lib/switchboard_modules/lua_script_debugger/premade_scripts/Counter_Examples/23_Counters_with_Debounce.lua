--This program demonstrates how to configure counters, with debounce, using DIO
--channels. The debounce time for each counter will be between 20 and 40
--milliseconds. The debounce time is determined by the duration of the interval
--and when in the interval the first input is received.

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

print("Create and read 23 counters with debounce.")

local mbRead=MB.R               --Local functions for faster processing
local mbWrite=MB.W

if (mbRead(60000, 3) ~= 7) then
  print("This example is only for the T7. Exiting Lua Script.")
  mbWrite(6000, 1, 0)
end

--1 = Rising edge, 0 = falling
local edge = {}
edge[1] = 0
edge[2] = 0
edge[3] = 0
edge[4] = 0
edge[5] = 0
edge[6] = 0
edge[7] = 0
edge[8] = 0
edge[9] = 0
edge[10] = 0
edge[11] = 0
edge[12] = 0
edge[13] = 0
edge[14] = 0
edge[15] = 0
edge[16] = 0
edge[17] = 0
edge[18] = 0
edge[19] = 0
edge[20] = 0
edge[21] = 0
edge[22] = 0
edge[23] = 0

local bits = {}
local bits_new = {}
local count = {}
local debouncedCount = {}
--0 will mean that the counter has not recently been incremented
local recentIncr = {}

--The throttle setting can correspond roughly with the length of the Lua
--script. A rule of thumb for deciding a throttle setting is
--throttle = (3*NumLinesCode) + 20
local throttleSetting = 100    --Default throttle setting is 10 instructions
mbWrite(2600, 0, 0)  --FIO to input
mbWrite(2601, 0, 0)  --EIO to input
mbWrite(2602, 0, 0)  --COI to input
mbWrite(2603, 0, 0)  --MIO to input

LJ.setLuaThrottle(throttleSetting)
ThrottleSetting = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", throttleSetting)

for i=1, 23 do
  bits[i] = 0
  bits_new[i] = 99
  count[i] = 0
  debouncedCount[i] = 0
  recentIncr[i] = 0
end

LJ.IntervalConfig(0, 20)          --set interval to 20ms
local checkInterval=LJ.CheckInterval

while true do
  for i=1, 23 do
    bits_new[i] = mbRead((i-1)+2000, 0)
  end

  for i=1, 23 do
    if bits[i] ~= bits_new[i] then
      if edge[i] == 1 then
        if bits[i] == 0 then
          count[i] = count[i] + 1
        end
      else
        if bits[i] == 1 then
          count[i] = count[i] + 1
        end
      end
      bits[i] = bits_new[i]
    end
  end

  --update debounced counter
  if checkInterval(0) then   --interval completed
    for i=1, 23 do
      if recentIncr[i] == 0 then
        if count[i] > debouncedCount[i] then
          recentIncr[i] = 1
          debouncedCount[i] = debouncedCount[i] + 1
          count[i] = debouncedCount[i]
          if edge[i] == 1 then
            print ("Counter: ", i, " Rising: ", debouncedCount[i])
          else
            print ("Counter: ", i, " Falling: ", debouncedCount[i])
          end
          mbWrite(((i-1)*2)+46000, 3, debouncedCount[i]) --Save in User RAM
        end
      else
        count[i] = debouncedCount[i]
        recentIncr[i] = 0
      end
    end
  end
end
