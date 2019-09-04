-- This is an example showing how to configure analog input settings on
-- on T-Series devices.
print("Configure & Read Analog Input")

ainChannels = {0,1} -- Read AIN0 and AIN1
ainRange = 10 -- +/-10V
ainResolution = 1 -- Fastest
ainSettling = 0 -- Default

-- This function can be used to configure general analog input settings such as
-- Range, Resolution, and Settling.  More information about these settings can
-- be found on the LabJack website under the AIN section:
-- https://labjack.com/support/datasheets/t-series/ain
function ainChConfig(ainChNum, range, resolution, settling, isDifferential)
    MB.W(40000 + ainChNum * 2, 3, range) -- Set AIN Range
    MB.W(41500 + ainChNum * 1, 0, resolution) -- Set Resolution Index
    MB.W(42000 + ainChNum * 2, 3, settling) -- Set Settling US

    dt = MB.R(60000, 3) -- Read device type
    if isDifferential and (ainChNum%2 == 0) and (dt == 7) then
        -- The negative channels setting is only valid for even
        -- analog input channels and is not valid for the T4.
        if (ainChNum < 14) then
            -- The negative channel is 1+ the channel for AIN0-13 on the T7
            MB.W(41000 + ainChNum, 0, ainChNum + 1)
        elseif (ainChNum > 47) then
            -- The negative channel is 8+ the channel for AIN48-127 on the T7
            -- when using a Mux80.
            -- https://labjack.com/support/datasheets/accessories/mux80
            MB.W(41000 + ainChNum, 0, ainChNum + 8)
        else
            print(string.format("Can not set negative channel for AIN%d",ainChNum))
        end
    end
end

-- Configure each analog input
for i=1,table.getn(ainChannels) do
    ainChConfig(ainChannels[i], ainRange, ainResolution, ainSettling)
end

LJ.IntervalConfig(0, 500) -- Configure interval
local checkInterval=LJ.CheckInterval

while true do
  if checkInterval(0) then -- interval finished
    -- Read & Print out each read AIN channel
    for i=1, table.getn(ainChannels) do
        ainVal = MB.R(ainChannels[i] * 2, 3)
        print(string.format("AIN%d: %.3f", ainChannels[i], ainVal))
    end
  end
end