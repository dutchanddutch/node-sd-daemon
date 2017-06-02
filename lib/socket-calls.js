'use strict';

const bindings = require('bindings');

module.exports = exports = bindings({
	module_root: bindings.getRoot( require.resolve('abstract-socket') ),
});

exports.errnoException = require('util')._errnoException;
