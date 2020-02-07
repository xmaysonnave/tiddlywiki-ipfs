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
    if ($tw.utils.getIpfsVerbose()) {
      this.updateLoggers("info");
    } else {
      this.updateLoggers("warn");
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

IpfsTiddler.prototype.handleDeleteTiddler = function(tiddler) {
  // Process if _canonical_uri is set
  const uri = tiddler.getFieldString("_canonical_uri");
  if (uri == undefined || uri == null || uri.trim() === "") {
    return tiddler;
  }
  try {
    // Decode
    const parsed = $tw.ipfs.normalizeUrl(uri);
    if (parsed.pathname === "/") {
      return tiddler;
    }
    const { cid } = this.ipfsWrapper.decodeCid(parsed.pathname);
    // Store old cid as it needs to be unpined when the wiki is saved if applicable
    if ($tw.utils.getIpfsUnpin()
      && cid !== null
      && window.unpin.indexOf(cid) == -1
    ) {
      window.unpin.push(cid);
      this.getLogger().info(
        "Request to unpin:"
        + "\n "
        + parsed.pathname
      );
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
  if (title !== undefined && title !== null) {
    // current tiddler
    const tiddler = $tw.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      $tw.utils.alert(name, "Unknown tiddler: " + title);
      return false;
    }
    // _canonical_uri
    var uri = tiddler.getFieldString("_canonical_uri");
    // Default
    if (uri == undefined || uri == null || uri.trim() === "") {
      return false;
    }
    // Refresh
    $tw.wiki.clearCache(title);
    const changedTiddlers = $tw.utils.getChangedTiddlers(tiddler);
    $tw.rootWidget.refresh(changedTiddlers);
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

  // Retrieve tiddler _tid_uri if any
  var tid_uri = tiddler.getFieldString("_tid_uri");
  if (tid_uri !== undefined && tid_uri !== null && tid_uri.trim() !== "") {
    tid_uri = tid_uri.trim();
  } else {
    tid_uri = null;
  }

  // Retrieve old tiddler _tid_uri and _canonical_uri if any
  var old_canonical_uri = null;
  var old_tid_uri = null;
  const oldTiddler = $tw.wiki.getTiddler(tiddler.fields.title);
  if (oldTiddler !== undefined && oldTiddler !== null) {
    // Retrieve oldTiddler _canonical_uri if any
    old_canonical_uri = oldTiddler.getFieldString("_canonical_uri");
    if (old_canonical_uri !== undefined && old_canonical_uri !== null && old_canonical_uri.trim() !== "") {
      old_canonical_uri = old_canonical_uri.trim();
    } else {
      old_canonical_uri = null;
    }
    // Retrieve oldTiddler _tid_uri if any
    old_tid_uri = oldTiddler.getFieldString("_tid_uri");
    if (old_tid_uri !== undefined && old_tid_uri !== null && old_tid_uri.trim() !== "") {
      old_tid_uri = old_tid_uri.trim();
    } else {
      old_tid_uri = null;
    }
  }

  // Nothing to do
  if (canonical_uri == old_canonical_uri && tid_uri == old_tid_uri) {
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
          if (info.encoding === "base64") {
            content = await $tw.utils.loadToBase64(old_canonical_uri);
          } else {
            content = await $tw.utils.loadToUtf8(old_canonical_uri);
          }
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
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

        try {
          // Unable to decide whether or not the content is encrypted
          const parsed = $tw.ipfs.normalizeUrl(canonical_uri);
          // Decode CID
          var { cid } = this.ipfsWrapper.decodeCid(parsed.pathname);
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
                "Discard request to unpin:"
                + "\n "
                + parsed.pathname
              );
            }
          }
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      }

      // Process previous canonical_uri if any
      if (old_canonical_uri !== null) {
        try {
          const parsed = $tw.ipfs.normalizeUrl(old_canonical_uri);
          const { cid: oldCid } = this.ipfsWrapper.decodeCid(parsed.pathname);
          if ($tw.utils.getIpfsUnpin()
            && oldCid !== null
            && window.unpin.indexOf(oldCid) == -1
          ) {
            window.unpin.push(oldCid);
            this.getLogger().info(
              "Request to unpin:"
              + "\n "
              + parsed.pathname
            );
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

        this.getLogger().info("Embedding Tiddler...");
        // Update Tiddler
        updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          removeTags: ["$:/isAttachment", "$:/isEmbedded", "$:/isEncrypted", "$:/isImported", "$:/isIpfs"]
        });

      // _canonical_uri attribute has been updated
      } else {

        try {
          const parsed = $tw.ipfs.normalizeUrl(canonical_uri);
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
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      }

    }

    // Process if any update
    if (tid_uri !== old_tid_uri) {

      updatedTiddler = updatedTiddler !== null ? updatedTiddler : tiddler;

      // Retrieve tiddler _canonical_uri if any
      canonical_uri = updatedTiddler.getFieldString("_canonical_uri");
      if (canonical_uri !== undefined && canonical_uri !== null && canonical_uri.trim() !== "") {
        canonical_uri = canonical_uri.trim();
      } else {
        canonical_uri = null;
      }

      // _tid_uri attribute has been removed
      if (tid_uri == null) {

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

      // _tid_uri attribute has been updated
      } else {

        try {
          // New _tid_uri
          const parsed = $tw.ipfs.normalizeUrl(tid_uri);
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
          if (cid !== null) {
            const index = window.unpin.indexOf(cid);
            if (index !== -1) {
              window.unpin.splice(index, 1);
              this.getLogger().info(
                "Discard request to unpin:"
                + "\n "
                + parsed.pathname
              );
            }
          }
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      }

      // Process previous tid_uri if any
      if (old_tid_uri !== null) {
        try {
          const parsed = $tw.ipfs.normalizeUrl(old_tid_uri);
          const { cid: oldCid } = this.ipfsWrapper.decodeCid(parsed.pathname);
          if ($tw.utils.getIpfsUnpin()
            && oldCid !== null
            && window.unpin.indexOf(oldCid) == -1
          ) {
            window.unpin.push(oldCid);
            this.getLogger().info(
              "Request to unpin:"
              + "\n "
              + parsed.pathname
            );
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
