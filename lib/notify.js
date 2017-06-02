'use strict';

const { AF_UNIX, SOCK_DGRAM,
	socket, sendto, close,
	errnoException } = require( './socket-calls');


let fd = socket( AF_UNIX, SOCK_DGRAM, 0 );
if( fd < 0 )
	throw errnoException( fd, 'socket(AF_UNIX, SOCK_DGRAM, 0)' );

let address = process.env.NOTIFY_SOCKET;
delete process.env.NOTIFY_SOCKET;

if( address !== undefined ) {
	// must be abstract socket or absolute filesystem path
	if( address[0] === '@' ) {
		address = Buffer.from( address );
		address[0] = 0;
	} else if( address[0] !== '/' ) {
		console.warn( `Invalid notify socket address: ${address}` );
		address = undefined;
	}
}


const notify = function( msg ) {
	if( this.address === undefined )
		return false;

	let r = sendto( fd, this.address, msg );
	if( r < 0 ) {
		console.warn( errnoException( r, 'sendto' ) );
		return false;
	}
	return true;
};

module.exports = notify;

notify.fd = fd;
notify.address = address;

const notifier = function( msg ) {
	return function() {
		return notify( msg );
	};
};

const setter = function( key ) {
	return function( value ) {
		return notify( `${key}=${value}` );
	};
};

notify.ready		= notifier( 'READY=1' );
notify.reloading  	= notifier( 'RELOADING=1' );
notify.stopping  	= notifier( 'STOPPING=1' );

notify.status		= setter( 'STATUS' );
notify.errno		= setter( 'ERRNO' );
notify.mainpid		= setter( 'MAINPID' );

// WATCHDOG/WATCHDOG_USEC is in separate file
//
// FDSTORE/FDNAME is on to-do list
