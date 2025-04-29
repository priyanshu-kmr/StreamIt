# StreamIt
A video streaming web application using SocketIO. It supports both live as well as on demand streaming.  

## How to Run
- first clone the repo using `git clone https://github.com/priyanshu-kmr/StreamIt`
- inside the root folder, C=create a .env file and add the variable `SERVER_PORT` and set it to 4040. (or any other port number)
- run `npm install` in the root dir and as well in the  `server` directory. run `cd server` to switch to server directory.

## On demand Video stream
- for on demand video streaming, create a videos folder using the command `mkdir videos` while inside the `server` directory.
- drag the videos in `.mp4` format into the newly created folder. ensure that for each video there is a `.png` file with the same name for thumbnail of the video.
