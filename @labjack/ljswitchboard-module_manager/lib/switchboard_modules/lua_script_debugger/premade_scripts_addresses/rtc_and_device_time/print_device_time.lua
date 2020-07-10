print("Read the real-time-clock RTC, print the timestamp.")
local hardware = MB.R(60010, 1)
if(bit.band(hardware, 4) ~= 4) then
  print("This Lua script requires a Real-Time Clock (RTC), but an RTC is not detected. These modules are only preinstalled on the T7-Pro, and cannot be added to the T7 or T4. Script Stopping")
  MB.W(6000, 1, 0)--stop script
end
--The RTC is only included on the -Pro variant of the T7
--Address 61510 has the timestamp in a format that can be read by Lua scripts
--Address 61500 should not be used due to truncation during conversion from u32 to float
--Requires FW 1.0128 or newer

local table = {}
table[1] = 0    --year
table[2] = 0    --month
table[3] = 0    --day
table[4] = 0    --hour
table[5] = 0    --minute
table[6] = 0    --second

local mbReadArray=MB.RA
LJ.IntervalConfig(0, 500)
local checkInterval=LJ.CheckInterval
while true do
  if checkInterval(0) then
    table, error = mbReadArray(61510, 0, 6)
    print(string.format("%04d/%02d/%02d %02d:%02d.%02d", table[1], table[2], table[3], table[4], table[5], table[6]))
    -- print("Year: ", table[1])
    -- print("Month: ", table[2])
    -- print("Day: ", table[3])
    -- print("Hour: ", table[4])
    -- print("Minute:", table[5])
    -- print("Second:", table[6])
    -- print("\n")
  end
end