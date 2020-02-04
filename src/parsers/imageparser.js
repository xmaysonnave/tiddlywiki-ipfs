/*\
title: $:/core/modules/parsers/imageparser.js
type: application/javascript
tags: $:/ipfs/core
module-type: parser

The image parser parses an image into an embeddable HTML element

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

const root = require("$:/plugins/ipfs/window-or-global/index.js");

const name = "ipfs-imageparser";

var ImageParser = function(type,text,options) {
  let self = this;
  let uri = options._canonical_uri;
  let tiddler = options.tiddler;
  let isEncrypted = tiddler !== undefined ? tiddler.hasTag("$:/isEncrypted") : false;
  let value = "data:" + type + ";base64,";
  let element = {
    type: "element",
    tag: "img",
    attributes: {}
  };
  // Decrypt or not external resource
  if (uri && isEncrypted) {
    $tw.utils.loadAndDecryptToBase64(uri)
    .then( (base64) => {
      element.attributes.src = { type: "string", value: value + base64 };
      self.tree = [element];
      const changedTiddlers = $tw.utils.getChangedTiddlers(tiddler);
      $tw.rootWidget.refresh(changedTiddlers);
    })
    .catch( (error) => {
      self.getLogger().error(error);
      $tw.utils.alert(name, error.message);
    });
  } else {
    if (uri) {
      element.attributes.src = { type: "string", value: uri };
    } else if (text) {
      element.attributes.src = { type: "string", value: value + text };
    }
  }
  // Return the parsed tree
  this.tree = [element];
};

ImageParser.prototype.getLogger = function() {
  return root.log.getLogger(name);
}

exports["image/jpg"] = ImageParser;
exports["image/jpeg"] = ImageParser;
exports["image/png"] = ImageParser;
exports["image/gif"] = ImageParser;
exports["image/webp"] = ImageParser;
exports["image/heic"] = ImageParser;
exports["image/heif"] = ImageParser;
exports["image/x-icon"] = ImageParser;

})();
