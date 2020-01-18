/*\
title: $:/plugins/ipfs/ipfs-actions.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsActions

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;
const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;

const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;

const fileProtocol = "file:";
const ipfsKeyword = "ipfs";
const ipnsKeyword = "ipns";
var IpfsActions = function() {
  this.once = false;
  this.ipfsWrapper = new IpfsWrapper();
  this.ensWrapper = new EnsWrapper();
  this.ipfsLibrary = new IpfsLibrary();
  this.ipnsName = $tw.utils.getIpfsIpnsName();
  this.ipnsKey = $tw.utils.getIpfsIpnsKey();
};

IpfsActions.prototype.isVerbose = function() {
  try {
    return $tw.utils.getIpfsVerbose();
  } catch (error) {
    return false;
  }
}

IpfsActions.prototype.init = function() {
  // Init once
  if (this.once) {
    return;
  }
  const self = this;
  $tw.wiki.addEventListener("change", function(changes) {
    return self.handleChangeEvent(changes);
  });
  $tw.rootWidget.addEventListener("tm-export-to-ipfs", function(event) {
    return self.handleExportToIpfs(event);
  });
  $tw.rootWidget.addEventListener("tm-rename-ipns-name", function(event) {
    return self.handleRenameIpnsName(event);
  });
  $tw.rootWidget.addEventListener("tm-generate-ipns-key", function(event) {
    return self.handleGenerateIpnsKey(event);
  });
  $tw.rootWidget.addEventListener("tm-remove-ipns-key", function(event) {
    return self.handleRemoveIpnsKey(event);
  });
  $tw.rootWidget.addEventListener("tm-fetch-ipns-key", function(event) {
    return self.handleFetchIpnsKey(event);
  });
  $tw.rootWidget.addEventListener("tm-resolve-ipns-key-and-open", function(event) {
    return self.handleResolveIpnsKeyAndOpen(event);
  });
  $tw.rootWidget.addEventListener("tm-mobile-console", function(event) {
    return self.handleMobileConsole(event);
  });
  $tw.rootWidget.addEventListener("tm-publish-to-ens", function(event) {
    return self.handlePublishToEns(event);
  });
  $tw.rootWidget.addEventListener("tm-publish-to-ipns", function(event) {
    return self.handlePublishToIpns(event);
  });
  $tw.rootWidget.addEventListener("tm-tiddler-refresh", function(event) {
    return self.handleRefreshTiddler(event);
  });
  $tw.hooks.addHook("th-importing-tiddler", function(tiddler) {
    return self.handleFileImport(tiddler);
  });
  // Init once
  this.once = true;
}

// https://www.srihash.org/
// https://github.com/liriliri/eruda
IpfsActions.prototype.loadErudaLibrary = async function() {
  await $tw.utils.loadLibrary(
    "ErudaLibrary",
    "https://cdn.jsdelivr.net/npm/eruda@2.0.2/eruda.min.js",
    "sha384-GLqmQCByhqGAIgMwKsNaIgNZgaNZel7Moqd2mEoeQWUXUVBth0Yo3Nt6QiWiG9+w"
  );
}

/* Beware you are in a widget, not in the saver */
IpfsActions.prototype.handleChangeEvent = function(changes) {
  // process priority
  const priority = changes["$:/ipfs/saver/priority/default"];
  if (priority !== undefined && priority.modified) {
    // Update IPFS saver
    $tw.saverHandler.updateSaver("ipfs", $tw.utils.getIpfsPriority());
    if (this.isVerbose()) console.info(
      "Updated IPFS Saver priority: "
      + $tw.utils.getIpfsPriority()
    );
  }
  // process verbose
  const verbose = changes["$:/ipfs/saver/verbose"];
  if (verbose !== undefined && verbose.modified) {
    if (this.isVerbose()) {
      console.info("IPFS with TiddlyWiki is verbose...");
    } else {
      console.info("IPFS with TiddlyWiki is not verbose...");
    }
  }
  // process unpin
  const unpin = changes["$:/ipfs/saver/unpin"];
  if (unpin !== undefined && unpin.modified) {
    if ($tw.utils.getIpfsUnpin()) {
      if (this.isVerbose()) console.info("IPFS with TiddlyWiki will unpin previous content...");
    } else {
      if (this.isVerbose()) console.info("IPFS with TiddlyWiki will not unpin previous content...");
    }
  }
  // process IPNS name
  const name = changes["$:/ipfs/saver/ipns/name"];
  if (name !== undefined && name.modified) {
    const tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
    if (tiddler !== undefined) {
      if ($tw.utils.getIpfsIpnsName() !== this.ipnsName) {
        if ($tw.utils.getIpfsIpnsKey() !== null) {
          $tw.utils.updateTiddler(
            tiddler,
            [],
            [],
            ""
          );
        }
      } else if ($tw.utils.getIpfsIpnsName() !== null) {
        if (this.ipnsKey !== null) {
          $tw.utils.updateTiddler(
            tiddler,
            [],
            [],
            this.ipnsKey
          );
        }
      }
    }
  }
}

IpfsActions.prototype.handleExportToIpfs = async function(event) {

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
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Check content type, only base64 and image/svg+xml are suppported yet
  var type = tiddler.getFieldString("type");
  // Check
  if (type == undefined || type == null) {
    var msg = "Unknown Tiddler Type...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

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
    const msg = "Exporting to IPFS is not supported...\nLook at the documentation...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Check
  const gatewayUrl = $tw.utils.getIpfsGatewayUrl();
  if (gatewayUrl == null) {
    const msg = "Undefined IPFS Gateway URL...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Process Gateway URL
  const { protocol: gatewayProtocol, host: gatewayHost } = this.ipfsLibrary.parseUrl(gatewayUrl);

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
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

  if (this.isVerbose()) console.log(
    "Uploading attachment: "
    + content.length
    + " bytes"
  );

  try {
    // Encrypt
    if ($tw.crypto.hasPassword()) {
      // https://github.com/xmaysonnave/tiddlywiki-ipfs/issues/9
      if (info.encoding === "base64") {
        content = atob(content);
      }
      content = $tw.crypto.encrypt(content, $tw.crypto.currentPassword);
      content = $tw.utils.StringToUint8Array(content);
    } else {
      // process base64
      if (info.encoding === "base64") {
        content = $tw.utils.Base64ToUint8Array(content);
      } else {
        content = $tw.utils.StringToUint8Array(content);
      }
    }
  } catch (error) {
    console.error(error);
    $tw.utils.messageDialog("Failed to encrypt content...");
    return false;
  };

  // Add
  var { error, added } = await this.ipfsWrapper.addToIpfs(ipfs, content);
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Pin, if failure log and continue
  var { error } = await this.ipfsWrapper.pinToIpfs(ipfs, added);
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
      removeTags = ["$:/isEmbedded"];
    } else {
      addTags = ["$:/isAttachment", "$:/isIpfs"];
      removeTags = ["$:/isEmbedded"];
    }
  } else {
    if ($tw.crypto.hasPassword() && tiddler.hasTag("$:/isEncrypted") == false) {
      addTags = ["$:/isEncrypted", "$:/isIpfs"];
      removeTags = ["$:/isAttachment", "$:/isEmbedded"];
    } else {
      addTags = ["$:/isIpfs"];
      removeTags = ["$:/isAttachment", "$:/isEmbedded"];
    }
  }

  $tw.utils.updateTiddler(
    tiddler,
    addTags,
    removeTags,
    "",
    uri
  );

  if (this.isVerbose()) console.info(
    "Successfully published Tiddler: "
    + title
    + " with IPFS identifier: /"
    + ipfsKeyword
    + "/"
    + added
  );

  return true;

}

IpfsActions.prototype.handleRenameIpnsName = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();

  // Check
  if (ipnsName == null) {
    const msg = "Undefined IPNS name....";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }
  if (this.ipnsName == null || this.ipnsName === ipnsName) {
    const msg = "Nothing to rename....";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Rename IPNS name
  var { error, key } = await this.ipfsWrapper.renameIpnsName(ipfs, this.ipnsName, ipnsName);
  if (error != null) {
    console.error(error);
    $tw.utils.messageDialog("Unable to rename IPNS name...");
    return false;
  }

  // Update Tiddler
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
  if (tiddler !== undefined) {
    $tw.utils.updateTiddler(
      tiddler,
      [],
      [],
      key
    );
  }

  // Successfully renamed
  this.ipnsName = ipnsName;
  this.ipnsKey = key;

  return true;

}

IpfsActions.prototype.handleGenerateIpnsKey = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();

  // Check
  if (ipnsName == null) {
    const msg = "Undefined IPNS name....";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Generate IPNS key
  var { error, key } = await this.ipfsWrapper.generateIpnsKey(ipfs, ipnsName);
  if (error != null) {
    console.error(error);
    $tw.utils.messageDialog("Unable to generate IPNS key...");
    return false;
  }

  // Update Tiddler
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
  if (tiddler !== undefined) {
    $tw.utils.updateTiddler(
      tiddler,
      [],
      [],
      key
    );
  }

  // Successfully generated
  this.ipnsName = ipnsName;
  this.ipnsKey = key;

  return true;

}

IpfsActions.prototype.handleRemoveIpnsKey = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();
  var ipnsKey = $tw.utils.getIpfsIpnsKey();

  // Check
  if (ipnsName == null) {
    const msg = "Undefined IPNS name....";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Resolve CID
  var { error, ipnsName, ipnsKey, resolved } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
  if (error != null) {
    if (ipnsName !== null && ipnsKey !== null) {
      // Log, warn user and continue
      console.warn(error);
      console.warn("Unable to resolve IPNS key...");
    } else {
      console.error(error);
      $tw.utils.messageDialog(error.message);
      return false;
    }
  }

  // Unpin previous
  if ($tw.utils.getIpfsUnpin() && resolved != null) {
    if (this.isVerbose()) console.info(
      "Request to unpin: /"
      + ipfsKeyword
      + "/"
      + resolved
    );
    var { error } = await this.ipfsWrapper.unpinFromIpfs(ipfs, resolved);
    // Log and continue
    if (error != null)  {
      console.warn(error);
    }
  }

  // Remove IPNS key
  var { error } = await this.ipfsWrapper.removeIpnsKey(ipfs, ipnsName);
  if (error != null) {
    const msg = "Unable to remove resolved IPNS key...";
    console.error(error);
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Update Tiddlers
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/name");
  if (tiddler !== undefined) {
    $tw.utils.updateTiddler(
      tiddler,
      [],
      [],
      ""
    );
  }
  tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
  if (tiddler !== undefined && $tw.utils.getIpfsIpnsKey() !== null) {
    $tw.utils.updateTiddler(
      tiddler,
      [],
      [],
      ""
    );
  }

  // Successfully removed
  this.ipnsName = null;
  this.ipnsKey = null;

  return true;

}

IpfsActions.prototype.handleFetchIpnsKey = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();
  var ipnsKey = $tw.utils.getIpfsIpnsKey();

  // Check
  if (ipnsName == null) {
    const msg = "Undefined IPNS name....";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Resolve CID
  var { error, ipnsKey } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
  if (error != null) {
    if (ipnsName !== null && ipnsKey !== null) {
      const msg = "Unable to resolve IPNS key...";
      console.warn(error);
      console.warn(msg);
    } else {
      console.error(error);
      $tw.utils.messageDialog(error.message);
      return false;
    }
  }

  // Update Tiddler
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
  if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
    $tw.utils.updateTiddler(
      tiddler,
      [],
      [],
      ipnsKey
    );
    this.ipnsKey = ipnsKey;
  }
  this.ipnsName = ipnsName;

  return true;

}

IpfsActions.prototype.handleResolveIpnsKeyAndOpen = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();
  var ipnsKey = $tw.utils.getIpfsIpnsKey();

  // Check
  if (ipnsName == null) {
    const msg = "Undefined IPNS name....";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Retrieve Gateway URL
  const gatewayUrl = $tw.utils.getIpfsGatewayUrl();
  // Check
  if (gatewayUrl == null) {
    const msg = "Undefined IPFS Gateway URL...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
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
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Resolve CID
  var { error, ipnsKey, ipnsName, resolved } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
  if (error != null) {
    if (ipnsName !== null && ipnsKey !== null) {
      const msg = "Unable to resolve IPNS key...";
      console.error(error);
      console.error(msg);
      $tw.utils.messageDialog(msg);
    } else {
      console.error(error);
      $tw.utils.messageDialog(error.message);
      return false;
    }
  }

  // Update Tiddler
  var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
  if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
    // Process
    $tw.utils.updateTiddler(
      tiddler,
      [],
      [],
      ipnsKey
    );
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
    window.open(url, "_blank");
  }

  return true;

}

IpfsActions.prototype.handleMobileConsole = async function(tiddler) {
  // Load mobile console if applicable
  if (typeof window.eruda === "undefined") {
    await this.loadErudaLibrary();
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
    if (this.isVerbose()) console.info("Mobile console has been loaded...");
  } else {
    window.eruda.destroy();
    delete window.eruda;
    if (this.isVerbose()) console.info("Mobile console has been unloaded...");
  }
}

IpfsActions.prototype.handlePublishToEns = async function(event) {

  // Process document URL
  var { protocol, pathname } = this.ipfsLibrary.parseUrl(document.URL);

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

  // Extract and check URL IPFS protocol and CID
  var { protocol, cid } = this.ipfsLibrary.decodeCid(pathname);

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
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Resolve IPNS key if applicable
  if (protocol === ipnsKeyword) {
    var { error, ipnsName, ipnsKey, resolved: cid } = await this.ipfsWrapper.resolveIpns(ipfs, cid);
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

  // Getting default ENS domain
  var ensDomain = $tw.utils.getIpfsEnsDomain();
  // Check
  if (ensDomain == null) {
    const msg  ="Undefined ENS domain...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  if (this.isVerbose()) console.info(
    "ENS domain: "
    + ensDomain
  );

  // Retrieve a WEB3 provider
  var { error, web3Provider, account } = await this.ensWrapper.getWeb3Provider();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Fetch ENS domain content
  var { error, decoded, protocol } = await this.ensWrapper.getContenthash(ensDomain, web3Provider, account);
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Nothing to publish
  if (decoded !== null && decoded === cid) {
    const msg = "The current resolved ENS domain content is up to date...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  if (this.isVerbose()) console.info(
    "Publishing ENS domain: "
    + ensDomain
  );

  var { error } = await this.ensWrapper.setContenthash(ensDomain, cid, web3Provider, account);
  if (error != null)  {
    const msg = "Unable to publish IPFS identifier to ENS...";
    console.error(error);
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  return false;

}

IpfsActions.prototype.handlePublishToIpns = async function(event) {

  // Process document URL
  var { protocol, pathname } = this.ipfsLibrary.parseUrl(document.URL);

  // Check
  if (protocol == undefined || protocol == null) {
    const msg = "Unknown protocol...";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }
  if (protocol === fileProtocol) {
    const msg = "Undefined IPFS identifier...";
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

  // Extract and check URL IPFS protocol and CID
  var { protocol, cid } = this.ipfsLibrary.decodeCid(pathname);

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
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    $tw.utils.messageDialog(error.message);
    return false;
  }

  // Default IPNS key and IPNS name
  var ipnsKey = $tw.utils.getIpfsIpnsKey();
  var ipnsName = $tw.utils.getIpfsIpnsName();

  // Check
  if (ipnsKey == null) {
    const msg = "Undefined default IPNS key....";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  if (protocol === ipnsKeyword) {
    // Check
    if (ipnsKey === cid) {
      const msg = "Default IPNS key matches current IPNS key....";
      console.error(msg);
      $tw.utils.messageDialog(msg);
      return false;
    }
    // Resolve current IPNS key
    var { error, ipnsName: currentIpnsName, ipnsKey: currentIpnsKey, resolved: cid } = await this.ipfsWrapper.resolveIpns(ipfs, cid);
    if (error != null)  {
      if (currentIpnsName !== null && currentIpnsKey !== null) {
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

  // Resolve default IPNS key and IPNS name
  var { error, ipnsName, ipnsKey, resolved } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
  if (error != null)  {
    if (ipnsName !== null && ipnsKey !== null) {
      const msg = "Unable to resolve default IPNS key...";
      console.error(error);
      console.error(msg);
      $tw.utils.messageDialog(msg);
    } else {
      console.error(error);
      $tw.utils.messageDialog(error.message);
    }
    return false;
  }

  // Check
  if (resolved === cid) {
    const msg = "IPFS identifiers are matching....";
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  if (this.isVerbose()) console.info(
    "Publishing IPNS name: "
    + ipnsName
  );

  var { error } = await this.ipfsWrapper.publishToIpfs(ipfs, ipnsName, cid);
  if (error != null) {
    const msg = "Unable to publish IPNS name...";
    console.error(error);
    console.error(msg);
    $tw.utils.messageDialog(msg);
    return false;
  }

  // Unpin previous
  if ($tw.utils.getIpfsUnpin() && resolved != null) {
    if (this.isVerbose()) console.info(
      "Request to unpin: /"
      + ipfsKeyword
      + "/"
      + resolved
    );
    var { error } = await this.ipfsWrapper.unpinFromIpfs(ipfs, resolved);
    // Log and continue
    if (error != null)  {
      console.warn(error);
    }
  }

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
