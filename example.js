'use strict';

// An easy way to see this in action:  open up one terminal and run:
//
//	watch -n 0.1 systemctl --user status example.service
//
// This will monitor the example.service and is where you can see all the
// interesting stuff happen.  Then from another terminal do:
//
//	systemd-run --user --unit=example.service --service-type=notify \
//		node /path/to/sd-daemon/example.js
//
// Note that the script path must be absolute!

const { notify } = require('.');

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

	notify.status( "cleaning up my mess..." );
	await delay(3);
	notify.status( "all tidy!" );
})()
.catch(err => {
	console.error(err);
});
