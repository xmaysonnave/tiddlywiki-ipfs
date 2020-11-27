#!/usr/bin/env node

/**
 * This is invoked as a shell script by NPM when the `tiddlywiki` command is typed
 */
const path = require('path')
var $tw = require('tiddlywiki').TiddlyWiki()
$tw = require('./boot/ipfs-boot.js').TiddlyWiki($tw)

// Load plugin
const current = path.dirname(module.filename)
const core = path.resolve(current, './core')
$tw.boot.extraPlugins = [ `+${core}` ]

// Pass the command line arguments to the boot kernel
$tw.boot.argv = Array.prototype.slice.call(process.argv, 2)

// Boot the TW5 app
$tw.boot.boot()
