#!/bin/bash

set -e
shopt -s lastpipe

if [[ "$NODE" == "" ]]; then
	NODE="$(which node)"
	if [[ "$NODE" == "" ]]; then
		echo "node: command not found" >&2
		exit 1
	fi
fi
NODE="$(realpath -e "$NODE")"


unit=node-sd-daemon-test.service

ctl=( systemctl --no-ask-password --user --no-pager )

cleanup() (
	set +e
	"${ctl[@]}" --no-block stop $unit &>/dev/null
	"${ctl[@]}" --signal=SIGKILL kill $unit &>/dev/null
	"${ctl[@]}" reset-failed $unit &>/dev/null
	echo -e '\e[m' >&2
)

cleanup

run() (
	trap cleanup EXIT
	local script="$(realpath -e "$1")"; shift
	systemd-run --no-ask-password --user --quiet \
			--property=RuntimeMaxSec=5s \
			--unit=$unit --service-type=notify \
			"$NODE" "$script" "$@" >&2
	while "${ctl[@]}" --quiet is-active $unit; do sleep 0.1; done
	#"${ctl[@]}" status $unit >&2 || true
	"${ctl[@]}" show $unit
)

test_begin() {
	echo -e '\e[33m'"Testing $*..."'\e[1;31m'
} >&2
test_end() {
	echo -e '\e[0;32m'"   OK"'\e[m'
} >&2

check() (
	IFS=$'\n'
	grep -Fxc "$*" | read
	[[ "$REPLY" -eq $# ]] && return
	echo -e '\e[1;31m'"   FAILED"'\e[m' >&2
	false
)

test_begin notify.status
run "test/status.js" | check			\
	StatusText="testing notify.status"	\
	Result=exit-code			\
	ExecMainStatus=42
test_end

test_begin watchdog
run "test/watchdog.js" | check			\
	StatusText="getting myself killed..."	\
	Result=watchdog
test_end

echo ""
echo -e '\e[1;32m'"All tests passed"'\e[m'
echo ""
