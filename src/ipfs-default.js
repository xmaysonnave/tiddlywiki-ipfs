/*\
title: $:/plugins/ipfs/ipfs-default.js
type: application/javascript
module-type: utils

utils

\*/

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Retrieve ipfs saver priority with default value if applicable
*/
exports.getIpfsPriority = function() {
  var priority = null;
  if ($tw.wiki.getTiddler("$:/ipfs/saver/priority/default") !== undefined) {
    priority = $tw.wiki.getTiddler("$:/ipfs/saver/priority/default").getFieldString("text");
  }
  if (priority !== null && $tw.wiki.getTiddler(priority) !== undefined) {
    priority = $tw.wiki.getTiddler(priority).getFieldString("text");
  }
  if (priority === null || priority.trim() === "") {
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
Default Priority
*/
exports.getIpfsDefaultPriority = function() {
  return 3100;
}

/*
Retrieve ipfs saver protocol with default value if applicable
*/
exports.getIpfsProtocol = function() {
  var protocol = null;
  if ($tw.wiki.getTiddler("$:/ipfs/saver/protocol") !== undefined) {
    protocol = $tw.wiki.getTiddler("$:/ipfs/saver/protocol").getFieldString("text");
  }
  if (protocol === null || protocol.trim() === "") {
    protocol = $tw.utils.getIpfsDefaultProtocol();
  }
  return protocol;
}

/*
Default Protocol
*/
exports.getIpfsDefaultProtocol = function() {
  return "ipfs";
}

/*
Retrieve ipfs saver api url with default value if applicable
*/
exports.getIpfsApiUrl = function() {
  var api = null;
  if ($tw.wiki.getTiddler("$:/ipfs/saver/api/default") !== undefined) {
    api = $tw.wiki.getTiddler("$:/ipfs/saver/api/default").getFieldString("text");
  }
  if (api !== null && $tw.wiki.getTiddler(api) !== undefined) {
    api = $tw.wiki.getTiddler(api).getFieldString("text");
  }
  if (api === null || api.trim() === "") {
    api = $tw.utils.getIpfsDefaultApiUrl();
  }
  return api;
}

/*
Default Api Url
*/
exports.getIpfsDefaultApiUrl = function() {
  return "https://ipfs.infura.io:5001";
}

/*
Retrieve ipfs saver gateway url with default value if applicable
*/
exports.getIpfsGatewayUrl = function() {
  var gateway = null;
  if ($tw.wiki.getTiddler("$:/ipfs/saver/gateway/default") !== undefined) {
    gateway = $tw.wiki.getTiddler("$:/ipfs/saver/gateway/default").getFieldString("text");
  }
  if (gateway !== null && $tw.wiki.getTiddler(gateway) !== undefined) {
    gateway = $tw.wiki.getTiddler(gateway).getFieldString("text");
  }
  if (gateway === null || gateway.trim() === "") {
    gateway = $tw.utils.getIpfsDefaultGatewayUrl();
  }
  return gateway;
}

/*
Default Gateway Url
*/
exports.getIpfsDefaultGatewayUrl = function() {
  return "https://ipfs.infura.io";
}

/*
Retrieve ipfs saver ens domain with default value if applicable
*/
exports.getIpfsEnsDomain = function() {
  var ensDomain = null;
  if ($tw.wiki.getTiddler("$:/ipfs/saver/ens/domain") !== undefined) {
    ensDomain = $tw.wiki.getTiddler("$:/ipfs/saver/ens/domain").getFieldString("text");
  }
  return ensDomain;
}

/*
Retrieve ipfs saver ipns name with default value if applicable
*/
exports.getIpfsIpnsName = function() {
  var ipnsName = null;
  if ($tw.wiki.getTiddler("$:/ipfs/saver/ipns/name") !== undefined) {
    ipnsName = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/name").getFieldString("text");
  }
  return ipnsName;
}

/*
Retrieve ipfs saver ipns key with default value if applicable
*/
exports.getIpfsIpnsKey = function() {
  var ipnsKey = null;
  if ($tw.wiki.getTiddler("$:/ipfs/saver/ipns/key") !== undefined) {
    ipnsKey = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key").getFieldString("text");
  }
  return ipnsKey;
}

/*
Retrieve ipfs saver verbose with default value if applicable
*/
exports.getIpfsVerbose = function() {
  var verbose = null;
  if ($tw.wiki.getTiddler("$:/ipfs/saver/verbose") !== undefined) {
    verbose = $tw.wiki.getTiddler("$:/ipfs/saver/verbose").getFieldString("text");
  }
  if (verbose === null || verbose.trim() === "") {
    verbose = true; // default, see ipfs-saver.tid
  } else {
    verbose = ( verbose === "yes" );
  }
  return verbose;
}

/*
Retrieve ipfs saver unpin with default value if applicable
*/
exports.getIpfsUnpin = function() {
  var unpin = null;
  if ($tw.wiki.getTiddler("$:/ipfs/saver/unpin") !== undefined) {
    unpin = $tw.wiki.getTiddler("$:/ipfs/saver/unpin").getFieldString("text");
  }
  if (unpin === null || unpin.trim() === "") {
    unpin = false; // default, see ipfs-saver.tid
  } else {
    unpin = ( unpin === "yes" );
  }
  return unpin;
}

/*
Retrieve ipfs saver policy with default value if applicable
*/
exports.getIpfsPolicy = function() {
  var policy = null;
  if ($tw.wiki.getTiddler("$:/ipfs/saver/policy") !== undefined) {
    policy = $tw.wiki.getTiddler("$:/ipfs/saver/policy").getFieldString("text");
  }
  if (policy === null || policy.trim() === "") {
    policy = $tw.utils.getIpfsDefaultPolicy();
  }
  return policy;
}

/*
Default Policy
*/
exports.getIpfsDefaultPolicy = function() {
  return "http";
}

})();
