/*\
title: $:/plugins/ipfs/ipfs-saver.js
type: application/javascript
module-type: saver

IpfsSaver

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsWrapper = require("./ipfs-wrapper.js").IpfsWrapper;
const EnsWrapper = require("./ens-wrapper.js").EnsWrapper;
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

  //Is there anything to do
  if ($tw.saverHandler.isDirty() == false) {
    return false;
  }

  try {

    // Init
    var ipnsKey = $tw.utils.getIpfsIpnsKey();
    var ipnsName = $tw.utils.getIpfsIpnsName();
    var cid = null;
    var ipfsProtocol = ipfsKeyword;
    var ensDomain = null;
    var web3Provider = null;
    var account = null;
    options = options || {};

    // Process document URL
    const {
      protocol: wikiProtocol,
      pathname: wikiPathname,
      search: wikiSearch,
      fragment: wikiFragment
    } = this.ipfsLibrary.parseUrl(document.URL);

    // Retrieve gateway url
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

    // Extract and check URL IPFS protocol and cid
    if (wikiProtocol !== fileProtocol) {
      // Decode pathname
      var { protocol, cid } = this.ipfsLibrary.decodeCid(wikiPathname);
      // Check
      if (protocol != null && cid != null) {
        ipfsProtocol = protocol;
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
    }

    // Getting an IPFS client
    var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
    if (error != null)  {
      console.error(error);
      callback(error.message);
      return false;
    }

    // Resolve IPNS
    if (ipfsProtocol === ipnsKeyword || $tw.utils.getIpfsProtocol() === ipnsKeyword) {
      // Resolve ipns key and ipns name
      var { error, ipnsName, ipnsKey, resolved } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
      if (error != null) {
        console.error(error);
        callback(error.message);
        return false;
      }
      // Store to unpin previous if any
      if ($tw.utils.getIpfsUnpin() && resolved != null) {
        if (this.toBeUnpinned.indexOf(resolved) == -1) {
          this.toBeUnpinned.push(resolved);
          if (this.isVerbose()) console.info(
            "Request to unpin: /"
            + ipfsKeyword
            + "/"
            + resolved
          );
        }
      }
    }

    // Check ENS domain
    if ($tw.utils.getIpfsProtocol() === ensKeyword) {

      // Getting default ens domain
      ensDomain = $tw.utils.getIpfsEnsDomain();
      // Check
      if (ensDomain == null) {
        const msg  ="Undefined ENS Domain...";
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
      var { error, decoded, protocol } = await this.ensWrapper.getContenthash(ensDomain, web3Provider, account);
      if (error != null)  {
        console.error(error);
        callback(error.message);
        return false;
      }

      // Check is content protocol is ipfs to unpin previous
      if ($tw.utils.getIpfsUnpin() && decoded !== null) {
        // Store to unpin previous
        const unpin = decoded;
        if (this.toBeUnpinned.indexOf(unpin) == -1) {
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

    // Pin, if failure log and continue
    var { error } = await this.ipfsWrapper.pinToIpfs(ipfs, added);
    if (error != null)  {
      console.warn(error);
    }

    // Publish to IPNS if ipns is requested or the current protocol is ipns
    if ($tw.utils.getIpfsProtocol() === ipnsKeyword || ipfsProtocol === ipnsKeyword) {
      // Publish to IPNS if ipnsKey match the current hash or current protocol is ipfs
      if (cid === ipnsKey || ipfsProtocol === ipfsKeyword) {
        if (this.isVerbose()) console.info(
          "Publishing IPNS name: "
          + ipnsName
        );
        var { error } = await this.ipfsWrapper.publishToIpfs(ipfs, ipnsName, added);
        if (error != null)  {
          console.error(error);
          callback(error.message);
          return false;
        }
      }
    }

    // Publish to ENS if ens is requested
    if ($tw.utils.getIpfsProtocol() === ensKeyword) {
      if (this.isVerbose()) console.info(
        "Publishing ENS domain: "
        + ensDomain
      );
      var { error } = await this.ensWrapper.setContenthash(ensDomain, added, web3Provider, account);
      if (error != null)  {
        console.error(error);
        callback(error.message);
        return false;
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

    // Next Cid
    var nextCid = null;
    if ($tw.utils.getIpfsProtocol() === ipnsKeyword) {
      if (ipfsProtocol == ipfsKeyword || cid == null) {
        nextCid = "/" + ipnsKeyword + "/" + ipnsKey;
      } else {
        nextCid = "/" + ipnsKeyword + "/" + cid;
      }
    } else {
      nextCid = "/" + ipfsKeyword + "/" + added;
    }

    // Next location
    if (wikiProtocol === fileProtocol) {
      const url = gatewayProtocol
        + "//"
        + gatewayHost
        + nextCid
        + `/${wikiSearch || ''}${wikiFragment || ''}`;
      if (this.isVerbose()) console.info(
        "Assigning new location: "
        + url
      );
      window.location.assign(url);
    } else if ($tw.utils.getIpfsProtocol() === ipnsKeyword && ipfsProtocol !== ipnsKeyword) {
      const url = gatewayProtocol
        + "//"
        + gatewayHost
        + nextCid
        + `/${wikiSearch || ''}${wikiFragment || ''}`;
      if (this.isVerbose()) console.info(
        "Assigning new location: "
        + url
      );
      window.location.assign(url);
    } else if ($tw.utils.getIpfsProtocol() === ensKeyword) {
      const url = "https://"
        + ensDomain
        + `/${wikiSearch || ''}${wikiFragment || ''}`;
      if (this.isVerbose()) console.info(
        "Assigning new location: "
        + url
      );
      window.location.assign(url);
    } else if (($tw.utils.getIpfsProtocol() === ipfsKeyword || ipfsProtocol === ipfsKeyword) && cid != added) {
      const url = gatewayProtocol
        + "//"
        + gatewayHost
        + nextCid
        + `/${wikiSearch || ''}${wikiFragment || ''}`;
      if (this.isVerbose()) console.info(
        "Assigning new location: "
        + url
      );
      window.location.assign(url);
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
          console.warn(error.message);
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

  // Getting an IPFS client
  var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Resolve ipns key if applicable
  if (protocol === ipnsKeyword) {
    var { error, resolved: cid } = await self.ipfsWrapper.resolveIpns(ipfs, cid);
    if (error != null) {
      console.error(error);
      $tw.utils.messageDialog(error.message);
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

  if ($tw.utils.getIpfsUnpin() && self.toBeUnpinned.indexOf(cid) !== -1) {
    $tw.utils.removeArrayEntries(self.toBeUnpinned, cid);
  }

  $tw.utils.messageDialog(
    "Successfully pinned:"
    + "\nprotocol:\n"
    + ipfsKeyword
    + "\nidentifier:\n"
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

  // Getting an IPFS client
  var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Resolve IPNS key if applicable
  if (protocol === ipnsKeyword) {
    var { error, resolved: cid } = await self.ipfsWrapper.resolveIpns(ipfs, cid);
    if (error != null) {
      console.error(error);
      $tw.utils.messageDialog(error.message);
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

  if ($tw.utils.getIpfsUnpin() && self.toBeUnpinned.indexOf(cid) !== -1) {
    $tw.utils.removeArrayEntries(self.toBeUnpinned, cid);
  }

  $tw.utils.messageDialog(
    "Successfully unpinned:"
    + "\nprotocol:\n"
    + ipfsKeyword
    + "\nidentifier:\n"
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
