'use strict';

const { AF_UNIX, SOCK_DGRAM,
	socket, sendto, close,
	getsockopt_int, setsockopt, SOL_SOCKET, SO_SNDBUF,
	cmsg_rights, sa_unix  } = require('socket-calls');
const errnoException = require('util')._errnoException;

const address = sa_unix( '/run/systemd/journal/socket' );
const fd = socket( AF_UNIX, SOCK_DGRAM, 0 );
if( fd < 0 )
	throw errnoException( fd, 'socket(AF_UNIX, SOCK_DGRAM, 0)' );
{
	const reqbufsize = 8 * 1024 * 1024;

	let bufsize = getsockopt_int( fd, SOL_SOCKET, SO_SNDBUF )
	if( bufsize < 0 )
		throw errnoException( bufsize, 'getsockopt( fd, SOL_SOCKET, SO_SNDBUF )' );
	if( bufsize < reqbufsize ) {
		let err = setsockopt( fd, SOL_SOCKET, SO_SNDBUF, reqbufsize );
		// ignore if we can't increase the buffer size.
	}
}

const send_raw = ( data ) => {
	let r = sendto( fd, data, address );
	if( r >= 0 )
		return true;
	r = errnoException( r, 'sendto' );

	if( r.code === 'ENOENT' )  // journal not available
		return false;

	throw r;
};


const is_iterable = ( value ) => {
        return value !== null && typeof value === 'object'
        	&& Symbol.iterator in value;
};

// important keys:
//	PRIORITY	(integer range 0-7)
//	SYSLOG_IDENTIFIER
//	MESSAGE
//	MESSAGE_ID	(id128)
//	CODE_FILE
//	CODE_LINE
//	CODE_FUNC

const priorities = new Map( Object.entries( {
	emerg:	0,	// "system is unusable"
	panic:	0,	// (DEPRECATED synonym)
	emergency: 0,	// (DEPRECATED synonym)
	alert:	1,	// "action must be taken immediately"
	crit:	2,	// "critical conditions"
	critical: 2,	// (DEPRECATED synonym)
	err:	3,	// "error conditions"
	error:	3,	// (DEPRECATED synonym)
	warning: 4,	// "warning conditions"
	warn:	4,	// (DEPRECATED synonym)
	notice:	5,	// "normal but significant condition"
	info:	6,	// "informational"
	debug:	7,	// "debug-level messages"
	none:	null,	// no priority
} ) );

const separator = Buffer.from("=");
const newline = Buffer.from("\n");

const MAX_INLINE = 256;  // somewhat arbitrarily chosen

const bin_encode = ( fields ) => {
	if( fields instanceof Map )
		fields = fields.entries();
	else if( ! is_iterable( fields ) )
		fields = Object.entries( fields );

	let iov = [];

	for( let [field, value] of fields ) {
		if( typeof field !== 'string' )
			throw new TypeError;
		field = field.toUpperCase();
		if( ! /^[A-Z][A-Z0-9_]{0,63}$/.test( field ) )
			throw new KeyError;

		if( field === 'PRIORITY' && priorities.has( value ) )
			value = priorities.get( value );

		if( value == null )
			continue;

		if( !( value instanceof Buffer ) )
			value = Buffer.from( String( value ) );

		field = Buffer.from( field );

		if( value.length > MAX_INLINE || value.some( x => (x < 32) ) ) {
			let length = Buffer.alloc(8);
			length.writeUInt32LE( value.length );
			iov.push( field, newline, length, value, newline );
		} else {
			iov.push( field, separator, value, newline );
		}
	}

	return Buffer.concat( iov );
};

const journal = ( msg ) => {
	if( typeof msg === 'string' ) {
		msg = { message: msg };

		let tmp = {};
		Error.captureStackTrace( tmp, journal );
		tmp = tmp.stack + "\n";
		let m = /^.*\n +at (.+) \((.+):(\d+):\d+\)\n/.exec( tmp );
		if( m ) {
			[, msg.code_func, msg.code_file, msg.code_line] = m;
		} else {
			m = /^.*\n +at (.+):(\d+):\d+\n/.exec( tmp );
			if( m ) {
				[, msg.code_file, msg.code_line] = m;
			}
		}
	}
	return send_raw( bin_encode( msg ) );
};

module.exports = journal;
