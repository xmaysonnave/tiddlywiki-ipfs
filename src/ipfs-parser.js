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

exports.httpGetToUint8Array = async function(url) {
  var xhr = new XMLHttpRequest();
  xhr.responseType = "arraybuffer";
  return new Promise(function(resolve, reject) {
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status >= 300) {
          reject(new Error("Status: " + xhr.status + ", Text: " + xhr.statusText));
        } else {
          var content = new Uint8Array(this.response);
          if ($tw.utils.getIpfsVerbose()) console.info(
            "Status: "
            + xhr.status
            + ", "
            + xhr.statusText
          );
          if ($tw.utils.getIpfsVerbose()) console.info(
            "Loaded: "
            + url
          );
          resolve(content);
        }
      }
    };
    xhr.open("get", url, true);
    xhr.send();
  });
};

/*
Update a saver priority
*/
exports.parserDecryptBase64 = function(tiddler, type, element) {
  // Decrypt
  const canonical_uri = tiddler.getFieldString("_canonical_uri");
  $tw.utils.httpGetToUint8Array(canonical_uri)
  .then( (content) => {
    $tw.utils.decryptUint8ArrayToBase64(content)
    .then( (base64) => {
      element.attributes.src = {type: "string", value: type + base64};
      $tw.rootWidget.refresh([tiddler]);
    })
    .catch( (error) => {
      if ($tw.utils.getIpfsVerbose()) console.warn(error.message);
      element.attributes.src = {type: "string", value: canonical_uri};
      $tw.rootWidget.refresh([tiddler]);
    });
  })
  .catch( (error) => {
    if ($tw.utils.getIpfsVerbose()) console.error(error);
    throw error;
  });
};

exports.decryptUint8ArrayToBase64 = async function(encrypted) {
  return new Promise( async (resolve, reject) => {
    // Request for password if unknown
    const content = $tw.utils.Utf8ArrayToStr(encrypted);
    if ($tw.crypto.hasPassword() == false) {
      try {
        const base64 = await $tw.utils.decryptFromPasswordPrompt(content);
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    } else {
      const base64 = $tw.crypto.decrypt(content, $tw.crypto.currentPassword);
      resolve(base64);
    }
  });
};

exports.decryptFromPasswordPrompt = async function(content) {
  return new Promise( (resolve, reject) => {
    $tw.passwordPrompt.createPrompt({
      serviceName: "Enter a password to decrypt the imported content!!",
      noUserName: true,
      canCancel: true,
      submitText: "Decrypt",
      callback: function(data) {
        if (!data) {
          reject(new Error("User canceled password input..."));
          return false;
        }
        // Decrypt
        const password = data.password;
        const base64 = $tw.crypto.decrypt(content, password);
        resolve(base64);
        return true;
      }
    });
  });
}

})();
