/*\
title: $:/plugins/ipfs/ipfs-wrapper.js
type: application/javascript
module-type: library

IpfsWrapper

\*/

(function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsLibrary = require("$:/plugins/ipfs/ipfs-library.js").IpfsLibrary;
const ipfsKeyword = "/ipfs/";
const ipnsKeyword = "/ipns/";

var IpfsWrapper = function() {
  this.ipfsLibrary = new IpfsLibrary();
}

IpfsWrapper.prototype.getIpfsClient = async function() {
  // Getting an IPFS client
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
    if ($tw.utils.getIpfsVerbose()) console.info(
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

IpfsWrapper.prototype.genKey = async function(ipfs, name) {
  try {
    const { id } = await this.ipfsLibrary.genKey(ipfs, name);
    if (id == undefined || id == null)  {
      return {
        error: new Error("Failed to generate key..."),
        key: null
      };
    }
    if ($tw.utils.getIpfsVerbose()) console.info(
      "Successfully generated key: "
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
        error: new Error("Failed to fetch keys..."),
        keys: null
      };
    }
    if ($tw.utils.getIpfsVerbose()) console.info("Successfully fetched keys...");
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
    if ($tw.utils.getIpfsVerbose()) console.info(
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
    if ($tw.utils.getIpfsVerbose()) console.info(
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

IpfsWrapper.prototype.resolveIpnsKey = async function(ipfs, cid) {
  // Resolve
  try {
    const resolved = await this.ipfsLibrary.resolve(ipfs, ipnsKeyword + cid);
    if (resolved == undefined || resolved == null) {
      return {
        error: new Error("Failed to resolve..."),
        resolved: null
      };
    }
    if ($tw.utils.getIpfsVerbose()) console.info(
      "Successfully resolved: "
      + ipfsKeyword
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
    if ($tw.utils.getIpfsVerbose()) console.info(
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
    if ($tw.utils.getIpfsVerbose()) console.info(
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
    if ($tw.utils.getIpfsVerbose()) console.info(
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
