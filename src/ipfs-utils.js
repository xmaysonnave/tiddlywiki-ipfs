/*\
title: $:/plugins/ipfs/ipfs-utils.js
type: application/javascript
tags: $:/ipfs/core
module-type: utils

utils

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.Base64ToUint8Array = function(base64) {
  var raw = atob(base64);
  var ua = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) {
    ua[i] = raw.charCodeAt(i);
  }
  return ua;
}

exports.Uint8ArrayToBase64 = function(uint8) {
  var CHUNK_SIZE = 0x8000; //arbitrary number
  var index = 0;
  var length = uint8.length;
  var str = "";
  var slice;
  while (index < length) {
    slice = uint8.subarray(index, Math.min(index + CHUNK_SIZE, length));
    str += String.fromCharCode.apply(null, slice);
    index += CHUNK_SIZE;
  }
  return btoa(str);
}

// String to uint array
exports.StringToUint8Array = function(string) {
  var escstr = encodeURIComponent(string);
  var binstr = escstr.replace(/%([0-9A-F]{2})/g, function(match, p1) {
      return String.fromCharCode('0x' + p1);
  });
  var ua = new Uint8Array(binstr.length);
  Array.prototype.forEach.call(binstr, function (ch, i) {
      ua[i] = ch.charCodeAt(0);
  });
  return ua;
}

// http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt

/*
 * utf.js - UTF-8 <=> UTF-16 convertion
 *
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */
exports.Utf8ArrayToStr = function(array) {
  var c, char2, char3;
  var out = "";
  var len = array.length;
  var i = 0;
  while(i < len) {
    c = array[i++];
    switch(c >> 4) {
    case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
      // 0xxxxxxx
      out += String.fromCharCode(c);
      break;
    case 12: case 13:
      // 110x xxxx   10xx xxxx
      char2 = array[i++];
      out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
      break;
    case 14:
      // 1110 xxxx  10xx xxxx  10xx xxxx
      char2 = array[i++];
      char3 = array[i++];
      out += String.fromCharCode(((c & 0x0F) << 12)
        | ((char2 & 0x3F) << 6)
        | ((char3 & 0x3F) << 0));
      break;
    }
  }
  return out;
}

/**
 * $:/core/modules/utils/logger.js
 *
 * TiddlyWiki created by Jeremy Ruston, (jeremy [at] jermolene [dot] com)
 *
 * Copyright (c) 2004-2007, Jeremy Ruston
 * Copyright (c) 2007-2018, UnaMesa Association
 * Copyright (c) 2019-2020, Blue Light
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 'AS IS'
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

exports.alert = function(callee, text) {

  if (typeof window === "undefined" || typeof window.navigator === "undefined") {
    return;
  }

  const ALERT_TAG = "$:/tags/Alert";

  // Check if there is an existing alert with the same text and the same component
  var existingAlerts = $tw.wiki.getTiddlersWithTag("$:/tags/Alert");
  var alertFields;
  var existingCount;

  $tw.utils.each(existingAlerts, function(title) {
    var tiddler = $tw.wiki.getTiddler(title);
    if (tiddler.fields.text === text
      && tiddler.fields.component === self.componentName
      && tiddler.fields.modified
      && (!alertFields || tiddler.fields.modified < alertFields.modified)
    ) {
        alertFields = $tw.utils.extend({}, tiddler.fields);
    }
  });

  if (alertFields) {
    existingCount = alertFields.count || 1;
  } else {
    alertFields = {
      title: $tw.wiki.generateNewTitle("$:/temp/alerts/alert", {prefix: ""}),
      text: text,
      tags: [ALERT_TAG],
      component: callee
    };
    existingCount = 0;
  }

  alertFields.modified = new Date();
  if (++existingCount > 1) {
    alertFields.count = existingCount;
  } else {
    alertFields.count = undefined;
  }

  $tw.wiki.addTiddler(new $tw.Tiddler(alertFields));

}

exports.getChangedTiddler = function(object, options) {
  options = options || Object.create(null);
  const changedTiddler = Object.create(null);
  // Check
  if (object == undefined || object == null) {
    return changedTiddler;
  }
  if (object instanceof $tw.Tiddler == false && typeof object !== "string") {
    return changedTiddler;
  }
  // Retrieve title
  var title = null;
  if (typeof object === "string") {
    title = object;
  }
  if (object instanceof $tw.Tiddler) {
    title = object.getFieldString("title");
  }
  // Check
  if (title == undefined || title == null || title.trim() === "") {
    return changedTiddler;
  }
  // Process
  changedTiddler[title] = options;
  return changedTiddler;
}

exports.updateTiddler = function(updates) {
  // Is there anything to do
  if (updates == undefined || updates == null || updates.tiddler == undefined || updates.tiddler == null) {
    return null;
  }
  // Prepare updates
  const fields = $tw.wiki.getModificationFields();
  fields.tags = (updates.tiddler.fields.tags || []).slice(0);
  // Process add tags
  if (updates.addTags !== undefined && updates.addTags !== null && Array.isArray(updates.addTags)) {
    for (var i = 0; i < updates.addTags.length; i++) {
      const tag = updates.addTags[i];
      if (fields.tags.indexOf(tag) == -1) {
        $tw.utils.pushTop(fields.tags, tag);
      }
    }
  }
  // Process remove tags
  if (updates.removeTags !== undefined && updates.removeTags !== null && Array.isArray(updates.removeTags)) {
    for (var i = 0; i < updates.removeTags.length; i++) {
      const tag = updates.removeTags[i];
      const index = fields.tags.indexOf(tag);
      if (index !== -1) {
        fields.tags.splice(index, 1);
      }
    }
  }
  // Process fields
  if (updates.fields !== undefined && updates.fields !== null && Array.isArray(updates.fields)) {
    for (var i = 0; i < updates.fields.length; i++) {
      const field = updates.fields[i];
      if (field.key !== undefined && field.key !== null) {
        fields[field.key] = field.value;
      }
    }
  }
  // Update tiddler
  const updatedTiddler = new $tw.Tiddler(updates.tiddler, fields);
  return updatedTiddler;
}

})();
