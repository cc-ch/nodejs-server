#!/bin/bash

remote_host=10.42.10.34

args=$@
 
sshexec -i $remote_host \
	-p sunyuan \
	-u sunyuan \
	-e "echo sunyuan | sudo -S whoami > /dev/null 2>&1;
	    echo sunyuan | sudo -S Gftp -tasktype cuser -user ${args} "  
