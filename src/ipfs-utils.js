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

// https://observablehq.com/@bryangingechen/dynamic-import-polyfill
exports.loadLibrary = async function(id, url, sri, module) {
  return new Promise((resolve, reject) => {
    try {
      if (document.getElementById(id) == null) {
        const script = document.createElement("script");
        // Cleanup function
        const cleanup = () => {
          delete window[id];
          script.onerror = null;
          script.onload = null;
          script.remove();
          URL.revokeObjectURL(script.src);
          script.src = "";
        };
        if (module == undefined) {
          script.type = "text/javascript";
        } else {
          script.type = "module";
        }
        script.id = id;
        script.async = false;
        script.defer = "defer";
        script.src = url;
        if (sri) {
          script.integrity = sri;
        }
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
        script.onload = () => {
          resolve(window[id]);
          cleanup();
          const logger = new $tw.utils.Logger("ipfs-utils");
          if ($tw.utils.getIpfsVerbose()) logger.info(
            "Loaded: "
            + url
          );
        }
        script.onerror = () => {
          reject(new Error("Failed to load: " + url));
          cleanup();
        }
      } else {
        return resolve(window[id]);
      }
    } catch (error) {
      reject(error);
    }
  });
};

exports.getChangedTiddlers = function(tiddler) {
  const title = tiddler.getFieldString("title");
  const changedTiddlers = Object.create(null);
  if (title !== undefined && title !== null) {
    changedTiddlers[title] = Object.create(null);
  }
  return changedTiddlers;
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
