--[[
    Name: unipolar_half_step.lua
    Desc: This example script was written as part of LabJack's "Stepper Motor
          Controller" App-Note.
    Note: There is an accompanying python script as well as a (Windows Only)
          LabVIEW example application that should be run in conjunction
          with this script:
            https://labjack.com/support/app-notes/digital-IO/stepper-motor-controller
--]]

print("Use the following registers:")
print("46080: Target Position (steps)")
print("46082: Current Position (steps)")
print("46180: enable, 1:enable, 0: disable")
print("46181: estop, 1: estop, 0: run")
print("46182: hold, 1: hold position of motor, 0: release motor (after movement)")
print("46183: sethome, (sethome)")
-- Enable/disable control
local enable = false
 -- Target location
local targ = 0
-- Position relative to the target
local pos = 0
-- Value read before setting I/O line states to immediately disengage motor
local estop = 0
-- Enable hold mode by default at end of a movement sequence
local hold = 1
-- Set new "zero" or "home"
local sethome = 0
local channela = "EIO0"
local channelb = "EIO1"
local channelc = "EIO4"
local channeld = "EIO5"
MB.writeName(channela, 0)
MB.writeName(channelb, 0)
MB.writeName(channelc, 0)
MB.writeName(channeld, 0)
--Define the Half Step Sequence
local a = {1,1,0,0,0,0,0,1} -- This is the control logic for line A
local b = {0,0,0,1,1,1,0,0} -- This is the control logic for line A'
local c = {0,1,1,1,0,0,0,0} -- This is the control logic for line B
local d = {0,0,0,0,0,1,1,1} -- This is the control logic for line B'
local numsteps =table.getn(a)
local i = 0
local m0, m1, m2, m3 = 0
-- Set initial USER_RAM values.
MB.writeName("USER_RAM1_I32", targ)
MB.writeName("USER_RAM0_I32", pos)
MB.writeName("USER_RAM0_U16", enable)
MB.writeName("USER_RAM1_U16", estop)
MB.writeName("USER_RAM2_U16", hold)
MB.writeName("USER_RAM3_U16", sethome)
-- Configure an interval for stepper motor control
LJ.IntervalConfig(0, 4)
-- Configure an interval for printing the current state
LJ.IntervalConfig(1, 1000)
while true do
  -- If a print interval is done
  if LJ.CheckInterval(1) then
    print("Current State", enable, target, pos, estop)
  end
  -- If a stepper interval is done
  if LJ.CheckInterval(0) then
    -- Read USER_RAM to determine if we should start moving
    enable = (MB.readName("USER_RAM0_U16") == 1)
    -- Read USER_RAM to get the desired target
    targ = MB.readName("USER_RAM1_I32")
    -- If the motor is allowed to move
    if enable then
      -- If we have reached the new position
      if pos == targ then
        -- Set enable to 0 to signal that the movement is finished
        enable = false
        MB.writeName("USER_RAM0_U16", 0)
        print("reached new pos")
        -- Determine if the motor should be "held in place"
        hold = MB.R(46182, 0)
        if hold == 0 then
          -- Set all low to allow free movement
          m0 = 0
          m1 = 0
          m2 = 0
          m3 = 0
        end
        -- Else if the motor should be held keep the same position activated
      -- If behind the target, go forward
      elseif pos < targ then
        pos = pos+1
        -- Lua is 1-indexed, so add a 1
        i = pos%numSteps+1
        -- Write the new positions
        m0 = a[i]
        m1 = b[i]
        m2 = c[i]
        m3 = d[i]
      -- If ahead of the target, move back
      elseif pos > targ then
        pos = pos-1
        i = pos%numSteps+1
        m0 = a[i]
        m1 = b[i]
        m2 = c[i]
        m3 = d[i]
      end
    -- If the motor is not enabled to move
    else
      -- Check again if the motor is enabled to move
      hold = MB.readName("USER_RAM2_U16")
      sethome = MB.readName("USER_RAM3_U16")
      -- If the home register is set to make a new home
      if sethome == 1 then
        print("New home created")
        MB.writeName("USER_RAM3_U16", 0)
        -- Make a new home
        pos = 0;
      end
      if hold == 0 then
        m0 = 0
        m1 = 0
        m2 = 0
        m3 = 0
      end
    end
    -- Save the current position to USER_RAM
    MB.writeName("USER_RAM0_I32", pos)
    estop = MB.readName("USER_RAM1_U16")
    if estop == 1 then
      m0 = 0; m1 = 0; m2 = 0; m3 = 0
    end
    MB.writeName(channela, m0)
    MB.writeName(channelb, m1)
    MB.writeName(channelc, m2)
    MB.writeName(channeld, m3)
  end
end
