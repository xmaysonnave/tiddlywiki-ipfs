/*\
title: $:/plugins/ipfs/ipfs-actions.js
type: application/javascript
module-type: library

IpfsActions

\*/

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;
const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;
const IpfsLibrary = require("$:/plugins/ipfs/ipfs-library.js").IpfsLibrary;

const fileProtocol = "file:";
const ipfsKeyword = "ipfs";
const ipnsKeyword = "ipns";

/*
Ipfs Actions
*/
var IpfsActions = function() {
  this.ipfsWrapper = new IpfsWrapper();
  this.ensWrapper = new EnsWrapper();
  this.ipfsLibrary = new IpfsLibrary();
};

// https://www.srihash.org/
// https://github.com/liriliri/eruda
IpfsActions.prototype.loadErudaLibrary = async function() {
  await $tw.utils.loadLibrary(
    "ErudaLibrary",
    "https://cdn.jsdelivr.net/npm/eruda@1.10.3/eruda.min.js",
    "sha384-cWU0kVm57Cm5oD8JL8C4uTTgOD6xkKv1se8c3LSVB31FbcMMaV5RsW0qtoccoc0O"
  );
}

/* Beware you are in a widget, not in the saver */
IpfsActions.prototype.handleChangeEvent = function(changes) {
  // process priority
  var priority = changes["$:/ipfs/saver/priority/default"];
  if (priority !== undefined) {
    // Update Ipfs saver
    $tw.saverHandler.updateSaver("ipfs", $tw.utils.getIpfsPriority());
    if ($tw.utils.getIpfsVerbose()) console.info(
      "Updated Ipfs Saver priority: "
      + $tw.utils.getIpfsPriority()
    );
  }
  // process verbose
  var verbose = changes["$:/ipfs/saver/verbose"];
  if (verbose !== undefined) {
    if ($tw.utils.getIpfsVerbose()) {
      console.info("Ipfs Saver is verbose...");
    } else {
      console.info("Ipfs Saver is not verbose...");
    }
  }
  // process unpin
  var unpin = changes["$:/ipfs/saver/unpin"];
  if (unpin !== undefined) {
    if ($tw.utils.getIpfsUnpin()) {
      if ($tw.utils.getIpfsVerbose()) console.info("Ipfs Saver will unpin previous content...");
    } else {
      if ($tw.utils.getIpfsVerbose()) console.info("Ipfs Saver will not unpin previous content...");
    }
  }
}

/* Beware you are in a widget, not in the instance of this saver */
IpfsActions.prototype.handleExportToIpfs = async function(self, event) {

  const title = event.tiddlerTitle;

  // Current tiddler
  const tiddler = $tw.wiki.getTiddler(title);
  if (tiddler == undefined || tiddler == null) {
    return false;
  }

  // Do not process if _canonical_uri is set
  var uri = tiddler.getFieldString("_canonical_uri");
  if (uri !== undefined && uri !== null && uri.trim() !== "") {
    const msg = "Nothing to export...";
    console.warn(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Check content type, only base64 and image/svg+xml are suppported yet
  var type = tiddler.getFieldString("type");
  // Check
  if (type == undefined || type == null || type.trim() == "") {
    var msg = "Unknown Tiddler Type...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }
  type = type.trim();

  // Retrieve content-type
  const info = $tw.config.contentTypeInfo[type];
  // Check
  if (info == undefined || info == null)  {
    var msg = "Unknown Content Type: " + type;
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Check
  if (info.encoding !== "base64" && type !== "image/svg+xml" && type !== "text/vnd.tiddlywiki")  {
    const msg = "Exporting to Ipfs is not supported...\nLook at the documentation...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Check
  const gatewayUrl = $tw.utils.getIpfsGatewayUrl();
  if (gatewayUrl == null) {
    const msg = "Undefined Ipfs gateway Url...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Process Gateway URL
  const { protocol: gatewayProtocol, host: gatewayHost } = self.ipfsLibrary.parseUrl(gatewayUrl);

  // Getting an Ipfs client
  var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Upload
  var content = null;
  if (info.encoding === "base64" || type === "image/svg+xml") {
    content = tiddler.getFieldString("text");
  } else {
    const options = {
      downloadType: "text/plain",
      method: "download",
      template: "$:/core/templates/exporters/TidFile",
      variables: {
        exportFilter: "[[" + event.tiddlerTitle + "]]"
      }
    };
    content = $tw.wiki.renderTiddler(
      "text/plain",
      "$:/core/templates/exporters/TidFile",
      options
    );
  }

  if ($tw.utils.getIpfsVerbose()) console.log(
    "Uploading attachment: "
    + content.length
    + " bytes"
  );

  try {
    // Encrypt
    if ($tw.crypto.hasPassword()) {
      if (info.encoding === "base64") {
        content = atob(content);
      }
      content = $tw.crypto.encrypt(content, $tw.crypto.currentPassword);
    }
  } catch (error) {
    console.error(error);
    $tw.utils.messageDialog("Failed to encrypt content...");
    return false;
  };

  // Add
  var { error, added } = await self.ipfsWrapper.addToIpfs(ipfs, content);
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Pin, if failure log and continue
  var { error } = await self.ipfsWrapper.pinToIpfs(ipfs, added);
  if (error != null)  {
    console.warn(error);
  }

  // Build _canonical_uri
  uri = gatewayProtocol
  + "//"
  + gatewayHost
  + "/"
  + ipfsKeyword
  + "/"
  + added;

  var addTags = [];
  var removeTags = [];
  if (info.encoding === "base64" || type === "image/svg+xml") {
    if ($tw.crypto.hasPassword() && tiddler.hasTag("$:/isEncrypted") == false) {
      addTags = ["$:/isAttachment", "$:/isEncrypted", "$:/isIpfs"];
      removeTags = ["$:/isImported", "$:/isEmbedded"];
    } else {
      addTags = ["$:/isAttachment", "$:/isIpfs"];
      removeTags = ["$:/isImported", "$:/isEmbedded"];
    }
  } else {
    if ($tw.crypto.hasPassword() && tiddler.hasTag("$:/isEncrypted") == false) {
      addTags = ["$:/isImported", "$:/isEncrypted", "$:/isIpfs"];
      removeTags = ["$:/isAttachment", "$:/isEmbedded"];
    } else {
      addTags = ["$:/isImported", "$:/isIpfs"];
      removeTags = ["$:/isAttachment", "$:/isEmbedded"];
    }
  }

  // Process
  $tw.utils.updateTiddler(
    tiddler,
    addTags,
    removeTags,
    "",
    uri
  );

  return true;

}

IpfsActions.prototype.handleMobileConsole = async function(self, tiddler) {
  // Load mobile console if applicable
  if (typeof window.eruda === "undefined") {
    await self.loadErudaLibrary();
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
    if ($tw.utils.getIpfsVerbose()) console.info("Mobile console has been loaded...");
  } else {
    window.eruda.destroy();
    delete window.eruda;
    if ($tw.utils.getIpfsVerbose()) console.info("Mobile console has been unloaded...");
  }
}

/* Beware you are in a widget, not in the instance of this saver */
IpfsActions.prototype.handlePublishToEns = async function(self, event) {

  // Process document URL
  var { protocol, pathname } = self.ipfsLibrary.parseUrl(document.URL);

  // Check
  if (protocol == undefined || protocol == null) {
    const msg = "Unknown protocol...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }
  if (protocol === fileProtocol) {
    const msg = "Undefined Ipfs wiki...";
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

  // Extract and check URL Ipfs protocol and cid
  var { protocol, cid } = self.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    const msg = "Unknown Ipfs protocol...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }
  if (cid == null) {
    const msg = "Unknown Ipfs identifier...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Getting an Ipfs client
  var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Resolve ipns key if applicable
  if (protocol === ipnsKeyword) {
    var { error, resolved: cid } = await self.resolveIpns(self, ipfs, cid);
    if (error != null) {
      console.error(error);
      $tw.utils.messageDialog(error.message);
      return false;
    }
  }

  // Getting default ens domain
  var ensDomain = $tw.utils.getIpfsEnsDomain();
  // Check
  if (ensDomain == null) {
    const msg  ="Undefined Ens Domain...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  if ($tw.utils.getIpfsVerbose()) console.info(
    "Ens Domain: "
    + ensDomain
  );

  // Retrieve a Web3 provider
  var { error, web3Provider, account } = await self.ensWrapper.getWeb3Provider();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Fetch Ens domain content
  var { error, decoded, protocol } = await self.ensWrapper.getContenthash(ensDomain, web3Provider, account);
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Nothing to publish
  if (decoded !== null && decoded === cid) {
    const msg = "Nothing to publish. The current Ipfs identifier is up to date...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  if ($tw.utils.getIpfsVerbose()) console.info(
    "Publishing Ens domain: "
    + ensDomain
  );

  var { error } = await self.ensWrapper.setContenthash(ensDomain, cid, web3Provider, account);
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  $tw.utils.messageDialog(
    "Successfully set Ens domain:\n"
    + ensDomain
    + "\nprotocol:\n"
    + ipfsKeyword
    + "\nidentifier:\n"
    + cid
  );

  return false;

}

IpfsActions.prototype.handlePublishToIpns = async function(self, event) {

  // Process document URL
  var { protocol, pathname } = self.ipfsLibrary.parseUrl(document.URL);

  // Check
  if (protocol == undefined || protocol == null) {
    const msg = "Unknown protocol...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }
  if (protocol === fileProtocol) {
    const msg = "Undefined Ipfs wiki...";
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

  // Extract and check URL Ipfs protocol and cid
  var { protocol, cid } = self.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    const msg = "Unknown Ipfs protocol...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }
  if (cid == null) {
    const msg = "Unknown Ipfs identifier...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Getting an Ipfs client
  var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Getting default ipns key and ipns name
  var ipnsKey = $tw.utils.getIpfsIpnsKey();
  var ipnsName = $tw.utils.getIpfsIpnsName();

  // Check
  if (ipnsKey == null) {
    const msg = "Nothing to publish. Undefined default Ipns key....";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  if (protocol === ipnsKeyword) {
    // Check
    if (ipnsKey === cid) {
      const msg = "Nothing to publish. Default Ipns key matches current Ipfs identifier....";
      console.error(msg);
      $tw.utils.messageDialog(msg);
      return false;
    }
    // Resolve cid
    var { error, resolved: cid } = await self.resolveIpns(self, ipfs, cid);
    if (error != null) {
      console.error(error);
      $tw.utils.messageDialog(error.message);
      return false;
    }
  }

  // Resolve ipns key and ipns name
  var { error, ipnsName, ipnsKey, resolved } = await self.resolveIpns(self, ipfs, ipnsKey, ipnsName);
  if (error != null) {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Check
  if (resolved === cid) {
    const msg = "Nothing to publish. Ipfs identifiers are matching....";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  if ($tw.utils.getIpfsVerbose()) console.info(
    "Publishing Ipns name: "
    + ipnsName
  );

  var { error } = await self.ipfsWrapper.publishToIpfs(ipfs, ipnsName, cid);
  if (error != null) {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Unpin previous
  if ($tw.utils.getIpfsUnpin() && resolved != null) {
    if ($tw.utils.getIpfsVerbose()) console.info(
      "Request to unpin: /"
      + ipfsKeyword
      + "/"
      + resolved
    );
    var { error } = await self.ipfsWrapper.unpinFromIpfs(ipfs, resolved);
    // Log and continue
    if (error != null)  {
      console.error(error);
    }
  }

  $tw.utils.messageDialog(
    "Successfully published Ipns name:\n"
    + ipnsName
    + "\nprotocol:\n"
    + ipfsKeyword
    + "\nidentifier:\n"
    + cid
  );

  return false;

}

IpfsActions.prototype.handleRefreshTiddler = function(event) {
  const title = event.tiddlerTitle;
  if (title !== undefined && title !== null) {
    // current tiddler
    const tiddler = $tw.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      const msg = "Unknown tiddler: " + title;
      console.error(msg);
      $tw.utils.messageDialog(msg);
      return false;
    }
    $tw.wiki.clearCache(title);
    const changedTiddlers = $tw.utils.getChangedTiddlers(tiddler);
    $tw.rootWidget.refresh(changedTiddlers);
  }
  return true;
}

IpfsActions.prototype.handleFileImport = function(tiddler) {
  // Update tiddler
  const addition = $tw.wiki.getModificationFields();
  addition.title = tiddler.fields.title;
  addition.tags = (tiddler.fields.tags || []).slice(0);
  // Add isAttachment tag
  if (addition.tags.indexOf("$:/isAttachment") == -1) {
    $tw.utils.pushTop(addition.tags, "$:/isAttachment");
  }
  // Add isEmbedded tag
  if (addition.tags.indexOf("$:/isEmbedded") == -1) {
    $tw.utils.pushTop(addition.tags, "$:/isEmbedded");
  }
  return new $tw.Tiddler(tiddler, addition);
}

exports.IpfsActions = IpfsActions;

})();
