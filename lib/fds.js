'use strict';

const { setcloexec, errnoException } = require( './socket-calls');


const SD_LISTEN_FDS_START = 3;

const fds = [];
const fd_names = [];

if( process.env.LISTEN_PID == process.pid ) {
	fds.length = process.env.LISTEN_FDS;

	for( let i of fds.keys() ) {
		let fd = SD_LISTEN_FDS_START + i;
		let r = setcloexec( fd );
		if( r < 0 )
			throw errnoException( r );
		fds[i] = fd;
	}

	if( process.env.LISTEN_FDNAMES !== undefined )
		fd_names.push( ...process.env.LISTEN_FDNAMES.split(":") );
}

delete process.env.LISTEN_PID;
delete process.env.LISTEN_FDS;
delete process.env.LISTEN_FDNAMES;

module.exports = { fds, fd_names };
