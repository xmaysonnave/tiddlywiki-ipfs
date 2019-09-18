/*\
title: $:/plugins/ipfs/ipfs-utils.js
type: application/javascript
module-type: utils

Ipfs Saver

\*/

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.updateIpfsPriority = function() {
	// Locate Ipfs saver
	var saver;
	for (var i = 0; i < $tw.saverHandler.savers.length; i++) {
		var saver = $tw.saverHandler.savers[i];
		if (saver.info.name == "ipfs") {
			saver = $tw.saverHandler.savers[i];
			break;
		}
	}
	// Process ipfs saver verbose property
	if (saver == undefined) {
		return;
	}	
	// Load priority property
	saver.info.priority = $tw.utils.getIpfsPriority();
	// Sort the savers into priority order
	$tw.saverHandler.savers.sort(function(a, b) {
		if (a.info.priority < b.info.priority) {
			return -1;
		} else {
			if (a.info.priority > b.info.priority) {
				return +1;
			} else {
				return 0;
			}
		}
	});
	return saver.info.priority;
}

/*
Retrieve ipfs saver priority with default value if applicable
*/
exports.getIpfsPriority = function() {
	var priority = $tw.wiki.getTiddler("$:/ipfs/saver/priority/default");
	if (priority != undefined) {
		priority = priority.getFieldString("text");
	}
	priority = $tw.wiki.getTiddler(priority);
	if (priority != undefined) {
	 	priority = priority.getFieldString("text");
	}	
	if (priority == undefined || priority == null || priority.trim() == "") {
		priority = $tw.utils.getIpfsDefaultPriority();
	} else {
		try {
			priority = parseInt(priority);
		} catch (error) {
			console.log(error);
			priority = -1;
		}
	}
	return priority;
}

/*
Default Priority
*/
exports.getIpfsDefaultPriority = function() {
	return 3000;
}

/*
Retrieve ipfs saver protocol with default value if applicable
*/
exports.getIpfsProtocol = function() {
	var protocol;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/protocol") != undefined) {
		protocol = $tw.wiki.getTiddler("$:/ipfs/saver/protocol").getFieldString("text");
	}
	if (protocol == undefined || protocol == null || protocol.trim() == "") {
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
	var api = $tw.wiki.getTiddler("$:/ipfs/saver/api/default");
	if (api != undefined) {
		api = api.getFieldString("text");
	}
	api = $tw.wiki.getTiddler(api);
	if (api != undefined) {
	 	api = api.getFieldString("text");
	}	
	if (api == undefined || api == null || api.trim() == "") {
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
	var gateway = $tw.wiki.getTiddler("$:/ipfs/saver/gateway/default");
	if (gateway != undefined) {
		gateway = gateway.getFieldString("text");
	}
	gateway = $tw.wiki.getTiddler(gateway);
	if (gateway != undefined) {
	 	gateway = gateway.getFieldString("text");
	}	
	if (gateway == undefined || gateway == null || gateway.trim() == "") {
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
Retrieve ipfs saver ipns name with default value if applicable
*/
exports.getIpfsIpnsName = function() {
	var ipnsName;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/ipns/name") != undefined) {
		ipnsName = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/name").getFieldString("text");
	}
	if (ipnsName == undefined || ipnsName == null || ipnsName.trim() == "") {
		ipnsName = $tw.getIpfsDefaultIpnsName();
	}
	return ipnsName;
}

/*
Default Ipns Name
*/
exports.getIpfsDefaultIpnsName = function() {
	return "tiddly";
}

/*
Retrieve ipfs saver ipns key with default value if applicable
*/
exports.getIpfsIpnsKey = function() {
	var ipnsKey;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/ipns/key") != undefined) {
		ipnsKey = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key").getFieldString("text");
	}
	if (ipnsKey == undefined || ipnsKey == null || ipnsKey.trim() == "") {
		ipnsKey = $tw.utils.getIpfsDefaultIpnsKey();
	}
	return ipnsKey;
}

/*
Default Ipns Key
*/
exports.getIpfsDefaultIpnsKey = function() {
	return "QmV8ZQH9s4hHxPUeFJH17xt7GjmjGj8tEg7uQLz8HNSvFJ";
}

/*
Retrieve ipfs saver verbose with default value if applicable
*/
exports.getIpfsVerbose = function() {
	var verbose;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/verbose") != undefined) {
		verbose = $tw.wiki.getTiddler("$:/ipfs/saver/verbose").getFieldString("text");
	}
	if (verbose == undefined || verbose == null || verbose.trim() == "") {
		verbose = true;
	} else {
		verbose = ( verbose == $tw.utils.getIpfsDefaultVerbose() );
	}
	return verbose;
}

/*
Default Verbose
*/
exports.getIpfsDefaultVerbose = function() {
	return "yes";
}

/*
Retrieve ipfs saver policy with default value if applicable
*/
exports.getIpfsPolicy = function() {
	var policy;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/policy") != undefined) {
		policy = $tw.wiki.getTiddler("$:/ipfs/saver/policy").getFieldString("text");
	}
	if (policy == undefined || policy == null || policy.trim() == "") {
		policy = $tw.utils.getIpfsDefaultPolicy();
	}
	return policy;
}

/*
Default Policy
*/
exports.getIpfsDefaultPolicy = function() {
		return "default";
}

})();
