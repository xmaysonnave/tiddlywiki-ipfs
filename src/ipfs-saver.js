/*\
title: $:/plugins/ipfs/ipfs-saver.js
type: application/javascript
module-type: saver

IpfsSaver

\*/

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;
const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;
const IpfsLibrary = require("$:/plugins/ipfs/ipfs-library.js").IpfsLibrary;
const fileProtocol = "file:";
const ensKeyword = "ens";
const ipfsKeyword = "ipfs";
const ipnsKeyword = "ipns";

/*
Select the appropriate saver module and set it up
*/
var IpfsSaver = function(wiki) {
  var self = this;
  this.wiki = wiki;
  this.apiUrl = null;
  this.ipfsProvider = null;
  this.toBeUnpinned = [];
  this.ipfsWrapper = new IpfsWrapper();
  this.ensWrapper = new EnsWrapper();
  this.ipfsLibrary = new IpfsLibrary();
  // Event management
  $tw.wiki.addEventListener("change", function(changes) {
    return self.handleChangeEvent(changes);
  });
  $tw.rootWidget.addEventListener("tm-export-to-ipfs", function(event) {
    return self.handleExportToIpfs(self, event);
  });
  $tw.rootWidget.addEventListener("tm-ipfs-pin", function(event) {
    return self.handleIpfsPin(self, event);
  });
  $tw.rootWidget.addEventListener("tm-ipfs-unpin", function(event) {
    return self.handleIpfsUnpin(self, event);
  });
  $tw.rootWidget.addEventListener("tm-mobile-console", function(event) {
    return self.handleMobileConsole(self, event);
  });
  $tw.rootWidget.addEventListener("tm-publish-to-ens", function(event) {
    return self.handlePublishToEns(self, event);
  });
  $tw.rootWidget.addEventListener("tm-publish-to-ipns", function(event) {
    return self.handlePublishToIpns(self, event);
  });
  $tw.rootWidget.addEventListener("tm-tiddler-refresh", function(event) {
    return self.handleRefreshTiddler(self, event);
  });
  $tw.hooks.addHook("th-deleting-tiddler", function(tiddler) {
    return self.handleDeleteTiddler(self, tiddler);
  });
  $tw.hooks.addHook("th-importing-tiddler", function(tiddler) {
    return self.handleFileImport(self, tiddler);
  });
  $tw.hooks.addHook("th-saving-tiddler", function(tiddler) {
    return self.handleSaveTiddler(self, tiddler);
  });
}

// https://www.srihash.org/
// https://github.com/liriliri/eruda
IpfsSaver.prototype.loadErudaLibrary = async function() {
  await $tw.utils.loadLibrary(
    "ErudaLibrary",
    "https://cdn.jsdelivr.net/npm/eruda@1.10.3/eruda.min.js",
    "sha384-cWU0kVm57Cm5oD8JL8C4uTTgOD6xkKv1se8c3LSVB31FbcMMaV5RsW0qtoccoc0O"
  );
}

IpfsSaver.prototype.handleMobileConsole = async function(self, tiddler) {
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

IpfsSaver.prototype.messageDialog = function(message) {
  if (message !== undefined && message !== null && message.trim() !== "") {
    alert(message.trim());
  } else {
    alert($tw.language.getString("Error/Caption"));
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
    var unpin = null;
    var cid = null;
    var ipfsProtocol = ipfsKeyword;
    var ensDomain = null;
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
      const msg = "Undefined Ipfs Gateway Url...";
      console.error(msg);
      callback(msg);
      return false;
    }

    // Process Gateway URL
    const {
      protocol: gatewayProtocol,
      host: gatewayHost
    } = this.ipfsLibrary.parseUrl(gatewayUrl);

    // Extract and check URL Ipfs protocol and cid
    if (wikiProtocol !== fileProtocol) {
      // Decode pathname
      var { protocol, cid } = this.ipfsLibrary.decodeCid(wikiPathname);
      // Check
      if (protocol != null && cid != null) {
        ipfsProtocol = protocol;
        if ($tw.utils.getIpfsUnpin() && ipfsProtocol === ipfsKeyword) {
          if (this.toBeUnpinned.indexOf(cid) == -1) {
            unpin = cid;
            this.toBeUnpinned.push(unpin);
            if ($tw.utils.getIpfsVerbose()) console.info(
              "Request to unpin: /"
              + ipfsKeyword
              + "/"
              + unpin
            );
          }
        }
      }
    }

    // Getting an Ipfs client
    var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
    if (error != null)  {
      console.error(error);
      callback(error.message);
      return false;
    }

    // Resolve Ipns
    if (ipfsProtocol === ipnsKeyword || $tw.utils.getIpfsProtocol() === ipnsKeyword) {

      // Resolve ipns key and ipns name
      var { error, ipnsName, ipnsKey, resolved } = await this.resolveIpns(this, ipfs, ipnsKey, ipnsName);
      if (error != null) {
        console.error(error);
        callback(error.message);
        return false;
      }

      // Store to unpin previous if any
      if ($tw.utils.getIpfsUnpin() && resolved != null) {
        if (this.toBeUnpinned.indexOf(resolved) == -1) {
          this.toBeUnpinned.push(resolved);
          if ($tw.utils.getIpfsVerbose()) console.info(
            "Request to unpin: /"
            + ipfsKeyword
            + "/"
            + resolved
          );
        }
      }

    // Check Ens domain
    } else if ($tw.utils.getIpfsProtocol() === ensKeyword) {

      // Getting default ens domain
      ensDomain = $tw.utils.getIpfsEnsDomain();
      // Check
      if (ensDomain == null) {
        const msg  ="Undefined Ens Domain...";
        console.error(msg);
        callback(msg);
        return false;
      } else {
        ensDomain = ensDomain.trim();
      }
      if ($tw.utils.getIpfsVerbose()) console.info(
        "Ens Domain: "
        + ensDomain
      );

      // Fetch Ens domain content
      const { error, protocol, content } = await this.ensWrapper.getContenthash(ensDomain);
      if (error != null)  {
        console.error(error);
        callback(error.message);
        return false;
      }

      // Check is content protocol is ipfs to unpin previous
      if ($tw.utils.getIpfsUnpin() && protocol === ipfsKeyword) {
        // Store to unpin previous
        unpin = content;
        if (this.toBeUnpinned.indexOf(unpin) == -1) {
          this.toBeUnpinned.push(unpin);
          if ($tw.utils.getIpfsVerbose()) console.info(
            "Request to unpin: /"
            + ipfsKeyword
            + "/"
            + unpin
          );
        }
      }

    }

    // Upload  current document
    if ($tw.utils.getIpfsVerbose()) console.info(
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

    // Publish to Ipns if ipns is requested or the current protocol is ipns
    if ($tw.utils.getIpfsProtocol() === ipnsKeyword || ipfsProtocol === ipnsKeyword) {
      // Publish to Ipns if ipnsKey match the current hash or current protocol is ipfs
      if (cid === ipnsKey || ipfsProtocol === ipfsKeyword) {
        if ($tw.utils.getIpfsVerbose()) console.info(
          "Publishing Ipns name: "
          + ipnsName
        );
        var { error } = await this.ipfsWrapper.publishToIpfs(ipfs, ipnsName, added);
        if (error != null)  {
          console.error(error);
          callback(error.message);
          return false;
        }
      }
    // Publish to Ens if ens is requested
    } else if ($tw.utils.getIpfsProtocol() === ensKeyword) {
      if ($tw.utils.getIpfsVerbose()) console.info(
        "Publishing Ens domain: "
        + ensDomain
      );
      var { error } = await this.ensWrapper.setContenthash(ensDomain, added);
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

    // Next location
    var nextCid;
    if ($tw.utils.getIpfsProtocol() === ipnsKeyword) {
      if (ipfsProtocol == ipfsKeyword || cid == null) {
        nextCid = "/" + ipnsKeyword + "/" + ipnsKey;
      } else {
        nextCid = "/" + ipnsKeyword + "/" + cid;
      }
    } else {
      nextCid = "/" + ipfsKeyword + "/" + added;
    }
    if (wikiProtocol === fileProtocol) {
      const url = gatewayProtocol
        + "//"
        + gatewayHost
        + nextCid
        + `/${wikiSearch || ''}${wikiFragment || ''}`;
      if ($tw.utils.getIpfsVerbose()) console.info(
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
      if ($tw.utils.getIpfsVerbose()) console.info(
        "Assigning new location: "
        + url
      );
      window.location.assign(url);
    } else if ($tw.utils.getIpfsProtocol() === ensKeyword) {
      const url = "https://"
        + ensDomain
        + `/${wikiSearch || ''}${wikiFragment || ''}`;
      if ($tw.utils.getIpfsVerbose()) console.info(
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
      if ($tw.utils.getIpfsVerbose()) console.info(
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
    if ($tw.utils.getIpfsVerbose()) console.info(
      "Request to unpin: /"
      + ipfsKeyword
      + "/"
      + cid
    );
  }
  return tiddler;
}

IpfsSaver.prototype.handleFileImport = function(self, tiddler) {
  // Update tiddler
  const addition = self.wiki.getModificationFields();
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
  const oldTiddler = self.wiki.getTiddler(tiddler.fields.title);
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

  var type = tiddler.getFieldString("type").trim();

  // _canonical_uri attribute has been removed
  if (uri == null) {

    // Retrieve content-type
    const info = $tw.config.contentTypeInfo[type];
    if (info == undefined || info == null)  {
      var msg = "Unable to Embed from Ipfs. Unknown Tiddler Type";
      if (type == undefined || type == null || type.trim() == "") {
        msg = msg + "..."
      } else {
        msg = msg + ": " + type;
      }
      console.error(msg);
      self.messageDialog(msg);
      return oldTiddler;
    }

    var content = tiddler.getFieldString("text");

    if (info.encoding === "base64" || type === "image/svg+xml") {

      // Load
      try {
        content = await $tw.utils.httpGetToUint8Array(oldUri);
      } catch (error) {
        console.error(error);
        self.messageDialog(error.message);
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

      updatedTiddler = $tw.utils.updateTiddler(
        tiddler,
        ["$:/isAttachment", "$:/isEmbedded"],
        ["$:/isEncrypted", "$:/isIpfs"],
        content
      );

      if ($tw.utils.getIpfsVerbose()) console.log(
        "Embedding attachment: "
        + content.length
        + " bytes"
      );

    } else {

      updatedTiddler = $tw.utils.updateTiddler(
        tiddler,
        [],
        ["$:/isAttachment", "$:/isEmbedded", "$:/isEncrypted", "$:/isIpfs"],
        content
      );

    }

  } else {

    // New _canonical_uri, unable to decide whether or not the content is encrypted
    const { pathname } = self.ipfsLibrary.parseUrl(uri);
    const { cid } = self.ipfsLibrary.decodeCid(pathname);
    if (cid !== null) {
      updatedTiddler = $tw.utils.updateTiddler(
        tiddler,
        ["$:/isAttachment", "$:/isIpfs"],
        ["$:/isEmbedded", "$:/isEncrypted"],
        "",
        uri
      );
    } else {
      updatedTiddler = $tw.utils.updateTiddler(
        tiddler,
        ["$:/isAttachment"],
        ["$:/isEmbedded", "$:/isEncrypted", "$:/isIpfs"],
        "",
        uri
      );
    }

  }

  if (oldUri !== null) {
    const { pathname } = self.ipfsLibrary.parseUrl(oldUri);
    const { cid } = self.ipfsLibrary.decodeCid(pathname);
    // Process previous cid if any
    if (cid !== null) {
      if ($tw.utils.getIpfsUnpin() && self.toBeUnpinned.indexOf(cid) == -1) {
        self.toBeUnpinned.push(cid);
        if ($tw.utils.getIpfsVerbose()) console.info(
          "Request to unpin: /"
          + ipfsKeyword
          + "/"
          + cid
        );
      }
    }
  }

  return updatedTiddler;

}

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handleExportToIpfs = async function(self, event) {

  const title = event.tiddlerTitle;

  // Current tiddler
  const tiddler = self.wiki.getTiddler(title);
  if (tiddler == undefined || tiddler == null) {
    return false;
  }

  // Do not process if _canonical_uri is set
  var uri = tiddler.getFieldString("_canonical_uri");
  if (uri !== undefined && uri !== null && uri.trim() !== "") {
    const msg = "Nothing to export...";
    console.warn(msg);
    self.messageDialog(msg);
    return false;
  }

  // Check content type, only base64 and image/svg+xml are suppported yet
  var type = tiddler.getFieldString("type").trim();
  // Retrieve content-type
  const info = $tw.config.contentTypeInfo[type];
  if (info == undefined || info == null)  {
    var msg = "Unable to Upload to Ipfs. Unknown Tiddler Type";
    if (type == undefined || type == null || type.trim() == "") {
      msg = msg + "..."
    } else {
      msg = msg + ": " + type;
    }
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }

  // Check
  const gatewayUrl = $tw.utils.getIpfsGatewayUrl();
  if (gatewayUrl == null) {
    const msg = "Undefined Ipfs gateway Url...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }

  // Process Gateway URL
  const { protocol: gatewayProtocol, host: gatewayHost } = self.ipfsLibrary.parseUrl(gatewayUrl);

  // Getting an Ipfs client
  var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    self.messageDialog(error.message);
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
    self.messageDialog("Failed to encrypt content...");
    return false;
  };

  // Add
  var { error, added } = await self.ipfsWrapper.addToIpfs(ipfs, content);
  if (error != null)  {
    console.error(error);
    self.messageDialog(error.message);
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

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handlePublishToEns = async function(self, event) {

  // Process document URL
  var { protocol, pathname } = self.ipfsLibrary.parseUrl(document.URL);

  // Check
  if (protocol == undefined || protocol == null) {
    const msg = "Unknown protocol...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }
  if (protocol === fileProtocol) {
    const msg = "Undefined Ipfs wiki...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }
  if (pathname == undefined || pathname == null) {
    const msg = "Unknown pathname...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }

  // Extract and check URL Ipfs protocol and cid
  var { protocol, cid } = self.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    const msg = "Unknown Ipfs protocol...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }
  if (cid == null) {
    const msg = "Unknown Ipfs identifier...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }

  // Getting an Ipfs client
  var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    self.messageDialog(error.message);
    return false;
  }

  // Resolve ipns key if applicable
  if (protocol === ipnsKeyword) {
    var { error, resolved: cid } = await self.resolveIpns(self, ipfs, cid);
    if (error != null) {
      console.error(error);
      self.messageDialog(error.message);
      return false;
    }
  }

  // Getting default ens domain
  var ensDomain = $tw.utils.getIpfsEnsDomain();
  // Check
  if (ensDomain == null) {
    const msg  ="Undefined Ens Domain...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }
  if ($tw.utils.getIpfsVerbose()) console.info(
    "Ens Domain: "
    + ensDomain
  );

  // Fetch Ens domain content
  var { error, protocol, content } = await self.ensWrapper.getContenthash(ensDomain);
  if (error != null)  {
    console.error(error);
    self.messageDialog(error.message);
    return false;
  }

  // Nothing to publish
  if (content !== null && content === cid) {
    const msg = "Nothing to publish. The current Ipfs identifier is up to date...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }

  if ($tw.utils.getIpfsVerbose()) console.info(
    "Publishing Ens domain: "
    + ensDomain
  );
  var { error } = await self.ensWrapper.setContenthash(ensDomain, cid);
  if (error != null)  {
    console.error(error);
    self.messageDialog(error.message);
    return false;
  }

  self.messageDialog(
    "Successfully set Ens domain:\n"
    + ensDomain
    + "\nprotocol:\n"
    + ipfsKeyword
    + "\nidentifier:\n"
    + cid
  );

  return false;

}

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handlePublishToIpns = async function(self, event) {

  // Process document URL
  var { protocol, pathname } = self.ipfsLibrary.parseUrl(document.URL);

  // Check
  if (protocol == undefined || protocol == null) {
    const msg = "Unknown protocol...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }
  if (protocol === fileProtocol) {
    const msg = "Undefined Ipfs wiki...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }
  if (pathname == undefined || pathname == null) {
    const msg = "Unknown pathname...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }

  // Extract and check URL Ipfs protocol and cid
  var { protocol, cid } = self.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    const msg = "Unknown Ipfs protocol...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }
  if (cid == null) {
    const msg = "Unknown Ipfs identifier...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }

  // Getting an Ipfs client
  var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    self.messageDialog(error.message);
    return false;
  }

  // Getting default ipns key and ipns name
  var ipnsKey = $tw.utils.getIpfsIpnsKey();
  var ipnsName = $tw.utils.getIpfsIpnsName();

  // Check
  if (ipnsKey == null) {
    const msg = "Nothing to publish. Undefined default Ipns key....";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }

  if (protocol === ipnsKeyword) {
    // Check
    if (ipnsKey === cid) {
      const msg = "Nothing to publish. Default Ipns key matches current Ipfs identifier....";
      console.error(msg);
      self.messageDialog(msg);
      return false;
    }
    // Resolve cid
    var { error, resolved: cid } = await self.resolveIpns(self, ipfs, cid);
    if (error != null) {
      console.error(error);
      self.messageDialog(error.message);
      return false;
    }
  }

  // Resolve ipns key and ipns name
  var { error, ipnsName, ipnsKey, resolved } = await self.resolveIpns(self, ipfs, ipnsKey, ipnsName);
  if (error != null) {
    console.error(error);
    self.messageDialog(error.message);
    return false;
  }

  // Check
  if (resolved === cid) {
    const msg = "Nothing to publish. Ipfs identifiers are matching....";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }

  if ($tw.utils.getIpfsVerbose()) console.info(
    "Publishing Ipns name: "
    + ipnsName
  );

  var { error } = await self.ipfsWrapper.publishToIpfs(ipfs, ipnsName, cid);
  if (error != null) {
    console.error(error);
    self.messageDialog(error.message);
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

  self.messageDialog(
    "Successfully published Ipns name:\n"
    + ipnsName
    + "\nprotocol:\n"
    + ipfsKeyword
    + "\nidentifier:\n"
    + cid
  );

  return false;

}

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handleIpfsPin = async function(self, event) {

  var protocol = null;
  var pathname = null;
  var cid = null;

  if (event.param !== undefined && event.param !== null) {
    const title = event.tiddlerTitle;
    // current tiddler
    const tiddler = self.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      const msg = "Unknown tiddler: " + title;
      console.error(msg);
      self.messageDialog(msg);
      return false;
    }
    // Process if _canonical_uri is set
    const uri = tiddler.getFieldString("_canonical_uri");
    if (uri == undefined || uri == null || uri.trim() === "") {
      const msg = "The '_canonical_uri' field is not defined....";
      console.error(msg);
      self.messageDialog(msg);
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
    self.messageDialog(msg);
    return false;
  }
  if (protocol === fileProtocol) {
    const msg = "Undefined Ipfs wiki...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }
  if (pathname == undefined || pathname == null) {
    const msg = "Unknown pathname...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }

  // Extract and check URL Ipfs protocol and cid
  var { protocol, cid } = self.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    const msg = "Unknown Ipfs protocol...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }
  if (cid == null) {
    const msg = "Unknown Ipfs identifier...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }

  // Getting an Ipfs client
  var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    self.messageDialog(error.message);
    return false;
  }

  // Resolve ipns key if applicable
  if (protocol === ipnsKeyword) {
    var { error, resolved: cid } = await self.resolveIpns(self, ipfs, cid);
    if (error != null) {
      console.error(error);
      self.messageDialog(error.message);
      return false;
    }
  }

  if ($tw.utils.getIpfsVerbose()) console.info(
    "Pinning: /"
    + ipfsKeyword
    + "/"
    + cid
  );

  var { error } = await self.ipfsWrapper.pinToIpfs(ipfs, cid);
  if (error != null) {
    console.error(error);
    self.messageDialog(error.message);
    return false;
  }

  if ($tw.utils.getIpfsUnpin() && self.toBeUnpinned.indexOf(cid) !== -1) {
    $tw.utils.removeArrayEntries(self.toBeUnpinned, cid);
  }

  self.messageDialog(
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
    const tiddler = self.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      const msg = "Unknown tiddler: " + title;
      console.error(msg);
      self.messageDialog(msg);
      return false;
    }
    // Process if _canonical_uri is set
    const uri = tiddler.getFieldString("_canonical_uri");
    if (uri == undefined || uri == null || uri.trim() === "") {
      const msg = "The '_canonical_uri' field is not defined....";
      console.error(msg);
      self.messageDialog(msg);
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
    self.messageDialog(msg);
    return false;
  }
  if (protocol === fileProtocol) {
    const msg = "Undefined Ipfs wiki...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }
  if (pathname == undefined || pathname == null) {
    const msg = "Unknown pathname...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }

  // Extract and check URL Ipfs protocol and cid
  var { protocol, cid } = self.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    const msg = "Unknown Ipfs protocol...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }
  if (cid == null) {
    const msg = "Unknown Ipfs identifier...";
    console.error(msg);
    self.messageDialog(msg);
    return false;
  }

  // Getting an Ipfs client
  var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    console.error(error);
    self.messageDialog(error.message);
    return false;
  }

  // Resolve ipns key if applicable
  if (protocol === ipnsKeyword) {
    var { error, resolved: cid } = await self.resolveIpns(self, ipfs, cid);
    if (error != null) {
      console.error(error);
      self.messageDialog(error.message);
      return false;
    }
  }

  if ($tw.utils.getIpfsVerbose()) console.info(
    "Unpinning: /"
    + ipfsKeyword
    + "/"
    + cid
  );
  var { error } = await self.ipfsWrapper.unpinFromIpfs(ipfs, cid);
  if (error != null) {
    console.error(error);
    self.messageDialog(error.message);
    return false;
  }

  if ($tw.utils.getIpfsUnpin() && self.toBeUnpinned.indexOf(cid) !== -1) {
    $tw.utils.removeArrayEntries(self.toBeUnpinned, cid);
  }

  self.messageDialog(
    "Successfully unpinned:"
    + "\nprotocol:\n"
    + ipfsKeyword
    + "\nidentifier:\n"
    + cid
  );

  return false;

}

IpfsSaver.prototype.resolveIpns = async function(self, ipfs, ipnsKey, ipnsName) {

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
      error: new Error("Undefined Ipns key and Ipns Name..."),
      ipnsName: null,
      ipnsKey: null,
      resolved: null
    };
  }

  // Load node Ipns keys
  var { error, keys } = await self.ipfsWrapper.getIpnsKeys(ipfs);
  if (error !== null)  {
    return {
      error: error,
      ipnsName: null,
      ipnsKey: null,
      resolved: null
    };
  }

  // Resolve ipns name and Ipns key
  if (ipnsName !== null && ipnsKey !== null) {
    if ($tw.utils.getIpfsVerbose()) console.info(
      "Resolve Ipns name: "
      + ipnsName
      + " and Ipns key: /"
      + ipnsKeyword
      + "/"
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
        error: new Error("Unknown Ipns name and Ipns key..."),
        ipnsName: null,
        ipnsKey: null,
        resolved: null
      };
    }
  } else if (ipnsName !== null) {
    if ($tw.utils.getIpfsVerbose()) console.info(
      "Resolve Ipns name: "
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
        error: new Error("Unknown Ipns name: " + ipnsName),
        ipnsName: null,
        ipnsKey: null,
        resolved: null
      };
    }
  } else {
    if ($tw.utils.getIpfsVerbose()) console.info(
      "Resolve Ipns key: /"
      + ipnsKeyword
      + "/"
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
        error: new Error("Unknown Ipns key..."),
        ipnsName: null,
        ipnsKey: null,
        resolved: null
      };
    }
  }

  // Resolve ipns key
  var { error, resolved } = await self.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
  if (error !== null) {
    return {
      error: error,
      ipnsName: null,
      ipnsKey: null,
      resolved: null
    };
  }
  if (resolved == null) {
    return {
      error: new Error("Unable to resolve..."),
      ipnsName: null,
      ipnsKey: null,
      resolved: null
    };
  }

  // resolve cid
  const { cid } = self.ipfsLibrary.decodeCid(resolved);

  return {
    error: null,
    ipnsName: ipnsName,
    ipnsKey: ipnsKey,
    resolved: cid
  }

}

/* Beware you are in a widget, not in the saver */
IpfsSaver.prototype.handleChangeEvent = function(changes) {
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
IpfsSaver.prototype.handleRefreshTiddler = async function(self, event) {
  const title = event.tiddlerTitle;
  if (title !== undefined && title !== null) {
    // current tiddler
    const tiddler = self.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      const msg = "Unknown tiddler: " + title;
      console.error(msg);
      self.messageDialog(msg);
      return false;
    }
    $tw.wiki.clearCache(title);
    const changedTiddlers = $tw.utils.getChangedTiddlers(tiddler);
    $tw.rootWidget.refresh(changedTiddlers);
  }
  return true;
}

/*
Information about this saver
*/
IpfsSaver.prototype.info = {
  name: "ipfs",
  priority: 3000,
  capabilities: ["save"]
};

/*
Static method that returns true if this saver is capable of working
*/
exports.canSave = function(wiki) {
  return true;
};

/*
Create an instance of this saver
*/
exports.create = function(wiki) {
  return new IpfsSaver(wiki);
};

})();
