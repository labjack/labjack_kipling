from labjack import ljm
import time
import atexit, math, sys, getopt
from array import array

TARGET_POSITION_REG = 46080
CURRENT_POSITION_REG = 46082

ENABLE_REG = 46180
ESTOP_REG = 46181
HOLD_REG = 46182
RE_ZERO_TARGET_REG = 46183

def closeFunc():
    print("Closing")
    ljm.eWriteName(handle, "LUA_RUN", 0)
    waitingForStop = True
    while waitingForStop:
        print ("Waiting for script to stop...")
        waitingForStop = ljm.eReadName(handle, "LUA_RUN") == 1

    ljm.close(handle)

# Add an exit handler to close a device.
atexit.register(closeFunc)

# ----------------- Begin Defining Stepper Motor Functions ----------------------------
def moveTo(a):
    ljm.eWriteAddress(handle, TARGET_POSITION_REG, 2, a)#write the new position to USER_RAM0_I32
    ljm.eWriteAddress(handle, ENABLE_REG, 0, 1)#Enable the drive (USER_RAM0_U16)
    print(a)
def setHome():
    ljm.eWriteAddress(handle, RE_ZERO_TARGET_REG, 0, 1)#signal to set new home (USER_RAM3_U16)
def setHold(hold):
    ljm.eWriteAddress(handle, HOLD_REG, 0, hold) #(USER_RAM2_U16)
def updateEStop(eStop):
    ljm.eWriteAddress(handle, ESTOP_REG, 0, eStop)
def getPosition():
    return eReadAddress(handle, CURRENT_POSITION_REG, 2)
def waitForMove():
    waiting = True
    while waiting:
        # print("Current Position", getPosition())

        # Wait for "enable" flag to go to 0 indicating that movement has finished.
        waiting = ljm.eReadAddress(handle, ENABLE_REG, 0) == 1
# ----------------- End Defining Stepper Motor Functions ----------------------------

# ----------------- Begin Defining Lua Script Loading Functions ----------------------------
def readLuaScriptFile(fileName):
    fileText = ""
    try:
        print("Opening File: " + str(fileName))
        fileObj = open("./"+fileName, "r")
        fileText = fileObj.read()
    except IOError:
        print "Error: File does not exist"
        sys.exit(0)
    return fileText + "\n\n\0\0\0"
def loadAndStartScript(fileName):
    ljm.eWriteName(handle, "LUA_RUN", 0)
    waitingForStop = True
    while waitingForStop:
        print ("Waiting for script to stop...")
        waitingForStop = ljm.eReadName(handle, "LUA_RUN") == 1

    # Enable debug output
    ljm.eWriteName(handle, "LUA_DEBUG_ENABLE", 1);

    print ("Loading file: " + str(fileName))
    scriptText = readLuaScriptFile(fileName)
    ljm.eWriteName(handle, "LUA_SOURCE_SIZE", len(scriptText))
    ljm.eWriteNameByteArray(handle, "LUA_SOURCE_WRITE", len(scriptText), array('B',scriptText))
    ljm.eWriteName(handle, "LUA_RUN", 1)
    while waitingForStop:
        print ("Waiting for script to start...")
        waitingForStop = ljm.eReadName(handle, "LUA_RUN") == 0

# ----------------- End Defining Lua Script Loading Functions ----------------------------

# Load the script into the luaScript variable
luaScriptFileName = "unipolar_full_step.lua"
luaScript = ""

if len(sys.argv) > 1:
    print sys.argv
    if sys.argv[1] == "full-step":
        print ("Running in full-step mode")
        luaScriptFileName = "unipolar_full_step.lua"
    elif sys.argv[1] == "half-step":
        print ("Running in half-step mode")
        luaScriptFileName = "unipolar_half_step.lua"
    else:
        print ("Welcome to the LabJack unipolar stepper motor controller example")
        print ("Run the program passing in 'full-step' as the first argument to run in full-step mode")
        print ("python \"sweeping program.py\" full-step")
        print ("Run the program passing in 'half-step' as the first argument to run in half-step mode")
        print ("python \"sweeping program.py\" half-step")
        sys.exit()


# Open first found LabJack
handle = ljm.openS("ANY", "USB", "ANY")
#handle = ljm.openS("T4", "Ethernet", "440010990")
# handle = ljm.openS("T7", "Ethernet", "470010414")

info = ljm.getHandleInfo(handle)
print("LJ Found")
print("Use Ctrl+C to Cancel")

# Load a Lua Script
print("Loading and starting lua script")
loadAndStartScript(luaScriptFileName)

positive = False
chunks = 4;
stepsPerChunk = 50;
waitBetweenSteps = 1

setHome()
setHold(0);#this is reccommended to use for bench tests. Keeping the stepper "holding" a position can generate a lot of heat in the stepper
while True:
    for i in range(chunks):
        moveTo(i*stepsPerChunk)
        waitForMove()
        time.sleep(waitBetweenSteps)
    for i in range(chunks, -1, -1):
        moveTo(i*stepsPerChunk)
        waitForMove()
        time.sleep(waitBetweenSteps)
    moveTo(400)
    waitForMove()
    time.sleep(waitBetweenSteps)
    moveTo(0)
    waitForMove()
    
    