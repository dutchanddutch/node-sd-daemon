'use strict';

// See example.service

const { notify, fds } = require('.');
const { createServer } = require('net');

for( let [name, fd] of fds )
	console.log( `received fd ${fd} (${name})` );

let server = createServer();

server.on( 'error', function(err) {
	console.error(err);
	process.exit(0);
});

server.on( 'connection', function(s) {
	console.log( '"serving" client' );
	s.destroy();  // you're welcome! come back any time!
});

if( fds.has('example.socket') ) {
	// socket activation!
	server.listen({ fd: fds.get('example.socket') });
	console.log( 'socket activation! yay! \\o/' );

	// no reason to stay running just for this socket,
	// we'll get started again if necessary anyway
	server.unref();

} else if( fds.has('listener') ) {
	// reuse saved listener
	server.listen({ fd: fds.get('listener') });

} else {
	// create listener and save it for reuse if service is restarted
	server.listen(1234);
	notify.fdstore( 'listener', server );
}

const delay = function( s ) {
	return new Promise( resolve => setTimeout( resolve, s * 1000 ) );
};

(async function() {
	notify.status( "initializing..." );
	await delay(3);
	notify.status( "initialized" );

	notify.ready();

	for( let i of (new Array(11)).keys() ) {
		notify.status( `(${i}/10) doing stuff...` );
		await delay(1);
	}
	notify.status( "okay I'm done" );
	await delay(1);

	notify.reloading();
	await delay(3);
	notify.ready();
	await delay(1);

	for( let i of (new Array(6)).keys() ) {
		notify.status( `(${i}/5) doing stuff...` );
		await delay(1);
	}
	notify.status( "okay I'm done" );

	// NOTE: after this notification you _have_ to stop. If you take
	// too long, systemd will help you, with SIGKILL.
	notify.stopping();

	server.close();

	notify.status( "cleaning up my mess..." );
	await delay(3);
	notify.status( "all tidy!" );
	process.exit(0);
})()
.catch(err => {
	console.error(err);
	process.exit(1);
});
