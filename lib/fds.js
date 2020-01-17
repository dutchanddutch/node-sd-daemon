'use strict';

const { setcloexec } = require('socket-calls');
const errnoException = require('util')._errnoException;
const assert = require('assert');


const SD_LISTEN_FDS_START = 3;

const fds = new Map;

if( process.env.LISTEN_PID == process.pid ) {
	let count = +process.env.LISTEN_FDS;

	let names = [];
	if( process.env.LISTEN_FDNAMES !== undefined )
		names = process.env.LISTEN_FDNAMES.split(":");

	for( let i = 0; i < count; i++ ) {
		let fd = SD_LISTEN_FDS_START + i;
		let r = setcloexec( fd );
		if( r < 0 )
			throw errnoException( r );
		let name = names.shift();
		if( name === undefined ) {
			console.warn( "Missing fd name" );
			break;
		}
		fds.set( name, fd );
	}

	if( names.length )
		console.warn( "Excess fd names ignored" );
}

delete process.env.LISTEN_PID;
delete process.env.LISTEN_FDS;
delete process.env.LISTEN_FDNAMES;

module.exports = fds;
