'use strict';

const bindings = require('bindings');

module.exports = exports = bindings({
	module_root: bindings.getRoot( require.resolve('abstract-socket') ),
});

exports.errnoException = require('util')._errnoException;


const { CMSG_ALIGN, SOL_SOCKET, SCM_RIGHTS, SCM_CREDENTIALS } = exports;
const CMSGHDR_LEN = CMSG_ALIGN + 8;

const cmsg = function( level, type, datalen ) {
	const len = CMSGHDR_LEN + datalen;
	const msg = Buffer.alloc( len + (-len & (CMSG_ALIGN-1)) );
	msg.writeInt32LE( len, 0 );
	msg.writeInt32LE( level, CMSG_ALIGN );
	msg.writeInt32LE( type, CMSG_ALIGN + 4 );
	return msg;
};

const cmsg_rights = function( fds ) {
	let msg = cmsg( SOL_SOCKET, SCM_RIGHTS, 4 * fds.length );
	let pos = CMSGHDR_LEN;
	for( let fd of fds )
		pos = msg.writeInt32LE( fd, pos );
	return msg;
};

const cmsg_creds = function( pid, uid, gid ) {
	let msg = cmsg( SOL_SOCKET, SCM_CREDENTIALS, 12 );
	let pos = CMSGHDR_LEN;
	pos = msg.writeInt32LE( pid, pos );
	pos = msg.writeInt32LE( uid, pos );
	pos = msg.writeInt32LE( gid, pos );
	return msg;
};

exports.CMSGHDR_LEN	= CMSGHDR_LEN;
exports.cmsg		= cmsg;
exports.cmsg_rights	= cmsg_rights;
exports.cmsg_creds	= cmsg_creds;
