/*\
title: $:/plugins/ipfs/ipfs-module.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsModule

\*/


(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/**
 * https://github.com/purposeindustries/window-or-global
 * The MIT License (MIT) Copyright (c) Purpose Industries
 * version: 1.0.1
 */
const root = (typeof self === 'object' && self.self === self && self)
  || (typeof global === 'object' && global.global === global && global)
  || this;

const name = "ipfs-module";

var IpfsModule = function() {};

IpfsModule.prototype.isVerbose = function() {
  try {
    return $tw.utils.getIpfsVerbose();
  } catch (error) {
    return true;
  }
}

IpfsModule.prototype.getLogger = function(name) {
  var logger = null;
  // Retrieve
  if (root !== undefined && root.log !== undefined) {
    if (name == undefined || name == null || name.trim() === "") {
      logger = root.log;
    } else {
      logger = root.log.getLogger(name);
    }
  } else {
    logger = console;
  }
  return logger;
}

IpfsModule.prototype.updateLoggers = function(level) {
  root.log.setLevel(level, false);
  const loggers = root.log.getLoggers();
  for (var property in loggers) {
    if (Object.prototype.hasOwnProperty.call(loggers, property)) {
      const logger = root.log.getLogger(property);
      logger.setLevel(level, false);
    }
  }
}

// https://www.srihash.org/
// https://github.com/liriliri/eruda
IpfsModule.prototype.loadErudaLibrary = async function() {
  if (typeof root.eruda === "undefined") {
    await this.loadLibrary(
      "ErudaLibrary",
      "https://cdn.jsdelivr.net/npm/eruda@2.0.2/eruda.min.js",
      "sha384-GLqmQCByhqGAIgMwKsNaIgNZgaNZel7Moqd2mEoeQWUXUVBth0Yo3Nt6QiWiG9+w"
    );
  }
}

// https://www.srihash.org/
// https://github.com/ethers-io/ethers.js/
IpfsModule.prototype.loadEtherJsLibrary = async function() {
  if (typeof root.ethers === "undefined") {
    return await this.loadLibrary(
      "EtherJsLibrary",
      "https://cdn.jsdelivr.net/npm/ethers@4.0.44/dist/ethers.min.js",
      "sha384-OVtNQuuquwgl2WspNZSP1tVXyso/+dUUAU7tGnC1bV7vjXGwQN8RUG13biHCbHij",
      true
    );
  }
}

// https://www.srihash.org/
// https://github.com/ipfs/js-ipfs-http-client
IpfsModule.prototype.loadIpfsHttpLibrary = async function() {
  if (typeof root.IpfsHttpClient === "undefined") {
    await this.loadLibrary(
      "IpfsHttpLibrary",
      "https://cdn.jsdelivr.net/npm/ipfs-http-client@41.0.1/dist/index.min.js",
      "sha384-FhotltYqd3Ahyy0tJkqdR0dTReYsWEk0NQpF+TAxMPl15GmLtZhZijk1j/Uq7Xsh",
      true
    );
    root.httpClient = root.IpfsHttpClient;
  }
}

// https://observablehq.com/@bryangingechen/dynamic-import-polyfill
IpfsModule.prototype.loadLibrary = async function(id, url, sri, module) {
  const self = this;
  return new Promise((resolve, reject) => {
    try {
      if (document.getElementById(id) == null) {
        const script = document.createElement("script");
        // Cleanup function
        const cleanup = () => {
          delete root[id];
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
          resolve(root[id]);
          cleanup();
          self.getLogger(name).info(
            "Loaded: "
            + url
          );
        }
        script.onerror = () => {
          reject(new Error("Failed to load: " + url));
          cleanup();
        }
      } else {
        return resolve(root[id]);
      }
    } catch (error) {
      reject(error);
    }
  });
};

exports.IpfsModule = IpfsModule;

})();
