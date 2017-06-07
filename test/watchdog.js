'use strict';

const { notify, watchdog } = require('..');
const delay = t => new Promise( resolve => setTimeout( resolve, t * 1000 ) );

(async function() {
	watchdog.reset( 0.2 );
	notify.ready();
	await delay( 0.1 );
	watchdog.reset();
	await delay( 0.1 );
	notify.status( 'getting myself killed...' );
	await delay( 0.15 );
	notify.status( 'not reached' );
})();
