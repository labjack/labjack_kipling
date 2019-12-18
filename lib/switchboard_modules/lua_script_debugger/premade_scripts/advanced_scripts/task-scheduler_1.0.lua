--[[
    Name: task-scheduler_1.0.lua
    Desc: This script demonstrates a simple task scheduler used to execute
          multiple tasks at regular intervals to 1ms resolution
    Note: Requires Firmware 1.0199 or higher (for T7)

          Increase scheduler resolution to reduce CPU load on the T7 processor
--]]

-------------------------------------------------------------------------------
-- Desc:  Task function definitions
-- Note:  Define tasks to run as individual functions.  Task functions must be
--        defined in the task table and executed by the task scheduler.
-------------------------------------------------------------------------------
func1 = function (args)
    print("Function1 Executed --")
    -- Add functional code here.  Parameters may be passed thorugh the args
    -- variable as an array.
    return 0
end

func2 = function (args)
    print("Function2 Executed --")
    -- Add functional code here.  Parameters may be passed thorugh the args
    -- variable as an array.
    return 0
end


print("LabJack Lua Task Scheduler Example. Version 1.0")
-- Directions:
-- 1.  Define user functions as required.
-- 2.  Build scheduler table for each function that is executed at regular
--     intervals.  Each row int the scheduler table corresponds to one function
-- 3.  Define function parameters in the scheduler table as required
--         [n][0] - Function name (string)
--         [n][1] - Initial execution delay time.  Set to nonzero value to
--                  delay initial function execution.  Function will execute at
--                  regular internals after the initial delay has elapsed
--         [n][2] - Function period in milliseconds
--         [n][3] - Optional parameters to pass to the function if necessary.
--                  Pass array if multiple parameters are required


-- Number of functions being executed in the scheduler
-- Must equal the number of a function defined in the scheduler table
local numfuncs = 2
-- Allowable number of scheduler tics beyond function period before posting
-- a warning
local msgthreshold = 1
local intervalcount = 0

local schedule = {}
-- New row (1 row per function)
schedule[0] = {}
-- New row (1 row per function)
schedule[1] = {}

-- Function1 name
schedule[0][0] = "func1"
-- Function1 counter. The function will execute when this value equals zero.
-- Set to a positive nonzero number to set the delay before first execution
schedule[0][1] = 10
-- Function1 period
schedule[0][2] = 50
-- Function1 parameters (if required)
schedule[0][3] = {}

-- Function2 name
schedule[1][0] = "func2"
-- Function2 counter. The function will execute when this value equals zero.
-- Set to a positive nonzero number to set the delay before first execution
schedule[1][1] = 10
-- Function2 period
schedule[1][2] = 500
-- Function2 parameters (if required)
schedule[1][3] = {}
-- Define the scheduler resolution (1 ms).  Increase if necessary
LJ.IntervalConfig(0, 1)
local test = 0

-------------------------------------------------------------------------------
-- Desc:  Task Scheduler
-- Note:  No need to modify the scheduler main loop. The scheduler will execute
--        any number of tasks defined in the task table.
-------------------------------------------------------------------------------
while true do
  -- Save the count to catch missed interval servicing
  intervalcount = LJ.CheckInterval(0)
  if (intervalcount) then
    -- Decrement function counters and determine if a function needs to run.
    for i=0,numfuncs-1,1 do
      -- Decrement function counter variable. LJ.CheckInterval returns the
      -- number of elapsed intervals since last check. In most cases interval
      -- count will normally equal 1, unless some delay causes
      -- script to go multiple intervals between checks. Adjust function
      -- counter accordingly to maintain function timing
      local delay = intervalcount - schedule[i][1]
      schedule[i][1] = schedule[i][1] - intervalcount
      -- Call a function when counter reaches zero.
      if(schedule[i][1] <= 0) then
        -- Post a message if we see the function execution time was delayed too long
        if (schedule[i][1] < 0) then
          print("Warning:  Function", i,  "delayed by", delay, "ms")
        end
        -- Execute Task
        --_G["func1"](params{})
        -- Call the function from the global namespace
        _G[schedule[i][0]](schedule[1][3])
        -- Reset the function counter
        schedule[i][1] = schedule[i][2]
      end
    end
  end
end