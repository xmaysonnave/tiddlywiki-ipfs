/*\
title: $:/plugins/ipfs/ipfs-parser.js
type: application/javascript
tags: $:/ipfs/core
module-type: utils

The saver handler tracks changes to the store and handles saving the entire wiki via saver modules.

utils

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const log = require("$:/plugins/ipfs/loglevel/loglevel.js");

const ipfsParserName = "ipfs-parser";

exports.httpGetToUint8Array = async function(url) {
  const xhr = new XMLHttpRequest();
  xhr.responseType = "arraybuffer";
  return new Promise(function(resolve, reject) {
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && xhr.status !== 0) {
        if (xhr.status >= 300) {
          reject(new Error($tw.language.getString("Error/XMLHttpRequest") + ": " + xhr.status));
        } else {
          const array = new Uint8Array(this.response);
          const logger = log.getLogger(ipfsParserName);
          logger.info(
            "Loaded: "
            + url
            + " with HTTP status: "
            + xhr.status
          );
          resolve(array);
        }
      }
    };
    xhr.onerror = function() {
      reject(new Error($tw.language.getString("NetworkError/XMLHttpRequest") + " " + url));
    };
    try {
      xhr.open("get", url, true);
      xhr.send();
    } catch (error) {
      reject(error);
    }
  });
};

/*
 * Load and decrypt to Base64
 */
exports.loadAndDecryptToBase64 = function(uri) {
  return new Promise( async (resolve, reject) => {
    $tw.utils.httpGetToUint8Array(uri)
    .then( (array) => {
      if (array instanceof Uint8Array && array.length > 0) {
        $tw.utils.decryptUint8ArrayToBase64(array)
        .then( (base64) => {
          resolve(base64);
        })
        .catch( (error) => {
          reject(error);
        });
      } else {
        reject(new Error($tw.language.getString("Error/XMLHttpRequest") + ": Empty Result..."));
      }
    })
    .catch( (error) => {
      reject(error);
    });
  });
};

/*
 * Decrypt Uint8Array to Base64
 */
exports.decryptUint8ArrayToBase64 = async function(array) {
  return new Promise( async (resolve, reject) => {
    const content = $tw.utils.Utf8ArrayToStr(array);
    if ($tw.crypto.hasPassword() == false) {
      try {
        // Request for password if unknown
        const decrypted = await $tw.utils.decryptFromPasswordPrompt(content);
        const base64 = btoa(decrypted);
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    } else {
      const decrypted = $tw.crypto.decrypt(content, $tw.crypto.currentPassword);
      const base64 = btoa(decrypted);
      resolve(base64);
    }
  });
};

/*
 * Load and decrypt to UTF-8
 */
exports.loadAndDecryptToUtf8 = function(uri) {
  return new Promise( async (resolve, reject) => {
    // Decrypt
    $tw.utils.httpGetToUint8Array(uri)
    .then( (array) => {
      if (array instanceof Uint8Array && array.length > 0) {
        $tw.utils.decryptUint8ArrayToUtf8(array)
        .then( (data) => {
          resolve(data);
        })
        .catch( (error) => {
          reject(error);
        });
      }
    })
    .catch( (error) => {
      reject(error);
    });
  });
};

/*
 * Load to UTF-8
 */
exports.loadToUtf8 = function(uri) {
  return new Promise( async (resolve, reject) => {
    $tw.utils.httpGetToUint8Array(uri)
    .then( (array) => {
      const data = $tw.utils.Utf8ArrayToStr(array);
      resolve(data);
    })
    .catch( (error) => {
      reject(error);
    });
  });
};

exports.decryptUint8ArrayToUtf8 = async function(array) {
  return new Promise( async (resolve, reject) => {
    const encrypted = $tw.utils.Utf8ArrayToStr(array);
    if ($tw.crypto.hasPassword() == false) {
      try {
        const decrypted = await $tw.utils.decryptFromPasswordPrompt(encrypted);
        resolve(decrypted);
      } catch (error) {
        reject(error);
      }
    } else {
      try {
        const decrypted = $tw.crypto.decrypt(encrypted, $tw.crypto.currentPassword);
        resolve(decrypted);
      } catch (error) {
        reject(error);
      }
    }
  });
};

exports.decryptFromPasswordPrompt = async function(encrypted) {
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
        try {
          const decrypted = $tw.crypto.decrypt(encrypted, password);
          resolve(decrypted);
        } catch (error) {
          reject(error);
          return false;
        }
        return true;
      }
    });
  });
}

})();
