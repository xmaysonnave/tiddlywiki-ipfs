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

const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

const name = "ipfs-tiddler";

var IpfsTiddler = function() {
  this.once = false;
  this.ipfsWrapper = new IpfsWrapper();
};

IpfsTiddler.prototype.getLogger = function() {
  return window.log.getLogger(name);
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
  $tw.hooks.addHook("th-deleting-tiddler", async function(tiddler) {
    return await self.handleDeleteTiddler(tiddler);
  });
  $tw.hooks.addHook("th-importing-tiddler", function(tiddler) {
    return self.handleFileImport(tiddler);
  });
  $tw.hooks.addHook("th-saving-tiddler", async function(tiddler) {
    return await self.handleSaveTiddler(tiddler);
  });
  // Widget
  $tw.rootWidget.addEventListener("tm-refresh-tiddler", function(event) {
    return self.handleRefreshTiddler(event);
  });
  // Init once
  this.once = true;
}

IpfsTiddler.prototype.handleChangeEvent = function(changes) {
  // Gateway preference
  const gateway = changes["$:/ipfs/saver/gateway"];
  if (gateway !== undefined && gateway.modified) {
    const base = $tw.ipfs.getIpfsBaseUrl();
    if ($tw.utils.getIpfsUrlPolicy() === "gateway") {
      this.getLogger().info(
        "Gateway Relative URL:"
        + "\n "
        + base.toString()
      );
    }
  }
  // IPNS name preference
  const name = changes["$:/ipfs/saver/ipns/name"];
  if (name !== undefined && name.modified) {
    const tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
    if (tiddler !== undefined) {
      if ($tw.utils.getIpfsIpnsKey() !== null) {
        const updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          fields: [
            { key: "text", value: "" }
          ]
        });
        if (updatedTiddler !== null) {
          $tw.wiki.addTiddler(updatedTiddler);
        }
      }
    }
  }
  // Policy preference
  const policy = changes["$:/ipfs/saver/policy"];
  if (policy !== undefined && policy.modified) {
    const base = $tw.ipfs.getIpfsBaseUrl();
    if ($tw.utils.getIpfsUrlPolicy() === "host") {
      this.getLogger().info(
        "Host Relative URL:"
        + "\n "
        + base.toString()
      );
    } else {
      this.getLogger().info(
        "Gateway Relative URL:"
        + "\n "
        + base.toString()
      );
    }
  }
  // Unpin preference
  const unpin = changes["$:/ipfs/saver/unpin"];
  if (unpin !== undefined && unpin.modified) {
    if ($tw.utils.getIpfsUnpin()) {
      this.getLogger().info("Unpin previous IPFS content...");
    } else {
      this.getLogger().info("Do not unpin previous IPFS content...");
    }
  }
  // Verbose preference
  const verbose = changes["$:/ipfs/saver/verbose"];
  if (verbose !== undefined && verbose.modified) {
    if ($tw.utils.getIpfsVerbose()) {
      this.updateLoggers("info");
    } else {
      this.updateLoggers("warn");
    }
  }
}

IpfsTiddler.prototype.updateLoggers = function(level) {
  window.log.setLevel(level, false);
  const loggers = window.log.getLoggers();
  for (var property in loggers) {
    if (Object.prototype.hasOwnProperty.call(loggers, property)) {
      const logger = window.log.getLogger(property);
      logger.setLevel(level, false);
    }
  }
}

IpfsTiddler.prototype.handleDeleteTiddler = async function(tiddler) {
  // Process if _canonical_uri is set
  const uri = tiddler.getFieldString("_canonical_uri");
  if (uri == undefined || uri == null || uri.trim() === "") {
    return tiddler;
  }
  try {
    // Decode
    const parsed = await $tw.ipfs.normalizeIpfsUrl(uri);
    if (parsed.pathname === "/") {
      return tiddler;
    }
    const { cid } = this.ipfsWrapper.decodeCid(parsed.pathname);
    // Request to unpin
    if ($tw.utils.getIpfsUnpin() && cid !== null) {
      $tw.ipfs.requestToUnpin(cid);
    }
  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
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
  if (title == undefined || title == null || title.trim() === "") {
    return false;
  }
  // current tiddler
  const tiddler = $tw.wiki.getTiddler(title);
  if (tiddler == undefined || tiddler == null) {
    $tw.utils.alert(name, "Unknown tiddler: " + title);
    return false;
  }
  // Empty the 'text' field from _canonical_uri Tiddler holder
  const canonical_uri = tiddler.getFieldString("_canonical_uri");
  if (canonical_uri !== undefined && canonical_uri !== null && canonical_uri.trim() !== "") {
    const updatedTiddler = $tw.utils.updateTiddler({
      tiddler: tiddler,
      fields: [
        { key: "text", value: "" }
      ]
    });
    $tw.wiki.addTiddler(updatedTiddler);
  }
  // Empty cache
  $tw.wiki.clearCache(title);
  // Refresh
  const changedTiddler = $tw.utils.getChangedTiddler(title);
  $tw.rootWidget.refresh(changedTiddler);
  return true;
}

IpfsTiddler.prototype.handleSaveTiddler = async function(tiddler) {

  var updatedTiddler = null;

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

  // Retrieve tiddler _backup_uri if any
  var backup_uri = tiddler.getFieldString("_backup_uri");
  if (backup_uri !== undefined && backup_uri !== null && backup_uri.trim() !== "") {
    backup_uri = backup_uri.trim();
  } else {
    backup_uri = null;
  }

  // Retrieve old tiddler _backup_uri and _canonical_uri if any
  var old_canonical_uri = null;
  var old_backup_uri = null;
  const oldTiddler = $tw.wiki.getTiddler(tiddler.fields.title);
  if (oldTiddler !== undefined && oldTiddler !== null) {
    // Retrieve oldTiddler _canonical_uri if any
    old_canonical_uri = oldTiddler.getFieldString("_canonical_uri");
    if (old_canonical_uri !== undefined && old_canonical_uri !== null && old_canonical_uri.trim() !== "") {
      old_canonical_uri = old_canonical_uri.trim();
    } else {
      old_canonical_uri = null;
    }
    // Retrieve oldTiddler _backup_uri if any
    old_backup_uri = oldTiddler.getFieldString("_backup_uri");
    if (old_backup_uri !== undefined && old_backup_uri !== null && old_backup_uri.trim() !== "") {
      old_backup_uri = old_backup_uri.trim();
    } else {
      old_backup_uri = null;
    }
  }

  // Nothing to do
  if (canonical_uri == old_canonical_uri && backup_uri == old_backup_uri) {
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
          const parsed = await $tw.ipfs.normalizeIpfsUrl(old_canonical_uri);
          if (info.encoding === "base64") {
            content = await $tw.utils.loadToBase64(parsed);
          } else {
            content = await $tw.utils.loadToUtf8(parsed);
          }
          // Update Tiddler
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: tiddler,
            addTags: ["$:/isAttachment", "$:/isEmbedded"],
            removeTags: ["$:/isImported", "$:/isIpfs"],
            fields: [
              { key: "text", value: content.data }
            ]
          });
          this.getLogger().info(
            "Embeded remote attachment: "
            + content.data.length
            + " bytes"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      // _canonical_uri attribute has been updated
      } else {

        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(canonical_uri);
          // Decode CID
          var { cid } = this.ipfsWrapper.decodeCid(parsed.pathname);
          // IPFS resource
          if (cid !== null) {
            addTags = ["$:/isAttachment", "$:/isIpfs"];
            removeTags = ["$:/isEmbedded", "$:/isImported"];
          } else {
            addTags = ["$:/isAttachment"];
            removeTags = ["$:/isEmbedded", "$:/isImported", "$:/isIpfs"];
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
          // Discard unpin request
          if ($tw.utils.getIpfsUnpin() && cid !== null) {
            $tw.ipfs.discardRequestToUnpin(cid);
          }
          this.getLogger().info(
            "Updated remote attachment:"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      }

      // Process previous canonical_uri if any
      if (old_canonical_uri !== null) {
        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(old_canonical_uri);
          const { cid: oldCid } = this.ipfsWrapper.decodeCid(parsed.pathname);
          if ($tw.utils.getIpfsUnpin() && oldCid !== null) {
            $tw.ipfs.requestToUnpin(oldCid);
          }
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }
      }

    }

  // Tiddler
  } else {

    // Process if any update
    if (canonical_uri !== old_canonical_uri) {

      // _canonical_uri attribute has been removed
      if (canonical_uri == null) {

        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(old_canonical_uri);
          // Update Tiddler
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: tiddler,
            removeTags: ["$:/isAttachment", "$:/isEmbedded", "$:/isImported", "$:/isIpfs"]
          });
          this.getLogger().info(
            "Embeded remote Tiddler:"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      // _canonical_uri attribute has been updated
      } else {

        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(canonical_uri);
          var { cid } = this.ipfsWrapper.decodeCid(parsed.pathname);
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
          this.getLogger().info(
            "Updated remote Tiddler:"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      }

    }

    // Process if any update
    if (backup_uri !== old_backup_uri) {

      updatedTiddler = updatedTiddler !== null ? updatedTiddler : tiddler;

      // _backup_uri attribute has been removed
      if (backup_uri == null) {

        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(old_backup_uri);
          var { cid } = this.ipfsWrapper.decodeCid(parsed.pathname);
          if (cid !== null) {
            removeTags = ["$:/isExported", "$:/isIpfs"];
          } else {
            removeTags = ["$:/isExported"];
          }
          // Update Tiddler
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: updatedTiddler,
            removeTags: removeTags
          });
          this.getLogger().info(
            "Removed exported Tiddler:"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      // _backup_uri attribute has been updated
      } else {

        try {
          // New _backup_uri
          const parsed = await $tw.ipfs.normalizeIpfsUrl(backup_uri);
          var { cid } = this.ipfsWrapper.decodeCid(parsed.pathname);
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
          // Discard unpin request
          if ($tw.utils.getIpfsUnpin() && cid !== null) {
            $tw.ipfs.discardRequestToUnpin(cid);
          }
          this.getLogger().info(
            "Updated exported Tiddler:"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      }

      // Process previous backup_uri if any
      if (old_backup_uri !== null) {
        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(old_backup_uri);
          const { cid: oldCid } = this.ipfsWrapper.decodeCid(parsed.pathname);
          if ($tw.utils.getIpfsUnpin() && oldCid !== null) {
            $tw.ipfs.requestToUnpin(oldCid);
          }
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
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
