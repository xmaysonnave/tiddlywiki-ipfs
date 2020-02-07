/*\
title: $:/core/modules/parsers/audioparser.js
type: application/javascript
tags: $:/ipfs/core
module-type: parser

The audio parser parses an audio tiddler into an embeddable HTML element

\*/

/**
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

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const name = "ipfs-audioparser";

var AudioParser = function(type,text,options) {
  const self = this;
  const value = "data:" + type + ";base64,";
  const element = {
    type: "element",
    tag: "audio",
    attributes: {
      controls: { type: "string", value: "controls" },
      style: { type: "string", value: "width: 100%; object-fit: contain" }
    }
  };
  const tiddler = options.tiddler;
  var uri = options._canonical_uri;
  // Normalize
  if (uri && $tw !== undefined && $tw !== null && $tw.ipfs !== undefined && $tw.ipfs !== null) {
    uri = $tw.ipfs.normalizeUrl(uri).toString();
  }
  // Load external resource
  if (uri) {
    $tw.utils.loadToBase64(uri.toString())
    .then( (loaded) => {
      // Load data
      element.attributes.src = { type: "string", value: value + loaded.data };
      // Assign
      self.tree = [element];
      // Dispatch
      const parsedTiddler = $tw.utils.getChangedTiddler(tiddler);
      $tw.rootWidget.refresh(parsedTiddler);
    })
    .catch( (error) => {
      self.getLogger().error(error);
      $tw.utils.alert(name, error.message);
    });
  } else if (text) {
    element.attributes.src = { type: "string", value: value + text} ;
  }
  // Return the parsed tree
  this.tree = [element];
}

AudioParser.prototype.getLogger = function() {
  if (window.log) {
    return window.log.getLogger(name);
  }
  return console;
}

exports["audio/ogg"] = AudioParser;
exports["audio/mpeg"] = AudioParser;
exports["audio/mp3"] = AudioParser;
exports["audio/mp4"] = AudioParser;

})();
