/*\
title: $:/plugins/ipfs/ipfs-parser.js
type: application/javascript
tags: $:/ipfs/core
module-type: utils

The saver handler tracks changes to the store and handles saving the entire wiki via saver modules.

IPFS parser utils

\*/

(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const ipfsParserName = "ipfs-parser";

  exports.httpGetToUint8Array = async function (url) {
    return await new Promise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.responseType = "arraybuffer";
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status !== 0) {
          if (xhr.status >= 300) {
            reject(new Error($tw.language.getString("NetworkError/XMLHttpRequest")));
            return;
          }
          try {
            const array = new Uint8Array(this.response);
            const logger = window.log.getLogger(ipfsParserName);
            logger.info("[" + xhr.status + "] Loaded:" + "\n " + url);
            resolve(array);
          } catch (error) {
            reject(error);
          }
        }
      };
      xhr.onerror = function () {
        reject(new Error($tw.language.getString("NetworkError/XMLHttpRequest")));
      };
      try {
        xhr.open("get", url.toString(), true);
        xhr.send();
      } catch (error) {
        reject(error);
      }
    });
  };

  /*
   * Load to Base64
   */
  exports.loadToBase64 = async function (url) {
    return await new Promise((resolve, reject) => {
      $tw.utils
        .httpGetToUint8Array(url)
        .then((array) => {
          // Empty
          if (array.length == 0) {
            resolve({
              data: "",
              decrypted: false,
            });
          }
          // Decrypt
          if ($tw.utils.isUtf8ArrayEncrypted(array)) {
            $tw.utils
              .decryptUint8ArrayToBase64(array)
              .then((base64) => {
                resolve({
                  data: base64,
                  decrypted: true,
                });
              })
              .catch((error) => {
                reject(error);
              });
          } else {
            resolve({
              data: $tw.utils.Uint8ArrayToBase64(array),
              decrypted: false,
            });
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  /*
   * Load to UTF-8
   */
  exports.loadToUtf8 = async function (url) {
    return await new Promise((resolve, reject) => {
      $tw.utils
        .httpGetToUint8Array(url)
        .then((array) => {
          // Empty
          if (array.length == 0) {
            resolve({
              data: "",
              decrypted: false,
            });
          }
          // Decrypt
          if ($tw.utils.isUtf8ArrayEncrypted(array)) {
            $tw.utils
              .decryptUint8ArrayToUtf8(array)
              .then((data) => {
                resolve({
                  data: data,
                  decrypted: true,
                });
              })
              .catch((error) => {
                reject(error);
              });
          } else {
            resolve({
              data: $tw.utils.Utf8ArrayToStr(array),
              decrypted: false,
            });
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  /*
   * Decrypt Uint8 Array to Base64 String
   */
  exports.decryptUint8ArrayToBase64 = async function (array) {
    return await new Promise((resolve, reject) => {
      try {
        var content = $tw.utils.Utf8ArrayToStr(array);
        if ($tw.crypto.hasPassword() == false) {
          (async () => {
            try {
              content = await $tw.utils.decryptFromPasswordPrompt(content);
            } catch (error) {
              reject(error);
            }
          })();
        } else {
          content = $tw.crypto.decrypt(content, $tw.crypto.currentPassword);
        }
        const base64 = btoa(content);
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    });
  };

  /*
   * Decrypt Uint8 Array to UTF-8 String
   */
  exports.decryptUint8ArrayToUtf8 = async function (array) {
    return await new Promise((resolve, reject) => {
      try {
        var content = $tw.utils.Utf8ArrayToStr(array);
        if ($tw.crypto.hasPassword() == false) {
          (async () => {
            try {
              content = await $tw.utils.decryptFromPasswordPrompt(content);
            } catch (error) {
              reject(error);
            }
          })();
        } else {
          content = $tw.crypto.decrypt(content, $tw.crypto.currentPassword);
        }
        resolve(content);
      } catch (error) {
        reject(error);
      }
    });
  };

  exports.decryptFromPasswordPrompt = async function (encrypted) {
    return await new Promise((resolve, reject) => {
      $tw.passwordPrompt.createPrompt({
        serviceName: "Enter a password to decrypt the imported content!!",
        noUserName: true,
        canCancel: true,
        submitText: "Decrypt",
        callback: function (data) {
          if (!data) {
            reject(new Error("User canceled password input..."));
            return false;
          }
          // Decrypt
          try {
            const content = $tw.crypto.decrypt(encrypted, data.password);
            resolve(content);
            return true;
          } catch (error) {
            reject(error);
            return false;
          }
        },
      });
    });
  };

  exports.isUtf8ArrayEncrypted = function (content) {
    // Check
    if (content instanceof Uint8Array == false || content.length == 0) {
      return false;
    }
    // Process
    const standford = $tw.utils.StringToUint8Array('{"iv":"');
    var encrypted = false;
    for (var i = 0; i < content.length && i < standford.length; i++) {
      if (content[i] == standford[i]) {
        encrypted = true;
      } else {
        encrypted = false;
        break;
      }
    }
    return encrypted;
  };
})();
