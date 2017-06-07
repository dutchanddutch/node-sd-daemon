'use strict';

const { notify } = require('..');

(async function() {
	notify.status("testing notify.status");
	notify.ready();
	process.exit(42);
})();
