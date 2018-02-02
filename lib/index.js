'use strict';

const notify	= require('./notify');
const fds	= require('./fds');
const watchdog	= require('./watchdog');
const journal	= require('./journal');

module.exports = { notify, fds, watchdog, journal };
