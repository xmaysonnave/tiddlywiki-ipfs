#!/usr/bin/env node

/**
 * This is invoked as a shell script by NPM when the `tiddlywiki` command is typed
 */

var $tw = require('tiddlywiki').TiddlyWiki()
var $tw = require('./src/boot/ipfs-boot.js').TiddlyWiki($tw)

// Pass the command line arguments to the boot kernel
$tw.boot.argv = Array.prototype.slice.call(process.argv, 2)

// Boot the TW5 app
$tw.ipfs.boot()
