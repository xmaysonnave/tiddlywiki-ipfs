/*\
title: $:/plugins/ipfs/ipfs-saver.js
type: application/javascript
tags: $:/ipfs/core
module-type: saver

IpfsSaver

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;
const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;

const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;

const fileProtocol = "file:";
const ensKeyword = "ens";
const ipfsKeyword = "ipfs";
const ipnsKeyword = "ipns";

/*
 * Select the appropriate saver module and set it up
 */
var IpfsSaver = function(wiki) {
  const self = this;
  this.wiki = wiki;
  this.apiUrl = null;
  this.ipfsProvider = null;
  this.toBeUnpinned = [];
  this.ipfsWrapper = new IpfsWrapper();
  this.ensWrapper = new EnsWrapper();
  this.ipfsLibrary = new IpfsLibrary();
  $tw.rootWidget.addEventListener("tm-ipfs-pin", function(event) {
    return self.handleIpfsPin(self, event);
  });
  $tw.rootWidget.addEventListener("tm-ipfs-unpin", function(event) {
    return self.handleIpfsUnpin(self, event);
  });
  $tw.hooks.addHook("th-deleting-tiddler", function(tiddler) {
    return self.handleDeleteTiddler(self, tiddler);
  });
  $tw.hooks.addHook("th-saving-tiddler", function(tiddler) {
    return self.handleSaveTiddler(self, tiddler);
  });
}

IpfsSaver.prototype.isVerbose = function() {
  try {
    return $tw.utils.getIpfsVerbose();
  } catch (error) {
    return false;
  }
}

IpfsSaver.prototype.save = async function(text, method, callback, options) {

  // Is there anything to do
  if ($tw.saverHandler.isDirty() == false) {
    return false;
  }

  try {

    // Init
    var ipfsProtocol = null;
    var ipnsKey = null;
    var ipnsName = null;
    var ipnsContent = null;
    var cid = null;
    var ensDomain = null;
    var ensContent = null;
    var web3Provider = null;
    var account = null;
    var nextHost = null;
    var nextWiki = null;
    var options = options || {};

    // Process document URL
    const {
      protocol: wikiProtocol,
      host: wikiHost,
      pathname: wikiPathname,
      search: wikiSearch,
      fragment: wikiFragment
    } = this.ipfsLibrary.parseUrl(document.URL);

    // Retrieve Gateway URL
    const gatewayUrl = $tw.utils.getIpfsGatewayUrl();
    // Check
    if (gatewayUrl == null) {
      const msg = "Undefined IPFS Gateway URL...";
      console.error(msg);
      callback(msg);
      return false;
    }

    // Process Gateway URL
    const {
      protocol: gatewayProtocol,
      host: gatewayHost
    } = this.ipfsLibrary.parseUrl(gatewayUrl);

    // URL Analysis
    if (wikiProtocol !== fileProtocol) {
      // Decode pathname
      var { protocol, cid } = this.ipfsLibrary.decodeCid(wikiPathname);
      // Check
      if (protocol != null && cid != null) {
        // Store current protocol
        ipfsProtocol = protocol;
        // Request to unpin if applicable
        if ($tw.utils.getIpfsUnpin() && ipfsProtocol === ipfsKeyword) {
          if (this.toBeUnpinned.indexOf(cid) == -1) {
            const unpin = cid;
            this.toBeUnpinned.push(unpin);
            if (this.isVerbose()) console.info(
              "Request to unpin: /"
              + ipfsKeyword
              + "/"
              + unpin
            );
          }
        }
      }
      // Next host
      nextHost = wikiProtocol
      + "//"
      + wikiHost
    } else {
      // Next host
      nextHost = gatewayProtocol
      + "//"
      + gatewayHost
    }

    // IPFS client
    var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
    if (error != null)  {
      console.error(error);
      callback(error.message);
      return false;
    }

    // IPNS Analysis
    if (ipfsProtocol === ipnsKeyword || $tw.utils.getIpfsProtocol() === ipnsKeyword) {

      // Resolve current IPNS
      if (ipfsProtocol === ipnsKeyword) {
        if (this.isVerbose()) console.info("Processing current IPNS...");
        var { error, ipnsName, ipnsKey, resolved: ipnsContent } = await this.ipfsWrapper.resolveIpns(ipfs, cid);
        if (error != null)  {
          // Log and continue
          if (ipnsName !== null && ipnsKey !== null) {
            console.warn(error);
            console.warn("Unable to resolve current IPNS key...");
          } else {
            console.warn(error);
          }
          // Fallback
          if (ipnsName === null && ipnsKey === null && $tw.utils.getIpfsProtocol() === ipnsKeyword) {
            ipnsName = $tw.utils.getIpfsIpnsName();
            ipnsKey = $tw.utils.getIpfsIpnsKey();
            if (this.isVerbose()) console.info("Processing default IPNS...");
            var { error, ipnsName, ipnsKey, resolved: ipnsContent } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
            if (error != null) {
              if (ipnsName !== null && ipnsKey !== null) {
                console.warn(error);
                console.warn("Unable to resolve default IPNS key...");
              } else {
                // Unable to resolve current and default
                console.error(error);
                callback(error.message);
                return false;
              }
            }
          }
        }
      // Resolve default IPNS
      } else {
        ipnsName = $tw.utils.getIpfsIpnsName();
        ipnsKey = $tw.utils.getIpfsIpnsKey();
        if (this.isVerbose()) console.info("Processing default IPNS...");
        var { error, ipnsName, ipnsKey, resolved: ipnsContent } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
        if (error != null) {
          if (ipnsName !== null && ipnsKey !== null) {
            console.warn(error);
            console.warn("Unable to resolve default IPNS key...");
          } else {
            // Unable to resolve current and default
            console.error(error);
            callback(error.message);
            return false;
          }
        }
      }

      // Store to unpin previous if any
      if ($tw.utils.getIpfsUnpin() && ipnsContent !== null) {
        if (this.toBeUnpinned.indexOf(ipnsContent) == -1) {
          this.toBeUnpinned.push(ipnsContent);
          if (this.isVerbose()) console.info(
            "Request to unpin: /"
            + ipfsKeyword
            + "/"
            + ipnsContent
          );
        }
      }

    }

    // ENS Analysis
    if ($tw.utils.getIpfsProtocol() === ensKeyword) {

      // Getting default ens domain
      ensDomain = $tw.utils.getIpfsEnsDomain();
      // Check
      if (ensDomain == null) {
        const msg  ="Undefined ENS domain...";
        console.error(msg);
        callback(msg);
        return false;
      }

      // Retrieve a Web3 provider
      var { error, web3Provider, account } = await this.ensWrapper.getWeb3Provider();
      if (error != null)  {
        console.error(error);
        callback(error.message);
        return false;
      }

      // Fetch ENS domain content
      var { error, decoded: ensContent, protocol } = await this.ensWrapper.getContenthash(ensDomain, web3Provider, account);
      if (error != null)  {
        console.error(error);
        callback(error.message);
        return false;
      }

      // Store to unpin previous if any
      if ($tw.utils.getIpfsUnpin() && ensContent !== null) {
        // Store to unpin previous
        if (this.toBeUnpinned.indexOf(ensContent) == -1) {
          this.toBeUnpinned.push(ensContent);
          if (this.isVerbose()) console.info(
            "Request to unpin: /"
            + ipfsKeyword
            + "/"
            + ensContent
          );
        }
      }

    }

    // Upload  current document
    if (this.isVerbose()) console.info(
      "Uploading wiki: "
      + text.length
      + " bytes"
    );

    // Add
    var { error, added } = await this.ipfsWrapper.addToIpfs(ipfs, text);
    if (error != null)  {
      console.error(error);
      callback(error.message);
      return false;
    }

    // Default next
    nextWiki = nextHost
      + "/"
      + ipfsKeyword
      + "/"
      + added
      + `/${wikiSearch || ''}${wikiFragment || ''}`;

    // Pin, if failure log and continue
    var { error } = await this.ipfsWrapper.pinToIpfs(ipfs, added);
    if (error != null)  {
      console.warn(error);
    }

    // Publish to IPNS
    if (ipnsName !== null && (ipfsProtocol === ipnsKeyword || $tw.utils.getIpfsProtocol() === ipnsKeyword)) {
      if (this.isVerbose()) console.info(
        "Publishing IPNS name: "
        + ipnsName
      );
      var { error } = await this.ipfsWrapper.publishToIpfs(ipfs, ipnsName, added);
      if (error != null)  {
        // Log and continue
        console.warn(error);
        console.warn("Unable to publish IPNS name...");
        // Remove from unpin
        if (ipfsProtocol === ipnsKeyword) {
          const index = this.toBeUnpinned.indexOf(ipnsContent);
          if (index !== -1) {
            this.toBeUnpinned.splice(index, 1);
            if (this.isVerbose()) console.info(
              "Discard request to unpin: /"
              + ipfsKeyword
              + "/"
              + ipnsContent
            );
          }
        }
      } else {
        // IPNS next
        nextWiki = nextHost
        + "/"
        + ipnsKeyword
        + "/"
        + ipnsKey
        + `/${wikiSearch || ''}${wikiFragment || ''}`;
      }
    }

    // Publish to ENS
    if ($tw.utils.getIpfsProtocol() === ensKeyword) {
      if (this.isVerbose()) console.info(
        "Publishing ENS domain: "
        + ensDomain
      );
      var { error } = await this.ensWrapper.setContenthash(ensDomain, added, web3Provider, account);
      if (error != null)  {
        // Log and continue
        console.warn(error);
        console.warn("Unable to publish IPFS identifier to ENS...");
        // Remove from unpin
        const index = this.toBeUnpinned.indexOf(ensContent);
        if (index !== -1) {
          this.toBeUnpinned.splice(index, 1);
          if (this.isVerbose()) console.info(
            "Discard request to unpin: /"
            + ipfsKeyword
            + "/"
            + ensContent
          );
        }
      } else {
        // ENS next
        nextWiki = "https://"
          + ensDomain
          + `/${wikiSearch || ''}${wikiFragment || ''}`;
      }
    }

    // Unpin if applicable
    if ($tw.utils.getIpfsUnpin() && this.toBeUnpinned.length > 0) {
      for (var i = 0; i < this.toBeUnpinned.length; i++) {
        var { error } = await this.ipfsWrapper.unpinFromIpfs(ipfs, this.toBeUnpinned[i]);
        // Log and continue
        if (error != null)  {
          console.warn(error);
        }
      }
      this.toBeUnpinned = [];
    }

    // Done
    callback(null);

    // Next
    if (nextWiki !== document.URL) {
      if (this.isVerbose()) console.info(
        "Assigning new location: "
        + nextWiki
      );
      window.location.assign(nextWiki);
    }

  } catch (error) {
    console.error(error);
    callback(error.message);
    return false;
  }

  return true;

};

IpfsSaver.prototype.handleDeleteTiddler = function(self, tiddler) {
  // Process if _canonical_uri is set
  const uri = tiddler.getFieldString("_canonical_uri");
  if (uri == undefined || uri == null || uri.trim() === "") {
    return tiddler;
  }
  // Decode
  const { pathname } = self.ipfsLibrary.parseUrl(uri.trim());
  const { cid } = self.ipfsLibrary.decodeCid(pathname);
  // Store old cid as it needs to be unpined when the wiki is saved if applicable
  if ($tw.utils.getIpfsUnpin() && self.toBeUnpinned.indexOf(cid) == -1) {
    self.toBeUnpinned.push(cid);
    if (self.isVerbose()) console.info(
      "Request to unpin: /"
      + ipfsKeyword
      + "/"
      + cid
    );
  }
  return tiddler;
}

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handleSaveTiddler = async function(self, tiddler) {

  var updatedTiddler = null;

  // store tiddler _canonical_uri if any
  var uri = tiddler.getFieldString("_canonical_uri");
  if (uri !== undefined && uri !== null && uri.trim() !== "") {
    uri = uri.trim();
  } else {
    uri = null;
  }

  // store oldTiddler _canonical_uri if any
  var oldUri = null;
  const oldTiddler = $tw.wiki.getTiddler(tiddler.fields.title);
  if (oldTiddler !== undefined && oldTiddler !== null) {
    oldUri = oldTiddler.getFieldString("_canonical_uri");
    if (oldUri !== undefined && oldUri !== null && oldUri.trim() !== "") {
      oldUri = oldUri.trim();
    } else {
      oldUri = null;
    }
  }

  // Nothing to do
  if (oldUri == uri) {
    updatedTiddler = new $tw.Tiddler(tiddler);
    $tw.wiki.addTiddler(updatedTiddler);
    return updatedTiddler;
  }

  var type = tiddler.getFieldString("type");
  // Check
  if (type == undefined || type == null || type.trim() == "") {
    var msg = "Unknown Tiddler Type...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return oldTiddler;
  }
  type = type.trim();

  // Retrieve content-type
  const info = $tw.config.contentTypeInfo[type];
  // Check
  if (info == undefined || info == null)  {
    var msg = "Unknown Content Type: " + type;
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return oldTiddler;
  }

  // _canonical_uri attribute has been removed
  if (uri == null) {

    var addTags = [];
    var removeTags = [];

    var content = tiddler.getFieldString("text");

    if (info.encoding === "base64" || type === "image/svg+xml") {

      // Load
      try {
        content = await $tw.utils.httpGetToUint8Array(oldUri);
      } catch (error) {
        console.error(error);
        $tw.utils.messageDialog(error.message);
        return oldTiddler;
      }
      // Decrypt if necessary
      if (tiddler.hasTag("$:/isEncrypted")) {
        try {
          if (info.encoding === "base64") {
            content = await $tw.utils.decryptUint8ArrayToBase64(content);
          } else {
            content = await $tw.utils.decryptUint8ArrayToUtf8(content);
          }
        } catch (error) {
          console.warn(error);
          return oldTiddler;
        }
      } else {
        if (info.encoding === "base64") {
          content = $tw.utils.Uint8ArrayToBase64(content);
        } else {
          content = $tw.utils.Utf8ArrayToStr(content);
        }
      }

      addTags = ["$:/isAttachment", "$:/isEmbedded"];
      removeTags = ["$:/isEncrypted", "$:/isIpfs"];

      if (self.isVerbose()) console.log(
        "Embedding attachment: "
        + content.length
        + " bytes"
      );

    } else {

      removeTags = ["$:/isAttachment", "$:/isEmbedded", "$:/isEncrypted", "$:/isIpfs"];

    }

    // Update Tiddler
    updatedTiddler = $tw.utils.updateTiddler(
      tiddler,
      addTags,
      removeTags,
      content
    );

  } else {

    var addTags = [];
    var removeTags = [];

    // New _canonical_uri, unable to decide whether or not the content is encrypted
    const { pathname } = self.ipfsLibrary.parseUrl(uri);
    const { cid } = self.ipfsLibrary.decodeCid(pathname);
    // IPFS resource
    if (cid !== null) {
      if (info.encoding === "base64" || type === "image/svg+xml") {
        addTags = ["$:/isAttachment", "$:/isIpfs"];
        removeTags = ["$:/isEmbedded", "$:/isEncrypted"];
      } else {
        addTags = ["$:/isIpfs"];
        removeTags = ["$:/isEmbedded", "$:/isEncrypted"];
      }
    } else {
      if (info.encoding === "base64" || type === "image/svg+xml") {
        addTags = ["$:/isAttachment"];
        removeTags = ["$:/isEmbedded", "$:/isEncrypted", "$:/isIpfs"];
      } else {
        removeTags = ["$:/isEmbedded", "$:/isEncrypted", "$:/isIpfs"];
      }
    }

    updatedTiddler = $tw.utils.updateTiddler(
      tiddler,
      addTags,
      removeTags,
      "",
      uri
    );

  }

  // Process previous cid if any
  if (oldUri !== null) {
    const { pathname: oldPathname } = self.ipfsLibrary.parseUrl(oldUri);
    const { cid: oldCid } = self.ipfsLibrary.decodeCid(oldPathname);
    if ($tw.utils.getIpfsUnpin() && self.toBeUnpinned.indexOf(oldCid) == -1) {
      self.toBeUnpinned.push(oldCid);
      if (self.isVerbose()) console.info(
        "Request to unpin: /"
        + ipfsKeyword
        + "/"
        + oldCid
      );
    }
  }

  return updatedTiddler;

}

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handleIpfsPin = async function(self, event) {

  var protocol = null;
  var pathname = null;
  var cid = null;

  if (event.param !== undefined && event.param !== null) {
    const title = event.tiddlerTitle;
    // current tiddler
    const tiddler = $tw.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      const msg = "Unknown tiddler: " + title;
      console.error(msg);
      $tw.utils.messageDialog(msg);
      return false;
    }
    // Process if _canonical_uri is set
    const uri = tiddler.getFieldString("_canonical_uri");
    if (uri == undefined || uri == null || uri.trim() === "") {
      const msg = "This Tiddler is not an external resource...";
      console.error(msg);
      $tw.utils.messageDialog(msg);
      return false;
    }
    // decode _canonical_uri
    var { protocol, pathname } = self.ipfsLibrary.parseUrl(uri.trim());
  } else {
    // decode document URL
    var { protocol, pathname } = self.ipfsLibrary.parseUrl(document.URL);
  }

  // Check
  if (protocol == undefined || protocol == null) {
    const msg = "Unknown protocol...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }
  if (protocol === fileProtocol) {
    const msg = "Undefined IPFS wiki...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }
  if (pathname == undefined || pathname == null) {
    const msg = "Unknown pathname...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Extract and check URL IPFS protocol and cid
  var { protocol, cid } = self.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    const msg = "Unknown IPFS protocol...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }
  if (cid == null) {
    const msg = "Unknown IPFS identifier...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // IPFS client
  var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Resolve ipns key if applicable
  if (protocol === ipnsKeyword) {
    var { error, ipnsName, ipnsKey, resolved: cid } = await self.ipfsWrapper.resolveIpns(ipfs, cid);
    if (error != null) {
      if (ipnsName !== null && ipnsKey !== null) {
        const msg = "Unable to resolve current IPNS key...";
        console.error(error);
        console.error(msg);
        $tw.utils.messageDialog(msg);
      } else {
        console.error(error);
        $tw.utils.messageDialog(error.message);
      }
      return false;
    }
  }

  if (self.isVerbose()) console.info(
    "Pinning: /"
    + ipfsKeyword
    + "/"
    + cid
  );

  var { error } = await self.ipfsWrapper.pinToIpfs(ipfs, cid);
  if (error != null) {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  const index = self.toBeUnpinned.indexOf(cid);
  if ($tw.utils.getIpfsUnpin() && index !== -1) {
    self.toBeUnpinned.splice(index, 1);
  }

  if (self.isVerbose()) console.info(
    "Successfully pinned: /"
    + ipfsKeyword
    + "/"
    + cid
  );

  return false;

}

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handleIpfsUnpin = async function(self, event) {

  var protocol = null;
  var pathname = null;
  var cid = null;

  if (event.param !== undefined && event.param !== null) {
    const title = event.tiddlerTitle;
    // current tiddler
    const tiddler = $tw.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      const msg = "Unknown tiddler: " + title;
      console.error(msg);
      $tw.utils.messageDialog(msg);
      return false;
    }
    // Process if _canonical_uri is set
    const uri = tiddler.getFieldString("_canonical_uri");
    if (uri == undefined || uri == null || uri.trim() === "") {
      const msg = "This Tiddler is not an external resource...";
      console.error(msg);
      $tw.utils.messageDialog(msg);
      return false;
    }
    // decode _canonical_uri
    var { protocol, pathname } = self.ipfsLibrary.parseUrl(uri.trim());
  } else {
    // decode document URL
    var { protocol, pathname } = self.ipfsLibrary.parseUrl(document.URL);
  }

  // Check
  if (protocol == undefined || protocol == null) {
    const msg = "Unknown protocol...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }
  if (protocol === fileProtocol) {
    const msg = "Undefined IPFS wiki...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }
  if (pathname == undefined || pathname == null) {
    const msg = "Unknown pathname...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Extract and check URL IPFS protocol and cid
  var { protocol, cid } = self.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    const msg = "Unknown IPFS protocol...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }
  if (cid == null) {
    const msg = "Unknown IPFS identifier...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // IPFS client
  var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Resolve IPNS key if applicable
  if (protocol === ipnsKeyword) {
    var { error, ipnsName, ipnsKey, resolved: cid } = await self.ipfsWrapper.resolveIpns(ipfs, cid);
    if (error != null) {
      if (ipnsName !== null && ipnsKey !== null) {
        const msg = "Unable to resolve current IPNS key...";
        console.error(error);
        console.error(msg);
        $tw.utils.messageDialog(msg);
      } else {
        console.error(error);
        $tw.utils.messageDialog(error.message);
      }
      return false;
    }
  }

  if (self.isVerbose()) console.info(
    "Unpinning: /"
    + ipfsKeyword
    + "/"
    + cid
  );
  var { error } = await self.ipfsWrapper.unpinFromIpfs(ipfs, cid);
  if (error != null) {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  const index = self.toBeUnpinned.indexOf(cid);
  if ($tw.utils.getIpfsUnpin() && self.toBeUnpinned.indexOf(cid) !== -1) {
    self.toBeUnpinned.splice(index, 1);
  }

  if (self.isVerbose()) console.info(
    "Successfully unpinned: /"
    + ipfsKeyword
    + "/"
    + cid
  );

  return false;

}

/*
 * Information about this saver
 */
IpfsSaver.prototype.info = {
  name: "ipfs",
  priority: 3000,
  capabilities: ["save"]
};

/*
 * Static method that returns true if this saver is capable of working
 */
exports.canSave = function(wiki) {
  return true;
};

/*
 * Create an instance of this saver
 */
exports.create = function(wiki) {
  return new IpfsSaver(wiki);
};

})();
