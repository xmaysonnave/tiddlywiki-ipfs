/*\
title: $:/plugins/ipfs/ipfs-wrapper.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsWrapper

\*/

(function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;

const ipfsKeyword = "/ipfs/";
const ipnsKeyword = "/ipns/";

var IpfsWrapper = function() {
  this.ipfsLibrary = new IpfsLibrary();
}

IpfsWrapper.prototype.isVerbose = function() {
  try {
    return $tw.utils.getIpfsVerbose();
  } catch (error) {
    return false;
  }
}

IpfsWrapper.prototype.getIpfsClient = async function() {
  // IPFS client
  try {
    var policy = { ipfs: null, provider: null };
    const ipfsPolicy = $tw.utils.getIpfsPolicy();
     if (ipfsPolicy === "window") {
      policy = await this.ipfsLibrary.getWindowIpfs();
    } else if (ipfsPolicy === "http") {
      policy = await this.ipfsLibrary.getHttpIpfs();
    } else  {
      policy  = await this.ipfsLibrary.getDefaultIpfs();
    }
    // Return if undefined
    if (policy.ipfs == null || policy.provider == null)  {
      return {
        error: new Error("Failed to get an IPFS provider..."),
        ipfs: null,
        provider: null
      };
    }
    if (this.isVerbose()) console.info(
      "IPFS provider: "
      + policy.provider
    );
    return {
      error: null,
      ipfs: policy.ipfs,
      provider: policy.provider
    };
  } catch (error) {
    return {
      error: error,
      ipfs: null,
      provider: null
    };
  }
}

IpfsWrapper.prototype.resolveIpns = async function(ipfs, ipnsKey, ipnsName) {

  var resolved = null;

  // Cleanup
  if (ipnsKey == undefined || ipnsKey == null) {
    ipnsKey = null;
  }
  if (ipnsName == undefined || ipnsName == null) {
    ipnsName = null;
  }

  // check
  if (ipnsKey == null && ipnsName == null) {
    return {
      error: new Error("Undefined IPNS key and IPNS name..."),
      ipnsName: null,
      ipnsKey: null,
      resolved: null
    };
  }

  // Load IPNS keys
  var { error, keys } = await this.getIpnsKeys(ipfs);
  if (error !== null)  {
    return {
      error: error,
      ipnsName: null,
      ipnsKey: null,
      resolved: null
    };
  }

  // Resolve IPNS name and IPNS key
  if (ipnsName !== null && ipnsKey !== null) {
    if (this.isVerbose()) console.info(
      "Resolve IPNS name: "
      + ipnsName
      + " and IPNS key: "
      + ipnsKey
    );
    var found = false;
    for (var index = 0; index < keys.length; index++) {
      if (keys[index].name === ipnsName && keys[index].id === ipnsKey) {
        found = true;
        break;
      }
    }
    if (found === false) {
      return {
        error: new Error("Unknown IPNS key and IPNS name..."),
        ipnsName: null,
        ipnsKey: null,
        resolved: null
      };
    }
    if (this.isVerbose()) console.info(
      "Successfully resolved IPNS name and IPNS key..."
    );
  } else if (ipnsName !== null) {
    if (this.isVerbose()) console.info(
      "Resolve IPNS name: "
      + ipnsName
    );
    var found = false;
    for (var index = 0; index < keys.length; index++) {
      if (keys[index].name === ipnsName) {
        ipnsKey = keys[index].id;
        found = true;
        break;
      }
    }
    if (found === false) {
      return {
        error: new Error("Unknown IPNS name..."),
        ipnsName: null,
        ipnsKey: null,
        resolved: null
      };
    }
    if (this.isVerbose()) console.info(
      "Successfully fetched IPNS key: "
      + ipnsKey
    );
  } else {
    if (this.isVerbose()) console.info(
      "Resolve IPNS key: "
      + ipnsKey
    );
    var found = false;
    for (var index = 0; index < keys.length; index++) {
      if (keys[index].id === ipnsKey) {
        ipnsName = keys[index].name;
        found = true;
        break;
      }
    }
    if (found === false) {
      return {
        error: new Error("Unknown IPNS key..."),
        ipnsName: null,
        ipnsKey: null,
        resolved: null
      };
    }
    if (this.isVerbose()) console.info(
      "Successfully resolved IPNS name: "
      + ipnsName
    );
  }

  // Resolve IPNS key if any
  // ipfs-http-client generates different kind of errors when an IPNS key is unassigned
  var { error, resolved } = await this.resolveIpnsKey(ipfs, ipnsKey);
  if (error !== null) {
    return {
      error: error,
      ipnsName: ipnsName,
      ipnsKey: ipnsKey,
      resolved: null
    }
  }

  // Resolve cid
  const { cid } = await this.ipfsLibrary.decodeCid(resolved);
  return {
    error: null,
    ipnsName: ipnsName,
    ipnsKey: ipnsKey,
    resolved: cid
  }

}

IpfsWrapper.prototype.generateIpnsKey = async function(ipfs, name) {
  try {
    const id = await this.ipfsLibrary.genKey(ipfs, name);
    if (id == undefined || id == null)  {
      return {
        error: new Error("Failed to generate IPNS key..."),
        key: null
      };
    }
    if (this.isVerbose()) console.info(
      "Successfully generated IPNS key: "
      + id
    );
    return {
      error: null,
      key: id
    };
  } catch (error) {
    return {
      error: error,
      key: null
    };
  }
}

IpfsWrapper.prototype.removeIpnsKey = async function(ipfs, name) {
  try {
    const id = await this.ipfsLibrary.rmKey(ipfs, name);
    if (id == undefined || id == null)  {
      return {
        error: new Error("Failed to remove IPNS key..."),
        key: null
      };
    }
    if (this.isVerbose()) console.info(
      "Successfully removed IPNS name: "
      + name
      + " and IPNS key: "
      + id
    );
    return {
      error: null,
      key: id
    };
  } catch (error) {
    return {
      error: error,
      key: null
    };
  }
}

IpfsWrapper.prototype.getIpnsKeys = async function(ipfs) {
  try {
    const keys = await this.ipfsLibrary.getKeys(ipfs);
    if (keys == undefined || keys == null)  {
      return {
        error: new Error("Failed to fetch IPNS keys..."),
        keys: null
      };
    }
    if (this.isVerbose()) console.info("Successfully fetched IPNS keys...");
    return {
      error: null,
      keys: keys
    };
  } catch (error) {
    return {
      error: error,
      keys: null
    };
  }
}

IpfsWrapper.prototype.fetchFromIpfs = async function(ipfs, cid) {
  try {
    const fetched = await this.ipfsLibrary.cat(ipfs, ipfsKeyword + cid);
    if (fetched == undefined || fetched == null)  {
      return {
        error: new Error("Failed to fetch: " + ipfsKeyword + cid),
        fetched: null
      };
    }
    if (this.isVerbose()) console.info(
      "Successfully fetched: "
      + ipfsKeyword
      + cid
    );
    return {
      error: null,
      fetched: fetched
    };
  } catch (error) {
    return {
      error: error,
      fetched: null
    };
  }
}

IpfsWrapper.prototype.addToIpfs = async function(ipfs, content) {
  // Add
  try {
    const added = await this.ipfsLibrary.add(ipfs, content);
    if (added == undefined || added == null || Array.isArray(added) == false || added.length == 0) {
      return {
        error: new Error("Failed to add content..."),
        added: null
      };
    }
    if (this.isVerbose()) console.info(
      "Successfully added content: "
      + ipfsKeyword
      + added[0].hash
    );
    return {
      error: null,
      added: added[0].hash
    };
  } catch (error) {
    return {
      error: error,
      added: null
    };
  };
}

IpfsWrapper.prototype.resolveIpnsKey = async function(ipfs, id) {
  // Resolve
  try {
    const resolved = await this.ipfsLibrary.resolve(ipfs, ipnsKeyword + id);
    if (resolved == undefined || resolved == null) {
      return {
        error: new Error("Failed to resolve IPNS key..."),
        resolved: null
      };
    }
    if (this.isVerbose()) console.info(
      "Successfully resolved IPNS key: "
      + resolved
    );
    return {
      error: null,
      resolved: resolved
    };
  } catch (error) {
    return {
      error: error,
      resolved: null
    };
  };
}

IpfsWrapper.prototype.publishToIpfs = async function(ipfs, name, cid) {
  // Publish
  try {
    const published = await this.ipfsLibrary.publish(ipfs, name, ipfsKeyword + cid);
    if (published == undefined || published == null) {
      return {
        error: new Error("Failed to publish..."),
        published: null
      };
    }
    if (this.isVerbose()) console.info(
      "Successfully published: "
      + ipfsKeyword
      + cid
    );
    return {
      error: null,
      published: published
    };
  } catch (error) {
    return {
      error: error,
      published: null
    };
  };
}

IpfsWrapper.prototype.pinToIpfs = async function(ipfs, cid) {
  // Unpin
  try {
    const pinned = await this.ipfsLibrary.pin(ipfs, ipfsKeyword + cid);
    if (pinned == undefined || pinned == null) {
      return {
        error: new Error( "Failed to pin..."),
        pinned: null
      };
    }
    if (this.isVerbose()) console.info(
      "Successfully pinned: "
      + ipfsKeyword
      + cid
    );
    return {
      error: null,
      pinned: pinned
    };
  } catch (error) {
    return {
      error: error,
      pinned: null
    };
  };
}

IpfsWrapper.prototype.unpinFromIpfs = async function(ipfs, cid) {
  // Unpin
  try {
    const unpinned = await this.ipfsLibrary.unpin(ipfs, ipfsKeyword + cid);
    if (unpinned == undefined || unpinned == null) {
      return {
        error: new Error("Failed to unpin..."),
        unpinned: null
      };
    }
    if (this.isVerbose()) console.info(
      "Successfully unpinned: "
      + ipfsKeyword
      + cid
    );
    return {
      error: null,
      unpinned: unpinned
    };
  } catch (error) {
    return {
      error: error,
      unpinned: null
    };
  };
}

exports.IpfsWrapper = IpfsWrapper;

})();
