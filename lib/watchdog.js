'use strict';

const notify = require('./notify');
const available = notify.available;

const { ceil } = Math;

// largest double-precision float that fits in uint64_t.
// this timeout is more than half a million years, i.e. "infinite".
const max_us = 2**64 - 2**(64 - 53);

let enabled = process.env.WATCHDOG_PID == process.pid;
let timeout_us = enabled ? process.env.WATCHDOG_USEC : Infinity;
if( timeout_us >= max_us )
	timeout_us = Infinity;
let timeout = timeout_us / 1000000;
let last_reset = 0;

if( enabled && ! available )
	throw new Error( "Watchdog is enabled but not available?!" );

const reset = ( new_timeout ) => {
	if( ! available )
		return;

	if( new_timeout ) {
		let us = ceil( new_timeout * 1000000 );
		if( !( us >= 0 ) )
			throw new ValueError( "Invalid timeout" );

		if( us < max_us ) {
			if( ! notify( `WATCHDOG_USEC=${us}` ) )
				return false;
			timeout_us = us;
			timeout = us / 1000000;
			enabled = true;
		} else {
			if( ! enabled )
				return;
			if( ! notify( `WATCHDOG_USEC=${max_us}` ) )
				return false;
			timeout_us = max_us;
			timeout = Infinity;
			enabled = false;
			last_reset = 0;
			return;
		}
	} else {
		if( ! enabled )
			return;
		if( ! notify( 'WATCHDOG=1' ) )
			return false;
	}

	last_reset = process.uptime();
	return true;
};

Object.defineProperties( exports, {
	reset:      { enumerable: true, value: reset },
	available:  { enumerable: true, value: available },
	enabled:    { enumerable: true, get() {  return enabled;  } },
	timeout:    { enumerable: true, get() {  return timeout;  } },
	last_reset: { enumerable: true, get() {  return last_reset;  } },
});
