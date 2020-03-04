/*\
title: $:/plugins/ipfs/ipfs-loader.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsLoader

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const name = "ipfs-loader";

var IpfsLoader = function() {};

IpfsLoader.prototype.getLogger = function() {
  return window.log.getLogger(name);
}

// https://www.srihash.org/
// https://github.com/liriliri/eruda
IpfsLoader.prototype.loadErudaLibrary = async function() {
  if (typeof window.eruda === "undefined") {
    await this.loadLibrary(
      "ErudaLibrary",
      "https://cdn.jsdelivr.net/npm/eruda@2.2.0/eruda.min.js",
      "sha384-sve9vKF7rVhGjHytBsbmmRhVEQTzx4c/spMUeDLEhhCcG0iDy3MsPmfcntLvxdAr",
      true
    );
  }
}

// https://www.srihash.org/
// https://github.com/ethers-io/ethers.js/
IpfsLoader.prototype.loadEtherJsLibrary = async function() {
  if (typeof window.ethers === "undefined") {
    return await this.loadLibrary(
      "EtherJsLibrary",
      "https://cdn.jsdelivr.net/npm/ethers@4.0.45/dist/ethers.min.js",
      "sha384-BxarTKFrgqsLDUOaHdnRc2aPTsVEcI3C3oXX5GGKIxGujBbuI8VwE9+/lg0ZZ9z/",
      true
    );
  }
}

// https://www.srihash.org/
// https://github.com/ipfs/js-ipfs-http-client
IpfsLoader.prototype.loadIpfsHttpLibrary = async function() {
  if (typeof window.httpClient === "undefined" || typeof window.IpfsHttpClient === "undefined") {
    await this.loadLibrary(
      "IpfsHttpLibrary",
      "https://cdn.jsdelivr.net/npm/ipfs-http-client@42.0.0/dist/index.min.js",
      "sha384-hKDlPpK3wIo1LK7HkujR9KvI1F12YCpl2YpXEYcG+i7iHK16x4BwBL3p8NsAWBnt",
      true
    );
    window.httpClient = window.IpfsHttpClient;
  }
}

// https://observablehq.com/@bryangingechen/dynamic-import-polyfill
IpfsLoader.prototype.loadLibrary = async function(id, url, sri, module) {
  const self = this;
  return new Promise((resolve, reject) => {
    try {
      // Loaded
      if (window.document.getElementById(id) !== null) {
        return resolve(window[id]);
      }
      // Process
      const script = window.document.createElement("script");
      // Functions
      const cleanup = () => {
        delete window[id];
        script.onerror = null;
        script.onload = null;
        script.remove();
        URL.revokeObjectURL(script.src);
        script.src = "";
      };
      script.onload = () => {
        resolve(window[id]);
        cleanup();
        if (module) {
          self.getLogger(name).info(
            "Loaded Module:"
            + "\n "
            + url
          );
        } else {
          self.getLogger(name).info(
            "Loaded Script:"
            + "\n "
            + url
          );
        }
      }
      script.onerror = () => {
        reject(new Error("Failed to load: " + url));
        cleanup();
      }
      // Attributes
      if (module) {
        script.type = "module";
      } else {
        script.type = "text/javascript";
      }
      script.id = id;
      script.async = false;
      script.defer = "defer";
      if (sri) {
        script.integrity = sri;
      }
      script.crossOrigin = "anonymous";
      // URL
      script.src = url.toString();
      // Append
      window.document.head.appendChild(script);
    } catch (error) {
      reject(error);
    }
  });
};

exports.IpfsLoader = IpfsLoader;

})();
