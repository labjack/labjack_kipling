This example demonstrates low power logging. Two buttons are used to control the operation of the script. When FIO0 is low the script will dump the file contents to the debugging log. When FIO1 is low the script will put the T7 into low power mode. When in low power mode measurements will continue, but the connection to the computer will be lost. When FIO1 returns high the core speed will be set to 80MHz and hte USB connection will be restored.

Note that the debug buffer is only 1024 bytes so some file data may not be displayed.



MB.W(43990, 0, 1)  --Set analog to nominal cali. REMOVE THIS!
FileName = "log1.csv"

function LowPowerInit()
  MB.W(48001, 0, 0)        --Set core to 80 MHz
  MB.W(48006, 0, 4)        --Set LEDs to manual
  MB.W(48003, 0, 0)        --Turn off Ethernet
  MB.W(48005, 0, 0)        --Turn off Analog
  MB.W(48004, 0, 0)        --Turn off wifi
  MB.W(2990, 0, 0)          --Set LEDs to off
  MB.W(2991, 0, 0)          --

  --Wifi will take some time to turn off ~4s. During this time
  -- external flash and the micro SD can not be accessed.
  -- wait until wifi is fully powered down.
  print("Waiting for WiFi to shut down...")
  while math.abs(MB.R(49450, 1) - 2903.000) > 0.1 do  end
end

function FIO0_Check()
  FIO0_State = MB.R(2000, 0)

  if FIO0_State == 0 then
    MB.W(48002, 0, 0)       --Turn off USB
    MB.W(48001, 0, 3)       --Drop core to 250 kHz
  else
    MB.W(48001, 0, 0)       --Raise core to 80 MHz
    MB.W(48002, 0, 1)       --Turn on USB
  end
end

function FIO1_Check()
  FIO1_State = MB.R(2001,0)

  if FIO1_State == 0 then
    LogFile = assert(io.open(FileName, "r"))
    local line = LogFile:read("*all")
    LogFile :close()

    print("Dumping file contents:") --Note: buffer is only 1024 bytes
    print(line)
    print("-End of file data-")
  end
end

count = 0
function Measure()
  MB.W(48001, 0, 0)         --Set core to 80 MHz
  MB.W(48005, 0, 1)         --Turn on Analog
  
  temp = MB.R(60050,3)  --Read something

  print(string.format("%04i", count), temp)
  count = count + 1
  LogFile = assert(io.open(FileName, "a"))
  LogFile :write(string.format("%.6f\r\n", temp))
  LogFile :close()

  MB.W(48005, 0, 0)         --Turn off Analog
end




LowPowerInit()
LJ.IntervalConfig(0, 1000)
print("Beginning Test")
MB.W(48001, 0, 1)

LogFile = assert(io.open(FileName, "w+")) --Overwrite old file
LogFile :write("-Start of data log-\r\n")
LogFile :close()

while true do
  if LJ.CheckInterval(0) then
    MB.W(2991, 0, 1)                  --Blink the green led

    Measure(LogFile)
    FIO0_Check()
    FIO1_Check(LogFile)

    MB.W(2991, 0, 0)
  end
end