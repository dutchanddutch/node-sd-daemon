'use strict';

const { AF_UNIX, SOCK_DGRAM,
	socket, sendmsg, close, sa_unix,
	cmsgs_join, SOL_SOCKET, SCM_RIGHTS } = require('socket-calls');

const errnoException = require('util')._errnoException;

const [ available, fd, address ] = (() => {
	let address = process.env.NOTIFY_SOCKET;
	delete process.env.NOTIFY_SOCKET;

	if( address === undefined )
		return [ false ];

	// must be abstract socket or absolute filesystem path
	if( address[0] === '@' ) {
		address = Buffer.from( address );
		address[0] = 0;
	} else if( address[0] !== '/' ) {
		console.warn( `Invalid notify socket address: ${address}` );
		return [ false ];
	}

	let fd = socket( AF_UNIX, SOCK_DGRAM, 0 );
	if( fd < 0 ) {
		console.warn( errnoException( fd, 'socket(AF_UNIX, SOCK_DGRAM, 0)' ) );
		return [ false ];
	}

	return [ true, fd, sa_unix( address ) ];
})();

const notify = ( data, fds ) => {
	if( ! available )
		return false;

	if( !( data instanceof Buffer ) )
		data = Buffer.from( data );

	let cmsgs = undefined;
	if( fds ) {
		if( !( fds instanceof Uint32Array ) )
			fds = Uint32Array.from( fds );
		let data = Buffer.from( fds.buffer, fds.byteOffset, fds.byteLength );
		cmsgs = cmsgs_join( { level: SOL_SOCKET, type: SCM_RIGHTS, data } );
	}

	let r = sendmsg( fd, data, address, cmsgs );
	if( r < 0 ) {
		console.warn( errnoException( r, 'sendto' ) );
		return false;
	}
	return true;
};

notify.available = available;

module.exports = notify;

const notifier = ( msg ) => {
	return notify.bind( undefined, Buffer.from( msg ) );
};

const setter = ( key ) => {
	return ( value ) => {
		return notify( `${key}=${value}` );
	};
};

notify.ready		= notifier( 'READY=1' );
notify.reloading  	= notifier( 'RELOADING=1' );
notify.stopping  	= notifier( 'STOPPING=1' );

notify.status		= setter( 'STATUS' );	// must be valid utf-8, max 16K
notify.errno		= setter( 'ERRNO' );
notify.mainpid		= setter( 'MAINPID' );

notify.fdstore = ( name, fd, { poll=true } = {} ) => {
	if( typeof fd === 'object' && fd !== null && fd._handle != undefined )
		fd = fd._handle;
	if( typeof fd === 'object' && fd !== null && fd.fd !== undefined )
		fd = fd.fd;
	if( fd !== (fd >> 0) || fd < 0 )
		throw Error("Invalid file descriptor");

	let msg = `FDSTORE=1\nFDNAME=${name}`;
	if( ! poll )
		msg += '\nFDPOLL=0';  // new in systemd v246
	return notify( msg, [ fd ] );
};

notify.fdstore_remove = ( name ) => {
	return notify( `FDSTOREREMOVE=1\nFDNAME=${name}` );  // new in systemd v236
};


const { ceil, min } = Math;

// largest double-precision float that fits in uint64_t.
// this timeout is more than half a million years, i.e. "infinite".
const max_us = 2**64 - 2**(64 - 53);

// new in systemd v236.  extend start/stop/runtime/watchdog timeouts.
notify.extend_timeouts = ( new_timeout ) => {
	let us = min( ceil( new_timeout * 1000000 ), max_us );
	if( !( us >= 0 ) )
		throw new ValueError( "Invalid timeout" );
	return notify( `EXTEND_TIMEOUT_USEC=${us}` );
};
