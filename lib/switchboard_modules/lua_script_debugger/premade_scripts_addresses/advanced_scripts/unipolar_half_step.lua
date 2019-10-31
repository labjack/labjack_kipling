-- The unipolar_half_step example script was written as part of LabJack''s 
-- "Stepper Motor Controller" App-Note. There is an accompanying python script 
-- as well as a (Windows Only) LabVIEW example application that should be run
-- in conjunction wth this script.
-- See: https://labjack.com/support/app-notes/digital-IO/stepper-motor-controller

print("Use the following registers:")
print("46080: Target Position (steps)")
print("46082: Current Position (steps)")

print("46180: enable, 1:enable, 0: disable")
print("46181: eStop, 1: eStop, 0: run")
print("46182: hold, 1: hold position of motor, 0: release motor (after movement)")
print("46183: setHome, (setHome)")

local mbR = MB.R
local mbW = MB.W

-- Configurable Variables
local enable = false -- 46180, "USER_RAM0_U16", type: 0; enable/disable control.
local targ = 0 -- 46080, "USER_RAM1_I32", type: 2
local pos = 0 -- 46082, "USER_RAM0_I32", type: 2
local eStop = 0 -- 46181, "USER_RAM1_U16", type: 0; Value read before setting I/O line states to immediately disengage motor.
local hold = 1 -- 46182, "USER_RAM2_U16", type: 0;Enable hold mode by default at end of movement sequence.
local setHome = 0 -- 46183, "USER_RAM3_U16", type: 0; Set new "zero" or "home"


-- Define FIO Channels
local chA = 2008--EIO0
local chB = 2009--EIO1
local chC = 2012--EIO4
local chD = 2013--EIO5
mbW(chA, 0, 0) --EIO0 =  DIO8
mbW(chB, 0, 0) --EIO1 =  DIO9
mbW(chC, 0, 0) --EIO4 = DIO12
mbW(chD, 0, 0) --EIO5 = DIO13

--Define the Half Step Sequence
local a = {1,1,0,0,0,0,0,1} -- This is the control logic for line A
local b = {0,0,0,1,1,1,0,0} -- This is the control logic for line A''
local c = {0,1,1,1,0,0,0,0} -- This is the control logic for line B
local d = {0,0,0,0,0,1,1,1} -- This is the control logic for line B''
local numSteps =table.getn(a)

local i = 0
local m0, m1, m2, m3 = 0

-- Set initial USER_RAM values.
mbW(46080, 2, targ)
mbW(46082, 2, pos)
mbW(46180, 0, enable)
mbW(46181, 0, eStop)
mbW(46182, 0, hold)
mbW(46183, 0, setHome) -- Initialize variable used for the Re-Zero "target"/Motor control.

LJ.IntervalConfig(0, 4) -- For stepper motor control
LJ.IntervalConfig(1, 1000) -- For printing current state

while true do
  if LJ.CheckInterval(1) then
    print("Current State", enable, target, pos, eStop)
  end

  if LJ.CheckInterval(0) then

    enable = (mbR(46180, 0) == 1) -- Determine if we should start moving.
    targ = mbR(46080, 2) -- Read desired "target"

    if enable then -- if allowed to move
      if pos == targ then--if we have reached the new position

        --write enable to 0 to signal finished
        enable = false
        mbW(46180, 0, 0)

        print("reached new pos")

        -- Determine if motor should be "held in place"
        hold = mbR(46182, 0)
        if hold == 0 then
          --set all low to allow free movement
          m0 = 0
          m1 = 0
          m2 = 0
          m3 = 0
        end
        --else if hold then keep the same position activated
        
      elseif pos < targ then -- if behind, go foreward
        pos = pos+1--increment position by 1
        i = pos%numSteps+1--lua is 1-indexed, so add a 1
        
        m0 = a[i]--write the new positions
        m1 = b[i]
        m2 = c[i]
        m3 = d[i]
        
      elseif pos > targ then-- if ahead, move back
        pos = pos-1
        i = pos%numSteps+1
        m0 = a[i]
        m1 = b[i]
        m2 = c[i]
        m3 = d[i]
      end
    else -- if not enable
      hold = mbR(46182, 0)
      setHome = mbR(46183, 0)

      if setHome == 1 then-- if home register is set to make a new home
        print("New home created")
        mbW(46183, 0, 0)
        pos = 0;--make a new home
      end

      if hold == 0 then
        m0 = 0
        m1 = 0
        m2 = 0
        m3 = 0
      end
    end

    -- Update variable with current position
    mbW(46082, 2, pos)

    eStop = mbR(46181, 0)
    if eStop == 1 then
      m0 = 0; m1 = 0; m2 = 0; m3 = 0
    end

    mbW(chA, 0, m0) --EIO0 =  DIO8
    mbW(chB, 0, m1) --EIO1 =  DIO9
    mbW(chC, 0, m2) --EIO2 = DIO10
    mbW(chD, 0, m3) --EIO3 = DIO11
  end
end
