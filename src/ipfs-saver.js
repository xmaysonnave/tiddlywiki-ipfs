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
  this.wiki = wiki;
  this.apiUrl = null;
  this.ipfsProvider = null;
  this.toBeUnpinned = [];
  this.ipfsWrapper = new IpfsWrapper();
  this.ensWrapper = new EnsWrapper();
  this.ipfsLibrary = new IpfsLibrary();
  this.logger = new $tw.utils.Logger("ipfs-saver");
  const self = this;
  $tw.rootWidget.addEventListener("tm-export-to-ipfs", function(event) {
    return self.handleExportToIpfs(event);
  });
  $tw.rootWidget.addEventListener("tm-export-to-ipns", function(event) {
    return self.handleExportToIpns(event);
  });
  $tw.rootWidget.addEventListener("tm-ipfs-pin", function(event) {
    return self.handleIpfsPin(event);
  });
  $tw.rootWidget.addEventListener("tm-ipfs-unpin", function(event) {
    return self.handleIpfsUnpin(event);
  });
  $tw.hooks.addHook("th-deleting-tiddler", function(tiddler) {
    return self.handleDeleteTiddler(tiddler);
  });
  $tw.hooks.addHook("th-saving-tiddler", function(tiddler) {
    return self.handleSaveTiddler(tiddler);
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
    var nextWiki = null;
    var options = options || {};

    // Process document URL
    const {
      protocol: wikiProtocol,
      pathname: wikiPathname,
      search: wikiSearch,
      fragment: wikiFragment
    } = this.ipfsLibrary.parseUrl(document.URL);

    // Retrieve Gateway URL
    const gatewayUrl = $tw.utils.getIpfsGatewayUrl();
    // Check
    if (gatewayUrl == null) {
      callback("Undefined IPFS Gateway URL...");
      return false;
    }

    // Process Gateway URL
    const {
      protocol: gatewayProtocol,
      host: gatewayHost
    } = this.ipfsLibrary.parseUrl(gatewayUrl);

    // Next host
    const nextHost = gatewayProtocol
    + "//"
    + gatewayHost

    // URL Analysis
    if (wikiProtocol !== fileProtocol) {
      // Decode pathname
      var { protocol, cid } = this.ipfsLibrary.decodeCid(wikiPathname);
      // Check
      if (protocol != null && cid != null) {
        // Store current protocol
        ipfsProtocol = protocol;
        // Request to unpin if applicable
        if ($tw.utils.getIpfsUnpin()
          && ipfsProtocol === ipfsKeyword
          && this.toBeUnpinned.indexOf(cid) == -1
        ) {
          this.toBeUnpinned.push(cid);
          if (this.isVerbose()) this.logger.info(
            "Request to unpin: /"
            + ipfsKeyword
            + "/"
            + cid
          );
        }
      }
    }

    // IPFS client
    var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
    if (error != null)  {
      callback(error.message);
      return false;
    }

    // IPNS Analysis
    if (ipfsProtocol === ipnsKeyword || $tw.utils.getIpfsProtocol() === ipnsKeyword) {

      // Resolve current IPNS
      if (ipfsProtocol === ipnsKeyword) {
        if (this.isVerbose()) this.logger.info("Processing current IPNS...");
        var { error, ipnsName, ipnsKey, resolved: ipnsContent } = await this.ipfsWrapper.resolveIpns(ipfs, cid);
        if (error != null)  {
          // Log and continue
          this.logger.error(error.message);
          // Fallback
          if (ipnsName === null && ipnsKey === null && $tw.utils.getIpfsProtocol() === ipnsKeyword) {
            ipnsName = $tw.utils.getIpfsIpnsName();
            ipnsKey = $tw.utils.getIpfsIpnsKey();
            if (this.isVerbose()) this.logger.info("Processing default IPNS...");
            var { error, ipnsName, ipnsKey, resolved: ipnsContent } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
            if (error != null) {
              if (ipnsName !== null && ipnsKey !== null) {
                this.logger.alert(error.message);
              } else {
                // Unable to resolve default
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
        if (this.isVerbose()) this.logger.info("Processing default IPNS...");
        var { error, ipnsName, ipnsKey, resolved: ipnsContent } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
        if (error != null) {
          if (ipnsName !== null && ipnsKey !== null) {
            this.logger.error(error.message);
          } else {
            // Unable to resolve default
            callback(error.message);
            return false;
          }
        }
      }

      // Store to unpin previous if any
      if (
        $tw.utils.getIpfsUnpin()
        && ipnsContent !== null
        && this.toBeUnpinned.indexOf(ipnsContent) == -1
      ) {
        this.toBeUnpinned.push(ipnsContent);
        if (this.isVerbose()) this.logger.info(
          "Request to unpin: /"
          + ipfsKeyword
          + "/"
          + ipnsContent
        );
      }

    }

    // ENS Analysis
    if ($tw.utils.getIpfsProtocol() === ensKeyword) {

      // Getting default ens domain
      ensDomain = $tw.utils.getIpfsEnsDomain();
      // Check
      if (ensDomain == null) {
        callback("Undefined ENS domain...");
        return false;
      }

      // Retrieve a Web3 provider
      var { error, web3Provider, account } = await this.ensWrapper.getWeb3Provider();
      if (error != null)  {
        callback(error.message);
        return false;
      }

      // Fetch ENS domain content
      var { error, decoded: ensContent, protocol } = await this.ensWrapper.getContenthash(ensDomain, web3Provider, account);
      if (error != null)  {
        callback(error.message);
        return false;
      }

      // Store to unpin previous if any
      if (
        $tw.utils.getIpfsUnpin()
        && ensContent !== null
        && this.toBeUnpinned.indexOf(ensContent) == -1
      ) {
        this.toBeUnpinned.push(ensContent);
        if (this.isVerbose()) this.logger.info(
          "Request to unpin: /"
          + ipfsKeyword
          + "/"
          + ensContent
        );
      }

    }

    // Upload  current document
    if (this.isVerbose()) this.logger.info(
      "Uploading wiki: "
      + text.length
      + " bytes"
    );

    // Add
    var { error, added } = await this.ipfsWrapper.addToIpfs(ipfs, text);
    if (error != null)  {
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
      this.logger.alert(error.message);
    }

    // Publish to IPNS
    if (ipnsName !== null && (ipfsProtocol === ipnsKeyword || $tw.utils.getIpfsProtocol() === ipnsKeyword)) {
      if (this.isVerbose()) this.logger.info(
        "Publishing IPNS name: "
        + ipnsName
      );
      var { error } = await this.ipfsWrapper.publishToIpfs(ipfs, ipnsName, added);
      if (error != null)  {
        // Log and continue
        this.logger.alert("Unable to publish IPNS name...");
        // Remove from unpin
        if (ipfsProtocol === ipnsKeyword) {
          const index = this.toBeUnpinned.indexOf(ipnsContent);
          if (index !== -1) {
            this.toBeUnpinned.splice(index, 1);
            if (this.isVerbose()) this.logger.info(
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
      if (this.isVerbose()) this.logger.info(
        "Publishing ENS domain: "
        + ensDomain
      );
      var { error } = await this.ensWrapper.setContenthash(ensDomain, added, web3Provider, account);
      if (error != null)  {
        // Log and continue
        this.logger.alert(error.message);
        // Remove from unpin
        const index = this.toBeUnpinned.indexOf(ensContent);
        if (index !== -1) {
          this.toBeUnpinned.splice(index, 1);
          if (this.isVerbose()) this.logger.info(
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
          this.logger.alert(error.message);
        }
      }
      this.toBeUnpinned = [];
    }

    // Done
    callback(null);

    // Next
    if (nextWiki !== document.URL) {
      window.location.assign(nextWiki);
    }

  } catch (error) {
    callback(error.message);
    return false;
  }

  return true;

};

IpfsSaver.prototype.handleDeleteTiddler = function(tiddler) {
  // Process if _canonical_uri is set
  const uri = tiddler.getFieldString("_canonical_uri");
  if (uri == undefined || uri == null || uri.trim() === "") {
    return tiddler;
  }
  // Decode
  const { pathname } = this.ipfsLibrary.parseUrl(uri.trim());
  const { cid } = this.ipfsLibrary.decodeCid(pathname);
  // Store old cid as it needs to be unpined when the wiki is saved if applicable
  if ($tw.utils.getIpfsUnpin()
    && cid !== null
    && this.toBeUnpinned.indexOf(cid) == -1
  ) {
    this.toBeUnpinned.push(cid);
    if (this.isVerbose()) this.logger.info(
      "Request to unpin: /"
      + ipfsKeyword
      + "/"
      + cid
    );
  }
  return tiddler;
}

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handleSaveTiddler = async function(tiddler) {

  var updatedTiddler = null;

  // Check
  if (tiddler == undefined || tiddler == null) {
    updatedTiddler = new $tw.Tiddler(tiddler);
    $tw.wiki.addTiddler(updatedTiddler);
    return updatedTiddler;
  }

  const type = tiddler.getFieldString("type");
  // Check
  if (type == undefined || type == null) {
    updatedTiddler = new $tw.Tiddler(tiddler);
    $tw.wiki.addTiddler(updatedTiddler);
    return updatedTiddler;
  }

  const info = $tw.config.contentTypeInfo[type];
  // Check
  if (info == undefined || info == null)  {
    updatedTiddler = new $tw.Tiddler(tiddler);
    $tw.wiki.addTiddler(updatedTiddler);
    return updatedTiddler;
  }

  // Check
  if (info.encoding !== "base64" && type !== "image/svg+xml" && type !== "text/vnd.tiddlywiki")  {
    updatedTiddler = new $tw.Tiddler(tiddler);
    $tw.wiki.addTiddler(updatedTiddler);
    return updatedTiddler;
  }

  // Retrieve tiddler _canonical_uri if any
  var canonical_uri = tiddler.getFieldString("_canonical_uri");
  if (canonical_uri !== undefined && canonical_uri !== null && canonical_uri.trim() !== "") {
    canonical_uri = canonical_uri.trim();
  } else {
    canonical_uri = null;
  }

  // Retrieve tiddler _ipfs_uri if any
  var ipfs_uri = tiddler.getFieldString("_ipfs_uri");
  if (ipfs_uri !== undefined && ipfs_uri !== null && ipfs_uri.trim() !== "") {
    ipfs_uri = ipfs_uri.trim();
  } else {
    ipfs_uri = null;
  }

  // Retrieve old tiddler _ipfs_uri and _canonical_uri if any
  var old_canonical_uri = null;
  var old_ipfs_uri = null;
  const oldTiddler = $tw.wiki.getTiddler(tiddler.fields.title);
  if (oldTiddler !== undefined && oldTiddler !== null) {
    // Retrieve oldTiddler _canonical_uri if any
    old_canonical_uri = oldTiddler.getFieldString("_canonical_uri");
    if (old_canonical_uri !== undefined && old_canonical_uri !== null && old_canonical_uri.trim() !== "") {
      old_canonical_uri = old_canonical_uri.trim();
    } else {
      old_canonical_uri = null;
    }
    // Retrieve oldTiddler _ipfs_uri if any
    old_ipfs_uri = oldTiddler.getFieldString("_ipfs_uri");
    if (old_ipfs_uri !== undefined && old_ipfs_uri !== null && old_ipfs_uri.trim() !== "") {
      old_ipfs_uri = old_ipfs_uri.trim();
    } else {
      old_ipfs_uri = null;
    }
  }

  // Nothing to do
  if (canonical_uri == old_canonical_uri && ipfs_uri == old_ipfs_uri) {
    updatedTiddler = new $tw.Tiddler(tiddler);
    $tw.wiki.addTiddler(updatedTiddler);
    return updatedTiddler;
  }

  var addTags = [];
  var removeTags = [];

  var content = tiddler.getFieldString("text");

  // Attachment
  if (info.encoding === "base64" || type === "image/svg+xml") {

    // Process canonical_uri if any update
    if (canonical_uri !== old_canonical_uri) {

      // _canonical_uri attribute has been removed, embed
      if (canonical_uri == null) {

        // Load
        try {
          content = await $tw.utils.httpGetToUint8Array(old_canonical_uri);
        } catch (error) {
          this.logger.alert(error.message);
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
            this.logger.alert(error.message);
            return oldTiddler;
          }
        } else {
          if (info.encoding === "base64") {
            content = $tw.utils.Uint8ArrayToBase64(content);
          } else {
            content = $tw.utils.Utf8ArrayToStr(content);
          }
        }

        if (this.isVerbose()) this.logger.info(
          "Embedding attachment: "
          + content.length
          + " bytes"
        );

        // Update Tiddler
        updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          addTags: ["$:/isAttachment", "$:/isEmbedded"],
          removeTags: ["$:/isEncrypted", "$:/isImported", "$:/isIpfs"]
        });

      // _canonical_uri attribute has been updated
      } else {

        // Unable to decide whether or not the content is encrypted
        var { pathname } = this.ipfsLibrary.parseUrl(canonical_uri);
        var { cid } = this.ipfsLibrary.decodeCid(pathname);
        // IPFS resource
        if (cid !== null) {
          addTags = ["$:/isAttachment", "$:/isIpfs"];
          removeTags = ["$:/isEmbedded", "$:/isImported", "$:/isEncrypted"];
        } else {
          addTags = ["$:/isAttachment"];
          removeTags = ["$:/isEmbedded", "$:/isImported", "$:/isEncrypted", "$:/isIpfs"];
        }

        // Update Tiddler
        updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          addTags: addTags,
          removeTags: removeTags
        });

        if (cid !== null) {
          const index = this.toBeUnpinned.indexOf(cid);
          if (index !== -1) {
            this.toBeUnpinned.splice(index, 1);
            if (this.isVerbose()) this.logger.info(
              "Discard request to unpin: /"
              + ipfsKeyword
              + "/"
              + cid
            );
          }
        }

        this.logger.alert(
          "Embedded remote attachment..."
          + "<br/>Unable to decide if the imported attachment is encrypted or not..."
          + "<br/>Consider the <<tag-pill '$:/isEncrypted'>> tag..."
        );

      }

      // Process previous canonical_uri if any
      if (old_canonical_uri !== null) {
        const { pathname: oldPathname } = this.ipfsLibrary.parseUrl(old_canonical_uri);
        const { cid: oldCid } = this.ipfsLibrary.decodeCid(oldPathname);
        if ($tw.utils.getIpfsUnpin()
          && oldCid !== null
          && this.toBeUnpinned.indexOf(oldCid) == -1
        ) {
          this.toBeUnpinned.push(oldCid);
          if (this.isVerbose()) this.logger.info(
            "Request to unpin: /"
            + ipfsKeyword
            + "/"
            + oldCid
          );
        }
      }

    }

  // Tiddler
  } else {

    // Process if any update
    if (canonical_uri !== old_canonical_uri) {

      // _canonical_uri attribute has been removed
      if (canonical_uri == null) {

        if (this.isVerbose()) this.logger.info("Embedding Tiddler...");

        // Update Tiddler
        updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          removeTags: ["$:/isAttachment", "$:/isEmbedded", "$:/isEncrypted", "$:/isImported", "$:/isIpfs"]
        });

      // _canonical_uri attribute has been updated
      } else {

        var { pathname } = this.ipfsLibrary.parseUrl(canonical_uri);
        var { cid } = this.ipfsLibrary.decodeCid(pathname);
        // IPFS resource
        if (cid !== null) {
          addTags = ["$:/isImported", "$:/isIpfs"];
          removeTags = ["$:/isAttachment", "$:/isEmbedded", "$:/isExported"];
        } else {
          addTags = ["$:/isImported"];
          removeTags = ["$:/isAttachment", "$:/isEmbedded", "$:/isExported", "$:/isIpfs"];
        }

        if (this.isVerbose()) this.logger.info(
          "Embedding Tiddler..."
          + content.length
          + " bytes"
        );

        // Update Tiddler
        updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          addTags: addTags,
          removeTags: removeTags,
          fields: [
            { key: "text", value: "" }
          ]
        });

        this.logger.alert(
          "Embedded remote Tiddler..."
          + "<br/>Unable to decide if the imported Tiddler is encrypted or not..."
          + "<br/>Consider the <<tag-pill '$:/isEncrypted'>> tag..."
        );

      }

    }

    // Process if any update
    if (ipfs_uri !== old_ipfs_uri) {

      updatedTiddler = updatedTiddler !== null ? updatedTiddler : tiddler;

      // Retrieve tiddler _canonical_uri if any
      canonical_uri = updatedTiddler.getFieldString("_canonical_uri");
      if (canonical_uri !== undefined && canonical_uri !== null && canonical_uri.trim() !== "") {
        canonical_uri = canonical_uri.trim();
      } else {
        canonical_uri = null;
      }

      // _ipfs_uri attribute has been removed
      if (ipfs_uri == null) {

        if (canonical_uri == null) {
          removeTags = ["$:/isExported", "$:/isIpfs"];
        } else {
          removeTags = ["$:/isExported"];
        }

        // Update Tiddler
        updatedTiddler = $tw.utils.updateTiddler({
          tiddler: updatedTiddler,
          removeTags: removeTags
        });

      // _ipfs_uri attribute has been updated
      } else {

        // New _ipfs_uri
        var { pathname } = this.ipfsLibrary.parseUrl(ipfs_uri);
        var { cid } = this.ipfsLibrary.decodeCid(pathname);
        // IPFS resource
        if (cid !== null) {
          addTags = ["$:/isExported", "$:/isIpfs"];
        } else {
          addTags = ["$:/isExported"];
        }

        // Update Tiddler
        updatedTiddler = $tw.utils.updateTiddler({
          tiddler: updatedTiddler,
          addTags: addTags
        });

        if (cid !== null) {
          const index = this.toBeUnpinned.indexOf(cid);
          if (index !== -1) {
            this.toBeUnpinned.splice(index, 1);
            if (this.isVerbose()) this.logger.info(
              "Discard request to unpin: /"
              + ipfsKeyword
              + "/"
              + cid
            );
          }
        }

      }

      // Process previous ipfs_uri if any
      if (old_ipfs_uri !== null) {
        const { pathname: oldPathname } = this.ipfsLibrary.parseUrl(old_ipfs_uri);
        const { cid: oldCid } = this.ipfsLibrary.decodeCid(oldPathname);
        if ($tw.utils.getIpfsUnpin()
          && oldCid !== null
          && this.toBeUnpinned.indexOf(oldCid) == -1
        ) {
          this.toBeUnpinned.push(oldCid);
          if (this.isVerbose()) this.logger.info(
            "Request to unpin: /"
            + ipfsKeyword
            + "/"
            + oldCid
          );
        }
      }

    }

  }

  // Check
  if (updatedTiddler == null) {
    updatedTiddler = new $tw.Tiddler(tiddler);
  }
  // Update
  $tw.wiki.addTiddler(updatedTiddler);
  return updatedTiddler;

}

IpfsSaver.prototype.handleExportToIpfs = async function(event) {

  const title = event.tiddlerTitle;

  // Load tiddler
  const tiddler = $tw.wiki.getTiddler(title);
  if (tiddler == undefined || tiddler == null) {
    this.logger.alert("Unknown Tiddler...");
    return false;
  }

  // Check
  const gatewayUrl = $tw.utils.getIpfsGatewayUrl();
  if (gatewayUrl == null) {
    this.logger.alert("Undefined IPFS Gateway URL...");
    return false;
  }

  const type = tiddler.getFieldString("type");
  // Check
  if (type == undefined || type == null) {
    this.logger.alert("Unknown Tiddler field 'type'...");
    return false;
  }

  const info = $tw.config.contentTypeInfo[type];
  // Check
  if (info == undefined || info == null)  {
    this.logger.alert("Unknown Tiddler Content Type: " + type);
    return false;
  }

  // Check
  if (info.encoding !== "base64" && type !== "image/svg+xml" && type !== "text/vnd.tiddlywiki")  {
    this.logger.alert("Unsupported Tiddler Content Type...\nLook at the documentation...");
    return false;
  }

  // Do not process if _canonical_uri is set
  const canonical_uri = tiddler.getFieldString("_canonical_uri");
  if (canonical_uri !== undefined && canonical_uri !== null && canonical_uri.trim() !== "") {
    this.logger.alert("Nothing to export...\n'_canonical_uri' is already set...");
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
    this.logger.alert(error.message);
    return false;
  }

  // Attachment
  if (info.encoding === "base64" || type === "image/svg+xml") {
    if (this.isVerbose()) this.logger.info(
      "Uploading attachment: "
      + content.length
      + " bytes"
    );
  // Tiddler
  } else {
    if (this.isVerbose()) this.logger.info(
      "Uploading Tiddler: "
      + content.length
      + " bytes"
    );
  }

  // Add
  var { error, added } = await this.ipfsWrapper.addToIpfs(ipfs, content);
  if (error != null)  {
    this.logger.alert(error.message);
    return false;
  }

  // Pin, if failure log and continue
  var { error } = await this.ipfsWrapper.pinToIpfs(ipfs, added);
  if (error != null)  {
    this.logger.alert(error.message);
  }

  // Store to unpin previous if any
  if (type === "text/vnd.tiddlywiki") {
    const unpin = tiddler.getFieldString("_ipfs_uri");
    if (unpin !== undefined && unpin !== null && unpin.trim() !== "") {
      // Decode
      const { pathname } = this.ipfsLibrary.parseUrl(unpin.trim());
      const { cid } = this.ipfsLibrary.decodeCid(pathname);
      if ($tw.utils.getIpfsUnpin()
        && cid !== null
        && this.toBeUnpinned.indexOf(cid) == -1
      ) {
        this.toBeUnpinned.push(cid);
        if (this.isVerbose()) this.logger.info(
          "Request to unpin: /"
          + ipfsKeyword
          + "/"
          + cid
        );
      }
    }
  }

  // Build uri
  const { protocol: gatewayProtocol, host: gatewayHost } = this.ipfsLibrary.parseUrl(gatewayUrl);
  const uri = gatewayProtocol
  + "//"
  + gatewayHost
  + "/"
  + ipfsKeyword
  + "/"
  + added;

  return this.ipfsWrapper.updateIpfsTiddler(tiddler, uri);

}

IpfsSaver.prototype.handleIpfsPin = async function(event) {

  var protocol = null;
  var pathname = null;
  var cid = null;

  if (event.param !== undefined && event.param !== null) {
    const title = event.tiddlerTitle;
    // current tiddler
    const tiddler = $tw.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      this.logger.alert("Unknown tiddler: " + title);
      return false;
    }
    // Process if _canonical_uri is set
    const uri = tiddler.getFieldString("_canonical_uri");
    if (uri == undefined || uri == null || uri.trim() === "") {
      this.logger.alert("This Tiddler is not an external resource...");
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
    this.logger.alert("Unknown protocol...");
    return false;
  }
  if (protocol === fileProtocol) {
    this.logger.alert("Undefined IPFS wiki...");
    return false;
  }
  if (pathname == undefined || pathname == null) {
    this.logger.alert("Unknown pathname...");
    return false;
  }

  // Extract and check URL IPFS protocol and cid
  var { protocol, cid } = this.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    this.logger.alert("Unknown IPFS protocol...");
    return false;
  }
  if (cid == null) {
    this.logger.alert("Unknown IPFS identifier...");
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    this.logger.alert(error.message);
    return false;
  }

  // Resolve ipns key if applicable
  if (protocol === ipnsKeyword) {
    var { error, resolved: cid } = await this.ipfsWrapper.resolveIpns(ipfs, cid);
    if (error != null) {
      this.logger.alert(error.message);
      return false;
    }
  }

  if (this.isVerbose()) this.logger.info(
    "Pinning: /"
    + ipfsKeyword
    + "/"
    + cid
  );

  var { error } = await this.ipfsWrapper.pinToIpfs(ipfs, cid);
  if (error != null) {
    this.logger.alert(error.message);
    return false;
  }

  const index = this.toBeUnpinned.indexOf(cid);
  if ($tw.utils.getIpfsUnpin() && index !== -1) {
    this.toBeUnpinned.splice(index, 1);
  }

  return false;

}

IpfsSaver.prototype.handleIpfsUnpin = async function(event) {

  var protocol = null;
  var pathname = null;
  var cid = null;

  if (event.param !== undefined && event.param !== null) {
    const title = event.tiddlerTitle;
    // current tiddler
    const tiddler = $tw.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      this.logger.alert("Unknown tiddler: " + title);
      return false;
    }
    // Process if _canonical_uri is set
    const uri = tiddler.getFieldString("_canonical_uri");
    if (uri == undefined || uri == null || uri.trim() === "") {
      this.logger.alert("This Tiddler is not an external resource...");
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
    this.logger.alert("Unknown protocol...");
    return false;
  }
  if (protocol === fileProtocol) {
    this.logger.alert("Undefined IPFS wiki...");
    return false;
  }
  if (pathname == undefined || pathname == null) {
    this.logger.alert("Unknown pathname...");
    return false;
  }

  // Extract and check URL IPFS protocol and cid
  var { protocol, cid } = this.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    this.logger.alert("Unknown IPFS protocol...");
    return false;
  }
  if (cid == null) {
    this.logger.alert("Unknown IPFS identifier...");
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    this.logger.alert(error.message);
    return false;
  }

  // Resolve IPNS key if applicable
  if (protocol === ipnsKeyword) {
    var { error, resolved: cid } = await this.ipfsWrapper.resolveIpns(ipfs, cid);
    if (error != null) {
      this.logger.alert(error.message);
      return false;
    }
  }

  if (this.isVerbose()) this.logger.info(
    "Unpinning: /"
    + ipfsKeyword
    + "/"
    + cid
  );
  var { error } = await this.ipfsWrapper.unpinFromIpfs(ipfs, cid);
  if (error != null) {
    this.logger.alert(error.message);
    return false;
  }

  const index = this.toBeUnpinned.indexOf(cid);
  if ($tw.utils.getIpfsUnpin() && this.toBeUnpinned.indexOf(cid) !== -1) {
    this.toBeUnpinned.splice(index, 1);
  }

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
