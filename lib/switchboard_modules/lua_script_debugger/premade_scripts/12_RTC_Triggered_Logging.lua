print("Log voltage of AIN1 to file every 10 minutes. RTC value checked every 1000ms.")
--Requires micro SD Card installed inside the T7 or T7-Pro.
--Requires FW 1.0150 or newer.
--T7 uSD card. http://labjack.com/support/datasheets/t7/sd-card
--Timestamp (real-time-clock) available on T7-Pro only
--Note that as of Firmware v1.0150, some SD cards do not work.
--Check for the latest firwmare updates http://labjack.com/support/firmware/t7/beta

local mbRead=MB.R			--local functions for faster processing
local mbWrite=MB.W
local mbReadArray=MB.RA

local Filepre = "RTWi_"
local Filesuf = ".csv"
local NumFn = 0
local Filename = Filepre..string.format("%02d", NumFn)..Filesuf
local voltage = 0
local Modulo = 0


local delimiter = ","
local dateStr = ""
local voltageStr = ""
local f = nil

local RTCPollinterval = 1000    --interval in ms, 1000 for 1000ms
local PollsPerMinute = 60       --60 RTC polls per minute, since each is 1000ms
local Loginterval_min = 10      --10 for 10 minute interval
local PollCount = 0
local Minute = 0                --a variable for the minutes from the RTC

local dateTbl = {}
dateTbl[1] = 0    --year
dateTbl[2] = 0    --month
dateTbl[3] = 0    --day
dateTbl[4] = 0    --hour
dateTbl[5] = 0    --minute
dateTbl[6] = 0    --second


mbWrite(48005,0,1)                         --ensure analog is on

LJ.IntervalConfig(0, RTCPollinterval)       
local checkInterval=LJ.CheckInterval
local checkFileFlag=LJ.CheckFileFlag
f = io.open(Filename, "r")
if f ~= nil then
  f:close()
  f = io.open(Filename, "a+")           --File exists, Append to file
  print ("Appending to file")
else
  f = io.open(Filename, "w")            --Create or replace file
  print ("Creating new file")
end


while true do
  if checkInterval(0) then           --RTC polling interval completed
    local fg = 0
    dateTbl, error = mbReadArray(61510, 0, 6) --Read the RTC timestamp, -Pro only
    dateStr = string.format("%04d/%02d/%02d %02d:%02d.%02d", dateTbl[1], dateTbl[2], dateTbl[3], dateTbl[4], dateTbl[5], dateTbl[6])
    print("DateTime: ", dateStr)
    Minute = dateTbl[5]
    Modulo = Minute - math.floor(Minute/Loginterval_min)*Loginterval_min
    PollCount = PollCount + 1
    print ("RTC poll events since last save: ", PollCount)
    fg = checkFileFlag()           --host software wants to read LUAs active file? W 1 to address 6500, U32
    if fg == 1 then
      NumFn = NumFn + 1               --increment filename
      Filename = Filepre..string.format("%02d", NumFn)..Filesuf
      f:close()
      LJ.ClearFileFlag()              --inform host that previous file is available. R 0 from address 6500, U32
      f = io.open(Filename, "w")      --create or replace new file
      print ("Command issued by host to create new file")
    end
    if Modulo == 0 and PollCount > PollsPerMinute then         --minutes digit matches rollover condition -> log to file
      PollCount = 0                     --reset the PollCount
      voltage = mbRead(2, 3)              --voltage on AIN1, address is 2, type is 3
      print("AIN1: ", voltage, "V")
      voltageStr = string.format("%.6f", voltage)
      stringResult = dateStr..delimiter..voltageStr.."\n"
      print ("Appending to file")
      f:write(stringResult)
    end
  end
end