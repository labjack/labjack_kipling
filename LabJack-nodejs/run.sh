#!/bin/sh
clear #clears the command line screen

#Accepts Two args & executes the testMe.js node program:
#Arg1: true/false.  true=async, false=blocking
#Arg2: test number, see testMe.js for test descriptions

#First perform logic to check the number of command line arguments, do something different if there are 0 args
if [ $# -eq 0 ]
then
	#echo "There are $# args."
	echo "./testMe.js --testNum=0 --async=true"
	./testMe.js --testNum=0 --async=true
else
	if [ $# -eq 2 ]
	then
		#Command for running various unit tests
		if [ $1 = "test" ]
		then
			TEST_DIR="/LabJackDriver_Testing"
			DEVICE_TEST="$TEST_DIR/device_test.js"
			DRIVER_TEST="$TEST_DIR/driver_test.js"
			JSON_CONSTANTS_PARSER_TEST="$TEST_DIR/json_constants_parser_test.js"
			if [ $2 = "device" ]
			then
				nodeunit $DEVICE_TEST
			fi
			if [ $2 = "driver" ]
			then
				nodeunit $DRIVER_TEST
			fi
			if [ $2 = "constantsParser" ]
			then
				nodeunit $JSON_CONSTANTS_PARSER_TEST
			fi
			if [ $2 = "all" ]
			then
				nodeunit $JSON_CONSTANTS_PARSER_TEST
				nodeunit $DEVICE_TEST
				nodeunit $DRIVER_TEST
			fi
		else
			echo "./testMe.js --testNum=$2 --async=$1"
			./testMe.js --testNum=$2 --async=$1
		fi
	else
		if [ $# -eq 1 ]
		then
			echo "There are $# args. The Arg Str is: $*"
			#Perform sublime-commands: http://www.sublimetext.com/docs/2/osx_command_line.html
			#subl is for sublime
			#-n arg opens a new window
			#-a indicates a file/directory to be opened

			if [ $1 = "install" ]
			then
				echo "installing npm packages"
				npm install
			fi
			if [ $1 = "header" ]
			then
				echo "opening LabJackM.h"
				subl -a /usr/local/include/LabJackM.h
			fi
			if [ $1 = "json" ]
			then
				echo "opening LabJackM.h"
				subl -a /usr/local/share/LabJack/LJM/ljm_constants.json
			fi
			if [ $1 = "start" ]
			then
				echo "starting sublime project"
				#open the main directory, LabJackM.h, ljm_constants.json, this script, and the testMe.js file in a new window
				#subl -n -a /Users/chrisjohnson/Dropbox/git/LabJack/LabJack-nodejs/ /usr/local/include/LabJackM.h /usr/local/share/LabJack/LJM/ljm_constants.json /Users/chrisjohnson/Dropbox/git/LabJack/LabJack-nodejs/run.sh /Users/chrisjohnson/Dropbox/git/LabJack/LabJack-nodejs/testMe.js	
				#cleaner method:
				PROJ_DIR="/Users/chrisjohnson/Dropbox/git/LabJack/LabJack-nodejs"
				EX_DIR="/Users/chrisjohnson/Downloads/dist\ 4/LabJackM/examples"
				CUR_DIR=`pwd`

				CMD="subl -n -a"
				CMD="$CMD $PROJ_DIR"
				CMD="$CMD /usr/local/include/LabJackM.h"
				CMD="$CMD /usr/local/share/LabJack/LJM/ljm_constants.json"
				CMD="$CMD $PROJ_DIR run.sh"
				#CMD="$CMD $PROJ_DIR testMe.js"
				CMD="$CMD $PROJ_DIR/LabJackDriver/device.js"
				CMD="$CMD $PROJ_DIR/LabJackDriver/driver.js"
				CMD="$CMD $PROJ_DIR/LabJackDriver/driver_wrapper.js"


				#Also open the Kippling_QT directory
				CMD="$CMD /Users/chrisjohnson/Dropbox/git_lj/Kipling_QT"
				$CMD

				#change directories & add the current examples directory
				cd /Users/chrisjohnson/Downloads/dist\ 4/LabJackM
				subl -a examples
				pwd
				cd $CUR_DIR
				pwd

				
			fi
			if [ $1 = "kippling" ]
			then
				echo "Opening kippling related files in new window"
			fi
		else
			echo "There are $# args. The Arg Str is: $*. Individually they are:"
			COUNT=1
			for var in "$@"
			do
				echo "$COUNT: $var"
				COUNT=`expr $COUNT + 1`
			done
		fi
	fi
fi