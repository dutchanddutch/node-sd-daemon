'use strict';

const { AF_UNIX, SOCK_DGRAM,
	socket, sendto, close,
	cmsg_rights, errnoException } = require('./socket-calls');

const [ available, fd, address ] = (function() {
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

	return [ true, fd, address ];
})();

const notify = function( ...args ) {
	if( ! available )
		return false;

	let r = sendto( fd, address, ...args );
	if( r < 0 ) {
		console.warn( errnoException( r, 'sendto' ) );
		return false;
	}
	return true;
};

notify.available = available;

module.exports = notify;

const notifier = function( msg ) {
	return notify.bind( undefined, `${msg}` );
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

notify.fdstore = function( name, fd ) {
	if( typeof fd === 'object' && fd !== null && fd._handle != undefined )
		fd = fd._handle;
	if( typeof fd === 'object' && fd !== null && fd.fd !== undefined )
		fd = fd.fd;
	if( fd !== (fd >> 0) || fd < 0 )
		throw Error("Invalid file descriptor");
	return notify( `FDSTORE=1\nFDNAME=${name}`, cmsg_rights([+fd]) );
};
