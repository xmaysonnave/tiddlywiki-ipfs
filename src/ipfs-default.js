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

/*
 * Retrieve ipfs saver priority with default value if applicable
 */
exports.getIpfsPriority = function() {
  var priority = null;
  if ($tw.wiki.getTiddler("$:/ipfs/saver/priority/default") !== undefined) {
    const text = $tw.wiki.getTiddler("$:/ipfs/saver/priority/default").getFieldString("text");
    if (text !== undefined && text.trim() !== "") {
      priority = text.trim();
    }
  }
  if (priority !== null && $tw.wiki.getTiddler(priority) !== undefined) {
    const text = $tw.wiki.getTiddler(priority).getFieldString("text");
    if (text !== undefined && text.trim() !== "") {
      priority = text.trim();
    }
  }
  if (priority === null) {
    priority = $tw.utils.getIpfsDefaultPriority();
  } else {
    try {
      priority = parseInt(priority);
    } catch (error) {
      console.error(error.message);
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
  if ($tw.wiki.getTiddler("$:/ipfs/saver/protocol") !== undefined) {
    const text = $tw.wiki.getTiddler("$:/ipfs/saver/protocol").getFieldString("text");
    if (text !== undefined && text.trim() !== "") {
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
  if ($tw.wiki.getTiddler("$:/ipfs/saver/api/default") !== undefined) {
    const text = $tw.wiki.getTiddler("$:/ipfs/saver/api/default").getFieldString("text");
    if (text !== undefined && text.trim() !== "") {
      api = text.trim();
    }
  }
  if (api !== null && $tw.wiki.getTiddler(api) !== undefined) {
    const text = $tw.wiki.getTiddler(api).getFieldString("text");
    if (text !== undefined && text.trim() !== "") {
      api = text.trim();
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
  if ($tw.wiki.getTiddler("$:/ipfs/saver/gateway/default") !== undefined) {
    const text = $tw.wiki.getTiddler("$:/ipfs/saver/gateway/default").getFieldString("text");
    if (text !== undefined && text.trim() !== "") {
      gateway = text.trim();
    }
  }
  if (gateway !== null && $tw.wiki.getTiddler(gateway) !== undefined) {
    const text = $tw.wiki.getTiddler(gateway).getFieldString("text");
    if (text !== undefined && text.trim() !== "") {
      gateway = text.trim();
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
  if ($tw.wiki.getTiddler("$:/ipfs/saver/ens/domain") !== undefined) {
    const text = $tw.wiki.getTiddler("$:/ipfs/saver/ens/domain").getFieldString("text");
    if (text !== undefined && text.trim() !== "") {
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
  if ($tw.wiki.getTiddler("$:/ipfs/saver/ipns/name") !== undefined) {
    const text = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/name").getFieldString("text");
    if (text !== undefined && text.trim() !== "") {
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
  if ($tw.wiki.getTiddler("$:/ipfs/saver/ipns/key") !== undefined) {
    const text = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key").getFieldString("text");
    if (text !== undefined && text.trim() !== "") {
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
  if ($tw.wiki.getTiddler("$:/ipfs/saver/verbose") !== undefined) {
    const text = $tw.wiki.getTiddler("$:/ipfs/saver/verbose").getFieldString("text");
    if (text !== undefined && text.trim() !== "") {
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
  if ($tw.wiki.getTiddler("$:/ipfs/saver/unpin") !== undefined) {
    const text = $tw.wiki.getTiddler("$:/ipfs/saver/unpin").getFieldString("text");
    if (text !== undefined && text.trim() !== "") {
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
  if ($tw.wiki.getTiddler("$:/ipfs/saver/policy") !== undefined) {
    const text = $tw.wiki.getTiddler("$:/ipfs/saver/policy").getFieldString("text");
    if (text !== undefined && text.trim() !== "") {
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
