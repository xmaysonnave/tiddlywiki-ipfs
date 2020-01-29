/*\
title: $:/plugins/ipfs/ipfs-action.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsAction

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;
const IpfsModule = require("$:/plugins/ipfs/ipfs-module.js").IpfsModule;
const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;

const fileProtocol = "file:";
const ipfsKeyword = "ipfs";
const ipnsKeyword = "ipns";

const name = "ipfs-action";

var IpfsAction = function() {
  this.once = false;
  this.ensWrapper = new EnsWrapper();
  this.ipfsLibrary = new IpfsLibrary();
  this.ipfsModule = new IpfsModule();
  this.ipfsWrapper = new IpfsWrapper();
  this.ipnsName = $tw.utils.getIpfsIpnsName();
  this.ipnsKey = $tw.utils.getIpfsIpnsKey();
};

IpfsAction.prototype.getLogger = function() {
  if (window !== undefined && window.log !== undefined) {
    const logger = window.log.getLogger(name);
    if (this.isVerbose()) {
      logger.setLevel("trace", false);
    } else {
      logger.setLevel("warn", false);
    }
    return logger;
  }
  return console;
}

IpfsAction.prototype.isVerbose = function() {
  try {
    return $tw.utils.getIpfsVerbose();
  } catch (error) {
    return false;
  }
}

IpfsAction.prototype.init = function() {
  // Init once
  if (this.once) {
    return;
  }
  const self = this;
  // Widget
  $tw.rootWidget.addEventListener("tm-export-to-ipfs", function(event) {
    return self.handleExportToIpfs(event);
  });
  $tw.rootWidget.addEventListener("tm-fetch-ipns-key", function(event) {
    return self.handleFetchIpnsKey(event);
  });
  $tw.rootWidget.addEventListener("tm-generate-ipns-key", function(event) {
    return self.handleGenerateIpnsKey(event);
  });
  $tw.rootWidget.addEventListener("tm-ipfs-pin", function(event) {
    return self.handleIpfsPin(event);
  });
  $tw.rootWidget.addEventListener("tm-ipfs-unpin", function(event) {
    return self.handleIpfsUnpin(event);
  });
  $tw.rootWidget.addEventListener("tm-mobile-console", function(event) {
    return self.handleMobileConsole(event);
  });
  $tw.rootWidget.addEventListener("tm-publish-to-ipfs", function(event) {
    return self.handlePublishToIpfs(event);
  });
  $tw.rootWidget.addEventListener("tm-publish-to-ipns", function(event) {
    return self.handlePublishToIpns(event);
  });
  $tw.rootWidget.addEventListener("tm-remove-ipns-key", function(event) {
    return self.handleRemoveIpnsKey(event);
  });
  $tw.rootWidget.addEventListener("tm-rename-ipns-name", function(event) {
    return self.handleRenameIpnsName(event);
  });
  $tw.rootWidget.addEventListener("tm-resolve-ipns-key-and-open", function(event) {
    return self.handleResolveIpnsKeyAndOpen(event);
  });
  // Init once
  this.once = true;
}

IpfsAction.prototype.handleExportToIpfs = async function(event) {

  const title = event.tiddlerTitle;

  var unpin = [];
  var fields = [];
  var ipfsUri = null;
  var ipnsKey = null;
  var ipnsName = null;
  var ipnsContent = null;
  var web3Provider = null;
  var account = null;
  var ipfs = null;
  var ensDomain = null;
  var ensContent = null;

  // Load tiddler
  const tiddler = $tw.wiki.getTiddler(title);
  if (tiddler == undefined || tiddler == null) {
    $tw.utils.alert(name, "Unknown Tiddler...");
    return false;
  }

  // Type
  var type = tiddler.getFieldString("type");
  // Default
  if (type == undefined || type == null || type.trim() === "") {
    type = "text/vnd.tiddlywiki";
  }

  // Content Type
  const info = $tw.config.contentTypeInfo[type];
  // Check
  if (info == undefined || info == null)  {
    $tw.utils.alert(name, "Unknown Tiddler Content Type: " + type);
    return false;
  }

  // Check
  if (info.encoding !== "base64" && type !== "image/svg+xml" && type !== "text/vnd.tiddlywiki")  {
    $tw.utils.alert(name, "Unsupported Tiddler Content Type...\nLook at the documentation...");
    return null;
  }

  // Retrieve fields
  ipfsUri = tiddler.getFieldString("_ipfs_uri");
  // Check
  if (ipfsUri == undefined || ipfsUri == null || ipfsUri.trim() === "") {
    ipfsUri = null;
  }
  ipnsName = tiddler.getFieldString("_ipns_name");
  // Check
  if (ipnsName == undefined || ipnsName == null || ipnsName.trim() === "") {
    ipnsName = null;
  }
  ipnsKey = tiddler.getFieldString("_ipns_key");
  // Check
  if (ipnsKey == undefined || ipnsKey == null || ipnsKey.trim() === "") {
    ipnsKey = null;
  }
  ensDomain = tiddler.getFieldString("_ens_domain");
  // Check
  if (ensDomain == undefined || ensDomain == null || ensDomain.trim() === "") {
    ensDomain = null;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Unpin current
  if (ipfsUri !== null) {
    // Decode
    const { pathname } = this.ipfsLibrary.parseUrl(ipfsUri.trim());
    const { cid } = this.ipfsLibrary.decodeCid(pathname);
    if ($tw.utils.getIpfsUnpin()
      && cid !== null
      && window.unpin.indexOf(cid) == -1
    ) {
      unpin.push(cid);
      this.getLogger().info(
        "Request to unpin Tiddler: /"
        + ipfsKeyword
        + "/"
        + cid
      );
    }
  }

  // Analyse IPNS
  if (ipnsName !== null || ipnsKey !== null) {
    this.getLogger().info("Processing IPNS fields...");
    var { error, ipnsName, ipnsKey, resolved: ipnsContent } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
    if (error != null) {
      this.getLogger().error(error.message);
      if (ipnsName == null || ipnsKey == null) {
        $tw.utils.alert(name, error.message);
        return false;
      }
    }
    // Store to unpin previous if any
    if (
      $tw.utils.getIpfsUnpin()
      && ipnsContent !== null
      && window.unpin.indexOf(ipnsContent) == -1
    ) {
      unpin.push(ipnsContent);
      this.getLogger().info(
        "Request to unpin IPNS Tiddler: /"
        + ipfsKeyword
        + "/"
        + ipnsContent
      );
    }
  }

  // Analyse ENS
  if (ensDomain !== null) {
    // Retrieve a Web3 provider
    var { error, web3Provider, account } = await this.ensWrapper.getWeb3Provider();
    if (error != null)  {
      this.getLogger().error(error.message);
      $tw.utils.alert(name, error.message);
      return false;
    }
    // Fetch ENS domain content
    var { error, decoded: ensContent } = await this.ensWrapper.getContenthash(ensDomain, web3Provider, account);
    if (error != null)  {
      this.getLogger().error(error.message);
      $tw.utils.alert(name, error.message);
      return false;
    }
    // Store to unpin previous if any
    if (
      $tw.utils.getIpfsUnpin()
      && ensContent !== null
      && window.unpin.indexOf(ensContent) == -1
    ) {
      unpin.push(ensContent);
      this.getLogger().info(
        "Request to unpin ENS Tiddler: /"
        + ipfsKeyword
        + "/"
        + ensContent
      );
    }
  }

  // Getting content
  const content = this.ipfsWrapper.getTiddlerAsTid(tiddler);
  // Check
  if (content == null) {
    return false;
  }

  this.getLogger().info(
    "Uploading Tiddler: "
    + content.length
    + " bytes"
  );

  // Add
  var { error, added } = await this.ipfsWrapper.addToIpfs(ipfs, content);
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }
  fields.push( { key: "_ipfs_uri", value: "/" + ipfsKeyword + "/" + added } );

  // Pin, if failure log and continue
  var { error } = await this.ipfsWrapper.pinToIpfs(ipfs, added);
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
  }

  // Publish to IPNS
  if (ipnsName !== null && ipnsKey !== null) {
    this.getLogger().info(
      "Publishing IPNS Tiddler: "
      + ipnsName
    );
    var { error } = await this.ipfsWrapper.publishToIpns(ipfs, ipnsName, added);
    if (error != null)  {
      // Log and continue
      const msg = "Unable to publish IPNS Tiddler...";
      this.getLogger().error(msg);
      $tw.utils.alert(name, msg);
      // Remove from unpin
      const index = unpin.indexOf(ipnsContent);
      if (index !== -1) {
        unpin.splice(index, 1);
      }
      // Log
      if (index !== -1) {
        this.getLogger().info(
          "Discard request to unpin IPNS Tiddler: /"
          + ipfsKeyword
          + "/"
          + ipnsContent
        );
      }
    } else {
      fields.push( { key: "_ipfs_uri", value: "/" + ipnsKeyword + "/" + ipnsKey } );
    }
  }

  // Publish to ENS
  if (ensDomain !== null) {
    this.getLogger().info(
      "Publishing ENS Tiddler: "
      + ensDomain
    );
    var { error } = await this.ensWrapper.setContenthash(ensDomain, added, web3Provider, account);
    if (error != null)  {
      // Log and continue
      this.getLogger().error(error.message);
      $tw.utils.alert(name, error.message);
      // Discard unpin
      const index = unpin.indexOf(ensContent);
      if (index !== -1) {
        unpin.splice(index, 1);
      }
      // Log
      if (index !== -1) {
        this.getLogger().info(
          "Discard request to unpin ENS Tiddler: /"
          + ipfsKeyword
          + "/"
          + ensContent
        );
      }
    } else {
      fields.push( { key: "_ipfs_uri", value: "https://" + ensDomain } );
    }
  }

  // Unpin
  if ($tw.utils.getIpfsUnpin()) {
    for (var i = 0; i < unpin.length; i++) {
      var { error } = await this.ipfsWrapper.unpinFromIpfs(ipfs, unpin[i]);
      // Log and continue
      if (error != null)  {
        this.getLogger().error(error.message);
        $tw.utils.alert(name, error.message);
      }
    }
    unpin = [];
  }

  // Update Tiddler
  var addTags = [];
  if ($tw.crypto.hasPassword()) {
    addTags = ["$:/isEncrypted", "$:/isExported", "$:/isIpfs"];
  } else {
    addTags = ["$:/isExported", "$:/isIpfs"];
  }
  // Update
  const updatedTiddler = $tw.utils.updateTiddler({
    tiddler: tiddler,
    addTags: addTags,
    fields: fields
  });

  if (updatedTiddler !== null) {
    $tw.wiki.addTiddler(updatedTiddler);
  } else {
    return false;
  }

  return true;

}

IpfsAction.prototype.handlePublishToIpfs = async function(event) {

  const title = event.tiddlerTitle;

  // Load tiddler
  const tiddler = $tw.wiki.getTiddler(title);
  if (tiddler == undefined || tiddler == null) {
    $tw.utils.alert(name, "Unknown Tiddler...");
    return false;
  }

  // Type
  var type = tiddler.getFieldString("type");
  // Default
  if (type == undefined || type == null || type.trim() === "") {
    type = "text/vnd.tiddlywiki";
  }

  // Content Type
  const info = $tw.config.contentTypeInfo[type];
  // Check
  if (info == undefined || info == null)  {
    $tw.utils.alert(name, "Unknown Tiddler Content Type: " + type);
    return false;
  }

  // Check
  if (info.encoding !== "base64" && type !== "image/svg+xml")  {
    $tw.utils.alert(name, "This Tiddler do not contain any attachment...");
    return false;
  }

  // Do not process if _canonical_uri is set
  const canonical_uri = tiddler.getFieldString("_canonical_uri");
  if (canonical_uri !== undefined && canonical_uri !== null && canonical_uri.trim() !== "") {
    $tw.utils.alert(name, "Attachment is already published...");
    return false;
  }

  // Getting content
  const content = this.ipfsWrapper.getTiddlerContent(tiddler);
  // Check
  if (content == null) {
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  this.getLogger().info(
    "Uploading attachment: "
    + content.length
    + " bytes"
  );

  // Add
  var { error, added } = await this.ipfsWrapper.addToIpfs(ipfs, content);
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Pin, if failure log and continue
  var { error } = await this.ipfsWrapper.pinToIpfs(ipfs, added);
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
  }

  var addTags = [];
  var removeTags = [];
  if ($tw.crypto.hasPassword()) {
    addTags = ["$:/isAttachment", "$:/isEncrypted", "$:/isIpfs"];
    removeTags = ["$:/isEmbedded"];
  } else {
    addTags = ["$:/isAttachment", "$:/isIpfs"];
    removeTags = ["$:/isEmbedded"];
  }
  // Update
  const updatedTiddler = $tw.utils.updateTiddler({
    tiddler: tiddler,
    addTags: addTags,
    removeTags: removeTags,
    fields: [
      { key: "text", value: "" },
      { key: "_canonical_uri", value: "/" + ipfsKeyword + "/" + added }
    ]
  });
  if (updatedTiddler !== null) {
    $tw.wiki.addTiddler(updatedTiddler);
  } else {
    return false;
  }

  return true;

}

IpfsAction.prototype.handleIpfsPin = async function(event) {

  var protocol = null;
  var pathname = null;
  var cid = null;

  if (event.param !== undefined && event.param !== null) {
    const title = event.tiddlerTitle;
    // current tiddler
    const tiddler = $tw.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      $tw.utils.alert(name, "Unknown tiddler: " + title);
      return false;
    }
    // Process if _canonical_uri is set
    const uri = tiddler.getFieldString("_canonical_uri");
    if (uri == undefined || uri == null || uri.trim() === "") {
      $tw.utils.alert(name, "This Tiddler is not an external resource...");
      return false;
    }
    // decode _canonical_uri
    var { protocol, pathname } = this.ipfsLibrary.parseUrl(uri.trim());
  } else {
    // decode document URL
    var { protocol, pathname } = this.ipfsLibrary.parseUrl(document.URL);
  }

  // Check
  if (protocol == undefined || protocol == null) {
    $tw.utils.alert(name, "Unknown protocol...");
    return false;
  }
  if (protocol === fileProtocol) {
    $tw.utils.alert(name, "Undefined IPFS wiki...");
    return false;
  }
  if (pathname == undefined || pathname == null) {
    $tw.utils.alert(name, "Unknown pathname...");
    return false;
  }

  // Extract and check URL IPFS protocol and cid
  var { protocol, cid } = this.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    $tw.utils.alert(name, "Unknown IPFS protocol...");
    return false;
  }
  if (cid == null) {
    $tw.utils.alert(name, "Unknown IPFS identifier...");
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Resolve ipns key if applicable
  if (protocol === ipnsKeyword) {
    var { error, resolved: cid } = await this.ipfsWrapper.resolveIpns(ipfs, cid);
    if (error != null) {
      this.getLogger().error(error.message);
      $tw.utils.alert(name, error.message);
      return false;
    }
  }

  this.getLogger().info(
    "Pinning: /"
    + ipfsKeyword
    + "/"
    + cid
  );

  var { error } = await this.ipfsWrapper.pinToIpfs(ipfs, cid);
  if (error != null) {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  const index = window.unpin.indexOf(cid);
  if ($tw.utils.getIpfsUnpin() && index !== -1) {
    window.unpin.splice(index, 1);
    this.getLogger().info(
      "Discard request to unpin: /"
      + ipfsKeyword
      + "/"
      + cid
    );
  }

  return false;

}

IpfsAction.prototype.handleIpfsUnpin = async function(event) {

  var protocol = null;
  var pathname = null;
  var cid = null;

  if (event.param !== undefined && event.param !== null) {
    const title = event.tiddlerTitle;
    // current tiddler
    const tiddler = $tw.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      $tw.utils.alert(name, "Unknown tiddler: " + title);
      return false;
    }
    // Process if _canonical_uri is set
    const uri = tiddler.getFieldString("_canonical_uri");
    if (uri == undefined || uri == null || uri.trim() === "") {
      $tw.utils.alert(name, "This Tiddler is not an external resource...");
      return false;
    }
    // decode _canonical_uri
    var { protocol, pathname } = this.ipfsLibrary.parseUrl(uri.trim());
  } else {
    // decode document URL
    var { protocol, pathname } = this.ipfsLibrary.parseUrl(document.URL);
  }

  // Check
  if (protocol == undefined || protocol == null) {
    $tw.utils.alert(name, "Unknown protocol...");
    return false;
  }
  if (protocol === fileProtocol) {
    $tw.utils.alert(name, "Undefined IPFS wiki...");
    return false;
  }
  if (pathname == undefined || pathname == null) {
    $tw.utils.alert(name, "Unknown pathname...");
    return false;
  }

  // Extract and check URL IPFS protocol and cid
  var { protocol, cid } = this.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    $tw.utils.alert(name, "Unknown IPFS protocol...");
    return false;
  }
  if (cid == null) {
    $tw.utils.alert(name, "Unknown IPFS identifier...");
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Resolve IPNS key if applicable
  if (protocol === ipnsKeyword) {
    var { error, resolved: cid } = await this.ipfsWrapper.resolveIpns(ipfs, cid);
    if (error != null) {
      this.getLogger().error(error.message);
      $tw.utils.alert(name, error.message);
      return false;
    }
  }

  this.getLogger().info(
    "Unpinning: /"
    + ipfsKeyword
    + "/"
    + cid
  );
  var { error } = await this.ipfsWrapper.unpinFromIpfs(ipfs, cid);
  if (error != null) {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  const index = window.unpin.indexOf(cid);
  if ($tw.utils.getIpfsUnpin() && window.unpin.indexOf(cid) !== -1) {
    window.unpin.splice(index, 1);
  }

  return false;

}

IpfsAction.prototype.handleRenameIpnsName = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();

  // Check
  if (ipnsName == null) {
    $tw.utils.alert(name, "Undefined IPNS name....");
    return false;
  }
  if (this.ipnsName == null || this.ipnsName === ipnsName) {
    $tw.utils.alert(name, "Nothing to rename....");
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Rename IPNS name
  var { error, key } = await this.ipfsWrapper.renameIpnsName(ipfs, this.ipnsName, ipnsName);
  if (error != null) {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, "Unable to rename IPNS name...");
    return false;
  }

  // Update Tiddler
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
  if (tiddler !== undefined) {
    $tw.utils.updateTiddler({
      tiddler: tiddler,
      fields: [
        { key: "text", value: key }
      ]
    });
  }

  // Successfully renamed
  this.ipnsName = ipnsName;
  this.ipnsKey = key;

  return true;

}

IpfsAction.prototype.handleGenerateIpnsKey = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();

  // Check
  if (ipnsName == null) {
    $tw.utils.alert(name, "Undefined IPNS name....");
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Generate IPNS key
  var { error, key } = await this.ipfsWrapper.generateIpnsKey(ipfs, ipnsName);
  if (error != null) {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, "Unable to generate IPNS key...");
    return false;
  }

  // Update Tiddler
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
  if (tiddler !== undefined) {
    $tw.utils.updateTiddler({
      tiddler: tiddler,
      fields: [
        { key: "text", value: key }
      ]
    });
  }

  // Successfully generated
  this.ipnsName = ipnsName;
  this.ipnsKey = key;

  return true;

}

IpfsAction.prototype.handleRemoveIpnsKey = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();
  var ipnsKey = $tw.utils.getIpfsIpnsKey();

  // Check
  if (ipnsName == null) {
    $tw.utils.alert(name, "Undefined IPNS name....");
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Resolve CID
  var { error, ipnsName, ipnsKey, resolved } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
  if (error != null) {
    this.getLogger().error(error.message);
    if (ipnsName == null || ipnsKey == null) {
      $tw.utils.alert(name, error.message);
      return false;
    }
  }

  // Unpin previous
  if ($tw.utils.getIpfsUnpin() && resolved != null) {
    this.getLogger().info(
      "Request to unpin: /"
      + ipfsKeyword
      + "/"
      + resolved
    );
    var { error } = await this.ipfsWrapper.unpinFromIpfs(ipfs, resolved);
    // Log and continue
    if (error != null)  {
      this.getLogger().error(error.message);
      $tw.utils.alert(name, error.message);
    }
  }

  // Remove IPNS key
  var { error } = await this.ipfsWrapper.removeIpnsKey(ipfs, ipnsName);
  if (error != null) {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, "Unable to remove resolved IPNS key...");
    return false;
  }

  // Update Tiddlers
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/name");
  if (tiddler !== undefined) {
    $tw.utils.updateTiddler({
      tiddler: tiddler,
      fields: [
        { key: "text", value: "" }
      ]
    });
  }
  tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
  if (tiddler !== undefined && $tw.utils.getIpfsIpnsKey() !== null) {
    $tw.utils.updateTiddler({
      tiddler: tiddler,
      fields: [
        { key: "text", value: "" }
      ]
    });
  }

  // Successfully removed
  this.ipnsName = null;
  this.ipnsKey = null;

  return true;

}

IpfsAction.prototype.handleFetchIpnsKey = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();
  var ipnsKey = $tw.utils.getIpfsIpnsKey();

  // Check
  if (ipnsName == null) {
    $tw.utils.alert(name, "Undefined IPNS name....");
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Fetch
  var { error, ipnsKey } = await this.ipfsWrapper.fetchIpns(ipfs, ipnsKey, ipnsName);
  if (error != null) {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Update Tiddler
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
  if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
    $tw.utils.updateTiddler({
      tiddler: tiddler,
      fields: [
        { key: "text", value: ipnsKey }
      ]
    });
    this.ipnsKey = ipnsKey;
  }
  this.ipnsName = ipnsName;

  return true;

}

IpfsAction.prototype.handleResolveIpnsKeyAndOpen = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();
  var ipnsKey = $tw.utils.getIpfsIpnsKey();

  // Check
  if (ipnsName == null) {
    $tw.utils.alert(name, "Undefined IPNS name....");
    return false;
  }

  // Retrieve Gateway URL
  const gatewayUrl = $tw.utils.getIpfsGatewayUrl();
  // Check
  if (gatewayUrl == null) {
    $tw.utils.alert(name, "Undefined IPFS Gateway URL...");
    return false;
  }

  // Process Gateway URL
  const {
    protocol: gatewayProtocol,
    host: gatewayHost
  } = this.ipfsLibrary.parseUrl(gatewayUrl);

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Resolve CID
  var { error, ipnsKey, ipnsName, resolved } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
  if (error != null) {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Update Tiddler
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
  if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
    $tw.utils.updateTiddler({
      tiddler: tiddler,
      fields: [
        { key: "text", value: ipnsKey }
      ]
    });
    this.ipnsKey = ipnsKey;
  }
  this.ipnsName = ipnsName;

  if (resolved !== null) {
    // Resolved IPFS URL
    const url = gatewayProtocol
      + "//"
      + gatewayHost
      + "/"
      + ipfsKeyword
      + "/"
      + resolved;
    window.open(url, "_blank", "noopener");
  }

  return true;

}

IpfsAction.prototype.handleMobileConsole = async function(tiddler) {
  // Load mobile console if applicable
  if (typeof window.eruda === "undefined") {
    await this.ipfsModule.loadErudaLibrary();
    const eruda = document.createElement("div");
    window.document.body.appendChild(eruda);
    window.eruda.init({
      container: eruda,
      tool: ["console"],
      useShadowDom: true,
      autoScale: true
    });
    window.eruda.init();
    // Preserve user preference if any, default is 80
    if (window.eruda.get().config.get("displaySize") === 80) {
      window.eruda.get().config.set("displaySize", 40);
    }
    // Preserve user preference if any, default is 0.95
    if (window.eruda.get().config.get("transparency") === 0.95) {
      window.eruda.get().config.set("transparency", 1);
    }
    this.getLogger().info("Mobile console has been loaded...");
  } else {
    window.eruda.destroy();
    delete window.eruda;
    this.getLogger().info("Mobile console has been unloaded...");
  }
}

IpfsAction.prototype.handlePublishToIpns = async function(event) {

  // Process document URL
  var { protocol, pathname } = this.ipfsLibrary.parseUrl(document.URL);

  // Check
  if (protocol == undefined || protocol == null) {
    $tw.utils.alert(name, "Unknown protocol...");
    return false;
  }
  if (protocol === fileProtocol) {
    $tw.utils.alert(name, "Undefined IPFS identifier...");
    return false;
  }
  if (pathname == undefined || pathname == null) {
    $tw.utils.alert(name, "Unknown pathname...");
    return false;
  }

  // Extract and check URL IPFS protocol and CID
  var { protocol, cid } = this.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    $tw.utils.alert(name, "Unknown IPFS protocol...");
    return false;
  }
  if (cid == null) {
    $tw.utils.alert(name, "Unknown IPFS identifier...");
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Default IPNS key and IPNS name
  var ipnsKey = $tw.utils.getIpfsIpnsKey();
  var ipnsName = $tw.utils.getIpfsIpnsName();

  // Check
  if (ipnsKey == null) {
    $tw.utils.alert(name, "Undefined default IPNS key....");
    return false;
  }

  if (protocol === ipnsKeyword) {
    // Check
    if (ipnsKey === cid) {
      $tw.utils.alert(name, "Default IPNS key matches current IPNS key....");
      return false;
    }
    // Resolve current IPNS key
    this.getLogger().info("Processing current IPNS...");
    var { error, resolved: cid } = await this.ipfsWrapper.resolveIpns(ipfs, cid);
    if (error != null)  {
      this.getLogger().error(error.message);
      $tw.utils.alert(name, error.message);
      return false;
    }
  }

  // Resolve default IPNS key and IPNS name
  this.getLogger().info("Processing default IPNS...");
  var { error, ipnsName, ipnsKey, resolved } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
  if (error != null)  {
    this.getLogger().error(error.message);
    if (ipnsName == null || ipnsKey == null) {
      $tw.utils.alert(name, error.message);
      return false;
    }
  }

  // Check
  if (resolved === cid) {
    $tw.utils.alert(name, "IPFS identifiers are matching....");
    return false;
  }

  this.getLogger().info(
    "Publishing IPNS wiki: "
    + ipnsName
  );

  var { error } = await this.ipfsWrapper.publishToIpns(ipfs, ipnsName, cid);
  if (error != null) {
    this.getLogger().error(error.message);
    $tw.utils.alert(name, "Unable to publish IPNS wiki...");
    return false;
  }

  // Unpin previous
  if ($tw.utils.getIpfsUnpin() && resolved != null) {
    this.getLogger().info(
      "Request to unpin IPNS wiki: /"
      + ipfsKeyword
      + "/"
      + resolved
    );
    var { error } = await this.ipfsWrapper.unpinFromIpfs(ipfs, resolved);
    // Log and continue
    if (error != null)  {
      this.getLogger().error(error.message);
      $tw.utils.alert(name, error.message);
    }
  }

  return true;

}

exports.IpfsAction = IpfsAction;

})();
