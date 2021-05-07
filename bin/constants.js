#!/usr/bin/env node
'use strict'

function define (name, value) {
  Object.defineProperty(exports, name, {
    value: value,
    enumerable: true,
  })
}

define('NEW', 'New')
define('PARENT', 'Parent')
define('UNCHANGED', 'Unchanged')
