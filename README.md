# node-sd-daemon
systemd support for node.js services (socket activation, etc)

Note that this isn't the `sd-daemon` package on npm. You can currently install
this package using:
```
npm install github:dutchanddutch/node-sd-daemon
```
(but I might eventually rename this package and put it on npm)

## Sending notifications

```js
const { notify } = require('sd-daemon');

notify.available	// true if notify socket available

// If notify.available is false, all notify calls are ignored.

notify.ready();		// call when startup is complete
notify.reloading();	// call when reloading configuration
notify.ready();		// call when reload is complete
notify.stopping();	// call when exiting

// Calling notify.stopping() will ensure that subsequent service activation
// requests will result in the service being restarted after it has exited.  If
// your service fails to exit within reasonable time, it will get killed.

notify.status( string );  // max 16K (utf-8 encoded)
notify.errno( int );
notify.mainpid( int );

// (new in systemd v236)
// Extends service timeouts (start, stop, runtime, and watchdog) to at least
// given value in seconds (supports μs resolution).  Timeouts are never
// decreased by this, nor does it change the configured watchdog timeout (i.e.
// watchdog.reset() will reset the watchdog to its configured interval again).
notify.extend_timeouts( timeout );
```

## Service watchdog

```js
const { watchdog } = require('sd-daemon');

watchdog.available	// boolean
watchdog.enabled	// boolean
watchdog.timeout	// in seconds (or Infinity if watchdog is disabled)
watchdog.last_reset	// process.uptime() of last successful reset

// reset watchdog timer to its configured timeout
watchdog.reset();

// set timeout and enable watchdog
watchdog.reset( timeout );

// disable watchdog
watchdog.reset( Infinity );
```

## Journal logging

```js
const { journal } = require('sd-daemon');

// Send a log message to journald.  The argument should be an iterable of
// key-value pairs, an object, or a string.
journal( message );
// If message is a non-iterable object, it is treated equivalent to
journal( Object.entries( message ) );
// If message is a string, it is treated as equivalent to
journal({ message });

// The keys of the message are implicitly cast to all-uppercase.
//
// If a value is null or undefined that key-value pair is ignored, otherwise
// if it is not a Buffer the value is stringified and utf8-encoded.
//
// There's one special case: the 'priority' value may use the standard names
// for priority levels (emerg, panic, alert, crit, err/error, warning/warn,
// notice, info, debug), which will be mapped to their numeric value.

// examples:
journal( 'hello world' );
journal({ message: 'hello world', priority: 'debug' });
```

## Socket activation

```js
const { fds } = require('sd-daemon');

if( fds.has('example.socket') ) {
	server.listen({ fd: fds.get('example.socket') });

	// no reason to stay running just for this socket,
	// we'll get started again if necessary anyway
	server.unref();
}

// see example.socket + example.service + example.js
```

## File descriptor store

```js
const { fds, notify } = require('sd-daemon');

if( fds.has('listener') ) {
	// reuse saved listener
	server.listen({ fd: fds.get('listener') });
} else {
	// create listener and save it for reuse if service is restarted
	server.listen( 1234 );
	notify.fdstore( 'listener', server );
}
```

Note: this requires that the `FileDescriptorStoreMax` property of the service
is set to a non-zero value.

File descriptors are automatically removed from the fdstore if the fd receives a
POLLERR or POLLHUP event.  Since systemd v246 this behaviour can be inhibited with:

```js
notify.fdstore( name, fd, { poll: false } );
```

Since systemd v236 file descriptors can also be manually removed using:

```js
notify.fdstore_remove( name );
```
