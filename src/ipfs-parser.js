/*\
title: $:/plugins/ipfs/ipfs-parser.js
type: application/javascript
module-type: utils

The saver handler tracks changes to the store and handles saving the entire wiki via saver modules.

\*/
( function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

/*
Update a saver priority
*/
exports.parserDecryptBase64 = function(tiddler, type, element) {
  // Decrypt
  const ipfsWrapper = new IpfsWrapper();
  const canonical_uri = tiddler.getFieldString("_canonical_uri");
  ipfsWrapper.loadFromIpfs(canonical_uri)
  .then( (encrypted) => {
    $tw.utils.decrypt(encrypted)
    .then( (content) => {
      const base64 = btoa(content);
      element.attributes.src = {type: "string", value: type + base64};
      $tw.rootWidget.refresh([tiddler]);
    })
    .catch( (error) => {
      if ($tw.utils.getIpfsVerbose()) console.warn(error.message);
      element.attributes.src = {type: "string", value: canonical_uri};
      $tw.rootWidget.refresh([tiddler]);
    });
  });
};

})();
