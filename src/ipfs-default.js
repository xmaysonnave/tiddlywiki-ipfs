/*\
title: $:/plugins/ipfs/ipfs-default.js
type: application/javascript
tags: $:/ipfs/core
module-type: utils

utils

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const root = (typeof self === 'object' && self.self === self && self)
  || (typeof global === 'object' && global.global === global && global)
  || this;

/*
 * Retrieve ipfs saver priority with default value if applicable
 */
exports.getIpfsPriority = function() {
  var priority = null;
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/priority/default");
  if (tiddler !== undefined && tiddler !== null) {
    const text = tiddler.getFieldString("text");
    if (text !== undefined && text !== null && text.trim() !== "") {
      priority = text.trim();
    }
  }
  if (priority !== null) {
    tiddler = $tw.wiki.getTiddler(priority);
    if (tiddler !== undefined && tiddler !== null) {
      const text = tiddler.getFieldString("text");
      if (text !== undefined && text !== null && text.trim() !== "") {
        priority = text.trim();
      }
    }
  }
  if (priority === null) {
    priority = $tw.utils.getIpfsDefaultPriority();
  } else {
    try {
      priority = parseInt(priority);
    } catch (error) {
      const logger = root.log.getLogger();
      logger.error(error);
      $tw.utils.alert("ipfs-default", error.message);
      priority = -1;
    }
  }
  return priority;
}

/*
 * Default Priority
 */
exports.getIpfsDefaultPriority = function() {
  return 3100;
}

/*
 * Retrieve ipfs saver protocol with default value if applicable
 */
exports.getIpfsProtocol = function() {
  var protocol = null;
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/protocol");
  if (tiddler !== undefined && tiddler !== null) {
    const text = tiddler.getFieldString("text");
    if (text !== undefined && text !== null && text.trim() !== "") {
      protocol = text.trim();
    }
  }
  if (protocol === null) {
    protocol = $tw.utils.getIpfsDefaultProtocol();
  }
  return protocol;
}

/*
 * Default Protocol
 */
exports.getIpfsDefaultProtocol = function() {
  return "ipfs";
}

/*
 * Retrieve ipfs saver api url with default value if applicable
 */
exports.getIpfsApiUrl = function() {
  var api = null;
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/api/default");
  if (tiddler !== undefined && tiddler !== null) {
    const text =tiddler.getFieldString("text");
    if (text !== undefined && text !== null && text.trim() !== "") {
      api = text.trim();
    }
  }
  if (api !== null) {
    tiddler = $tw.wiki.getTiddler(api);
    if (tiddler !== undefined && tiddler !== null) {
      const text = tiddler.getFieldString("text");
      if (text !== undefined && text !== null && text.trim() !== "") {
        api = text.trim();
      }
    }
  }
  if (api === null) {
    api = $tw.utils.getIpfsDefaultApiUrl();
  }
  return api;
}

/*
 * Default API URL
 */
exports.getIpfsDefaultApiUrl = function() {
  return "https://ipfs.infura.io:5001";
}

/*
 * Retrieve ipfs saver gateway url with default value if applicable
 */
exports.getIpfsGatewayUrl = function() {
  var gateway = null;
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/gateway/default");
  if (tiddler !== undefined && tiddler !== null) {
    const text = tiddler.getFieldString("text");
    if (text !== undefined && text !== null && text.trim() !== "") {
      gateway = text.trim();
    }
  }
  if (gateway !== null) {
    tiddler = $tw.wiki.getTiddler(gateway);
    if ($tw.wiki.getTiddler(gateway) !== undefined) {
      const text = $tw.wiki.getTiddler(gateway).getFieldString("text");
      if (text !== undefined && text !== null && text.trim() !== "") {
        gateway = text.trim();
      }
    }
  }
  if (gateway === null) {
    gateway = $tw.utils.getIpfsDefaultGatewayUrl();
  }
  return gateway;
}

/*
 * Default Gateway URL
 */
exports.getIpfsDefaultGatewayUrl = function() {
  return "https://ipfs.infura.io";
}

/*
 * Retrieve ipfs saver ens domain with default value if applicable
 */
exports.getIpfsEnsDomain = function() {
  var ensDomain = null;
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ens/domain");
  if (tiddler !== undefined && tiddler !== null) {
    const text = tiddler.getFieldString("text");
    if (text !== undefined && text !== null && text.trim() !== "") {
      ensDomain = text.trim();
    }
  }
  return ensDomain;
}

/*
 * Retrieve ipfs saver ipns name with default value if applicable
 */
exports.getIpfsIpnsName = function() {
  var ipnsName = null;
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/name");
  if (tiddler !== undefined && tiddler !== null) {
    const text = tiddler.getFieldString("text");
    if (text !== undefined && text !== null && text.trim() !== "") {
      ipnsName = text.trim();
    }
  }
  return ipnsName;
}

/*
 * Retrieve ipfs saver ipns key with default value if applicable
 */
exports.getIpfsIpnsKey = function() {
  var ipnsKey = null;
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
  if (tiddler !== undefined && tiddler !== null) {
    const text = tiddler.getFieldString("text");
    if (text !== undefined && text !== null && text.trim() !== "") {
      ipnsKey = text.trim();
    }
  }
  return ipnsKey;
}

/*
 * Retrieve ipfs saver verbose with default value if applicable
 */
exports.getIpfsVerbose = function() {
  var verbose = null;
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/verbose");
  if (tiddler !== undefined && tiddler !== null) {
    const text = tiddler.getFieldString("text");
    if (text !== undefined && text !== null && text.trim() !== "") {
      verbose = text.trim();
    }
  }
  if (verbose === null) {
    verbose = true; // default, see ipfs-saver.tid
  } else {
    verbose = ( verbose === "yes" );
  }
  return verbose;
}

/*
 * Retrieve ipfs saver unpin with default value if applicable
 */
exports.getIpfsUnpin = function() {
  var unpin = null;
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/unpin");
  if (tiddler !== undefined && tiddler !== null) {
    const text = tiddler.getFieldString("text");
    if (text !== undefined && text !== null && text.trim() !== "") {
      unpin = text.trim();
    }
  }
  if (unpin === null) {
    unpin = false; // default, see ipfs-saver.tid
  } else {
    unpin = ( unpin === "yes" );
  }
  return unpin;
}

/*
 * Retrieve ipfs saver policy with default value if applicable
 */
exports.getIpfsPolicy = function() {
  var policy = null;
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/policy");
  if (tiddler !== undefined && tiddler !== null) {
    const text = tiddler.getFieldString("text");
    if (text !== undefined && text !== null && text.trim() !== "") {
      policy = text.trim();
    }
  }
  if (policy === null) {
    policy = $tw.utils.getIpfsDefaultPolicy();
  }
  return policy;
}

/*
 * Default Policy
 */
exports.getIpfsDefaultPolicy = function() {
  return "http";
}

})();
