/*\
title: $:/plugins/ipfs/ipfs-tiddler.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsTiddler

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsModule = require("$:/plugins/ipfs/ipfs-module.js").IpfsModule;
const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;

const ipfsKeyword = "ipfs";

const name = "ipfs-tiddler";

var IpfsTiddler = function() {
  this.once = false;
  this.ipfsLibrary = new IpfsLibrary();
  this.ipfsModule = new IpfsModule();
  this.ipfsWrapper = new IpfsWrapper();
  this.ipnsName = $tw.utils.getIpfsIpnsName();
  this.ipnsKey = $tw.utils.getIpfsIpnsKey();
};

IpfsTiddler.prototype.getLogger = function() {
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

IpfsTiddler.prototype.isVerbose = function() {
  try {
    return $tw.utils.getIpfsVerbose();
  } catch (error) {
    return false;
  }
}

IpfsTiddler.prototype.init = function() {
  // Init once
  if (this.once) {
    return;
  }
  const self = this;
  // Wiki
  $tw.wiki.addEventListener("change", function(changes) {
    return self.handleChangeEvent(changes);
  });
  // Hook
  $tw.hooks.addHook("th-deleting-tiddler", function(tiddler) {
    return self.handleDeleteTiddler(tiddler);
  });
  $tw.hooks.addHook("th-importing-tiddler", function(tiddler) {
    return self.handleFileImport(tiddler);
  });
  $tw.hooks.addHook("th-saving-tiddler", function(tiddler) {
    return self.handleSaveTiddler(tiddler);
  });
  // Widget
  $tw.rootWidget.addEventListener("tm-refresh-tiddler", function(event) {
    return self.handleRefreshTiddler(event);
  });
  // Init once
  this.once = true;
}

IpfsTiddler.prototype.handleChangeEvent = function(changes) {
  // process priority
  const priority = changes["$:/ipfs/saver/priority/default"];
  if (priority !== undefined && priority.modified) {
    // Update IPFS saver
    $tw.saverHandler.updateSaver("ipfs", $tw.utils.getIpfsPriority());
    this.getLogger().info(
      "Updated IPFS Saver priority: "
      + $tw.utils.getIpfsPriority()
    );
  }
  // process verbose
  const verbose = changes["$:/ipfs/saver/verbose"];
  if (verbose !== undefined && verbose.modified) {
    if (window !== undefined && window.log !== undefined) {
      if (this.isVerbose()) {
        this.updateLoggers("trace");
        this.getLogger().info("IPFS with TiddlyWiki is verbose...");
      } else {
        const logger = this.getLogger();
        logger.setLevel("info", false);
        logger.info("IPFS with TiddlyWiki is not verbose...");
        this.updateLoggers("warn");
      }
    }
  }
  // process unpin
  const unpin = changes["$:/ipfs/saver/unpin"];
  if (unpin !== undefined && unpin.modified) {
    if ($tw.utils.getIpfsUnpin()) {
      this.getLogger().info("IPFS with TiddlyWiki will unpin previous content...");
    } else {
      this.getLogger().info("IPFS with TiddlyWiki will not unpin previous content...");
    }
  }
  // process IPNS name
  const name = changes["$:/ipfs/saver/ipns/name"];
  if (name !== undefined && name.modified) {
    const tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
    if (tiddler !== undefined) {
      if ($tw.utils.getIpfsIpnsName() !== this.ipnsName) {
        if ($tw.utils.getIpfsIpnsKey() !== null) {
          $tw.utils.updateTiddler({
            tiddler: tiddler,
            fields: [
              { key: "text", value: "" }
            ]
          });
        }
      } else if ($tw.utils.getIpfsIpnsName() !== null) {
        if (this.ipnsKey !== null) {
          $tw.utils.updateTiddler({
            tiddler: tiddler,
            fields: [
              { key: "text", value: this.ipnsKey }
            ]
          });
        }
      }
    }
  }
}

IpfsTiddler.prototype.updateLoggers = function(level) {
  if (window !== undefined && window.log !== undefined) {
    window.log.setLevel(level, false);
    const loggers = window.log.getLoggers();
    for (var property in loggers) {
      if (Object.prototype.hasOwnProperty.call(loggers, property)) {
        const logger = window.log.getLogger(property);
        logger.setLevel(level, false);
      }
    }
  }
}

IpfsTiddler.prototype.handleDeleteTiddler = function(tiddler) {
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
    && window.unpin.indexOf(cid) == -1
  ) {
    window.unpin.push(cid);
    this.getLogger().info(
      "Request to unpin: /"
      + ipfsKeyword
      + "/"
      + cid
    );
  }
  return tiddler;
}

IpfsTiddler.prototype.handleFileImport = function(tiddler) {
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

IpfsTiddler.prototype.handleRefreshTiddler = function(event) {
  const title = event.tiddlerTitle;
  if (title !== undefined && title !== null) {
    // current tiddler
    const tiddler = $tw.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      $tw.utils.alert(name, "Unknown tiddler: " + title);
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
      return false;
    }
    if (info.encoding === "base64" || type === "image/svg+xml") {
      $tw.wiki.clearCache(title);
      const changedTiddlers = $tw.utils.getChangedTiddlers(tiddler);
      $tw.rootWidget.refresh(changedTiddlers);
    } else {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [
          { key: "text", value: "" }
        ]
      });
      // Check
      if (updatedTiddler !== null) {
        $tw.wiki.addTiddler(updatedTiddler);
      }
    }
  }
  return true;
}

IpfsTiddler.prototype.handleSaveTiddler = async function(tiddler) {

  var updatedTiddler = null;

  // Check
  if (tiddler == undefined || tiddler == null) {
    updatedTiddler = new $tw.Tiddler(tiddler);
    $tw.wiki.addTiddler(updatedTiddler);
    return updatedTiddler;
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
  var old_encrypted_tag = false;
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
    // Retrieve old_encrypted_tag
    old_encrypted_tag = oldTiddler.hasTag("$:/isEncrypted");
  }

  // Nothing to do
  if (canonical_uri == old_canonical_uri && ipfs_uri == old_ipfs_uri) {
    updatedTiddler = new $tw.Tiddler(tiddler);
    // Force Refresh
    if (canonical_uri !== null) {
      if (
        (tiddler.hasTag("$:/isEncrypted") && old_encrypted_tag == false)
        || (tiddler.hasTag("$:/isEncrypted") == false && old_encrypted_tag)
      )
      updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [
          { key: "text", value: "" }
        ]
      });
    }
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
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
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
            this.getLogger().error(error);
            $tw.utils.alert(name, error.message);
            return oldTiddler;
          }
        } else {
          if (info.encoding === "base64") {
            content = $tw.utils.Uint8ArrayToBase64(content);
          } else {
            content = $tw.utils.Utf8ArrayToStr(content);
          }
        }

        this.getLogger().info(
          "Embedding attachment: "
          + content.length
          + " bytes"
        );

        // Update Tiddler
        updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          addTags: ["$:/isAttachment", "$:/isEmbedded"],
          removeTags: ["$:/isEncrypted", "$:/isImported", "$:/isIpfs"],
          fields: [
            { key: "text", value: content }
          ]
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
          removeTags: removeTags,
          fields: [
            { key: "text", value: "" }
          ]
        });

        if (cid !== null) {
          const index = window.unpin.indexOf(cid);
          if (index !== -1) {
            window.unpin.splice(index, 1);
            this.getLogger().info(
              "Discard request to unpin: /"
              + ipfsKeyword
              + "/"
              + cid
            );
          }
        }

        $tw.utils.alert(name,
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
          && window.unpin.indexOf(oldCid) == -1
        ) {
          window.unpin.push(oldCid);
          this.getLogger().info(
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

        this.getLogger().info("Embedding Tiddler...");

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

        // Update Tiddler
        updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          addTags: addTags,
          removeTags: removeTags,
          fields: [
            { key: "text", value: "" }
          ]
        });

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
          const index = window.unpin.indexOf(cid);
          if (index !== -1) {
            window.unpin.splice(index, 1);
            this.getLogger().info(
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
          && window.unpin.indexOf(oldCid) == -1
        ) {
          window.unpin.push(oldCid);
          this.getLogger().info(
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

exports.IpfsTiddler = IpfsTiddler;

})();
