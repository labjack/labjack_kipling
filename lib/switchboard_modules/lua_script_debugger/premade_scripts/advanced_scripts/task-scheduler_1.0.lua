print("LabJack Lua Task Scheduler Example. Version 1.0")
-- Requires Firmware 1.0199 or higher (for T7)
-- This script demonstrates a simple task scheduler used to execute multiple tasks
-- at regular intervals to 1ms resolution.
-- Note:  Increase scheduler resolution to reduce CPU load on the T7 processor.
-- Directions:
-- 1.  Define user functions as required.
-- 2.  Build scheduler table for each function that is executed at regular 
--     intervals.  Each row int the scheduler table corresponds to one function.
-- 3.  Define function parameters in the scheduler table as required
--         [n][0] - Function name (string)
--         [n][1] - Initial execution delay time.  Set to nonzero value to delay 
--                  initial function execution.  Function will execute at regular 
--                  internals after the initial delay has elapsed.
--         [n][2] - Function period in milliseconds.
--         [n][3] - Optional parameters to pass to the function if necessary.  
--                  Pass array if multiple parameters are required.

local NumFuncs = 2                      -- Number of functions being executed in scheduler.  Must equal number of fuction defined in the scheduler table.
local MsgThresh = 1                     -- Allowable number of scheduler tics beyond function period before posting a warning. 
local IntvlCnt = 0

local SchTbl = {}                       -- Empty table
SchTbl[0] = {}                    -- New row (1 row per function)
SchTbl[1] = {}                    -- New row (1 row per function)

SchTbl[0][0] = "Func1"            -- Function1 name
SchTbl[0][1] = 10                 -- Function1 counter.  Function will execute when this value equals zero.  Set to positive nonzero number to set delay before first execution.
SchTbl[0][2] = 50                 -- Function1 period
SchTbl[0][3] = {}                 -- Function1 parameters (if required)

SchTbl[1][0] = "Func2"            -- Function2 name
SchTbl[1][1] = 10                 -- Function2 counter.  Function will execute when this value equals zero.  Set to positive nonzero number to set delay before first execution.
SchTbl[1][2] = 500                -- Function2 period
SchTbl[1][3] = {}                 -- Function2 parameters (if required)

LJ.IntervalConfig(0, 1)           --Define scheduler resolution (1 ms).  Increase if necessary.
local checkInterval=LJ.CheckInterval

local Test = 0

--==============================================================================
-- Task function definitions
-- Define tasks to run as individual functions.  Task functions must be defined
-- in the task table and executed by the task scheduler.
--==============================================================================

Func1 = function (args)
    print("Function1 Executed --")
    -- Add functional code here.  Parameters may be passed thorugh the args 
    -- variable as an array.
    return 0
  end
  
Func2 = function (args)
    print("Function2 Executed !!")
    -- Add functional code here.  Parameters may be passed thorugh the args 
    -- variable as an array.
    return 0
  end
--==============================================================================

--==============================================================================
-- Task Scheduler
-- Note:  No need to modify the scheduler main loop.  Scheduler will exeute 
--        any number of tasks, defined in the task table.
--==============================================================================
while true do
  
  IntvlCnt = checkInterval(0)  -- Save interval count to catch missed interval servicing.
  
  if (IntvlCnt) then
    
    -- Decrement function counters and determine if a function needs to run.
    for i=0,NumFuncs-1,1 do
      
      -- Decrement function counter variable.  LJ.CheckINterval returns the number
      -- of elapsed intervals since last check.  In most cases Intvlcnt will normally
      -- equal 1, unless some delay causes script to go multiple intervals between
      -- checks.  Adjust function counter accordingly to maintain function timing.
      local delay = IntvlCnt - SchTbl[i][1]
      SchTbl[i][1] = SchTbl[i][1] - IntvlCnt   
    
      -- Call function when counter reaches zero.
      if(SchTbl[i][1] <= 0) then
        -- Post a message if we see the function execution time was delayed too long
        if (SchTbl[i][1] < 0) then
          print("Warning:  Function", i,  "delayed by", delay, "ms")
        end
        
        -- Execute Task
        --_G["Func1"](params{})
        _G[SchTbl[i][0]](SchTbl[1][3])   -- Call function from the global namespace
        SchTbl[i][1] = SchTbl[i][2]      -- Reset function counter
      end
    end  
  end
end
--==============================================================================