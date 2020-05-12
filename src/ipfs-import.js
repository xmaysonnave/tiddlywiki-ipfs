/*\
title: $:/plugins/ipfs/ipfs-import.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Import

\*/

;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  const name = 'ipfs-import'

  var IpfsImport = function () {}

  IpfsImport.prototype.getLogger = function () {
    return window.log.getLogger(name)
  }

  IpfsImport.prototype.getKey = async function (field, url, title, value) {
    var cid = null
    var ipnsKey = null
    var normalizedUrl = null
    var key = null
    if (value == undefined || value == null || value.trim() === '') {
      return null
    }
    try {
      var { cid, ipnsKey, normalizedUrl } = await $tw.ipfs.resolveUrl(
        false,
        false,
        value
      )
      if (normalizedUrl == null) {
        throw new Error('Failed to resolve value: "' + value + '"')
      }
    } catch (error) {
      this.notResolved.push(value)
      this.getLogger().error(error)
      var msgAlert = 'Failed to resolve field: "'
      msgAlert += field
      if (
        url.hostname === $tw.ipfs.getDocumentUrl().hostname &&
        url.pathname === $tw.ipfs.getDocumentUrl().pathname
      ) {
        msgAlert += '" from: <a href="'
      } else {
        msgAlert +=
          '" from: <a rel="noopener noreferrer" target="_blank" href="'
      }
      msgAlert += url
      msgAlert += '">'
      msgAlert += title
      msgAlert += '</a>'
      $tw.utils.alert(name, msgAlert)
    }
    if (normalizedUrl !== null) {
      if (normalizedUrl.hostname.endsWith('.eth')) {
        key = normalizedUrl.hostname
      } else if (ipnsKey !== null) {
        key = '/ipns/' + ipnsKey
      }
      if (cid !== null) {
        key = '/ipfs/' + cid
      } else {
        key = normalizedUrl.toString()
      }
    }
    return key
  }

  IpfsImport.prototype.getReferences = function (title) {
    const references = new Map()
    for (var [key, imported] of this.loaded.entries()) {
      for (var [
        importedTitle,
        { canonicalUri, importUri }
      ] of imported.entries()) {
        if (importedTitle === title) {
          references.set(key, { canonicalUri, importUri })
        }
      }
    }
    return references
  }

  IpfsImport.prototype.import = async function (
    canonicalUri,
    importUri,
    title
  ) {
    this.host =
      title !== undefined && title !== null && title.trim() !== ''
        ? $tw.wiki.getTiddler(title)
        : null
    if (this.host == undefined) {
      this.host = null
    }
    this.loaded = new Map()
    this.notResolved = new Array()
    this.notLoaded = new Array()
    this.processedImported = new Map()
    this.processedTitles = new Map()
    this.root = null
    var count = 0
    this.getLogger().info('*** Begin Import ***')
    try {
      // Load and prepare imported tiddlers to be processed
      var added = 0
      var updated = 0
      var currentUrl = $tw.ipfs.getUrl('#' + title, $tw.ipfs.getDocumentUrl())
      var canonicalUri = await this.getKey(
        '_canonical_uri',
        currentUrl,
        title,
        canonicalUri
      )
      var importUri = await this.getKey(
        '_import_uri',
        currentUrl,
        title,
        importUri
      )
      if (canonicalUri !== null || importUri !== null) {
        count = await this.load(canonicalUri, importUri, currentUrl, title)
      }
      var references = this.getReferences('Node 1')
      this.getLogger().info('*** Loaded: ' + count + ' Tiddler(s) ***')
      this.getLogger().info(
        '*** Loaded: ' + this.loaded.size + ' content(s) ***'
      )
      this.getLogger().info(
        '*** Fail to load: ' + this.notLoaded.length + ' content(s) ***'
      )
      this.getLogger().info(
        '*** Fail to resolve: ' + this.notResolved.length + ' value(s) ***'
      )
      // // Update Tiddly
      // for (var [title, merged] of this.processedImported.entries()) {
      //   $tw.wiki.addTiddler(merged);
      // }
      // Process deleted
      // $tw.wiki.forEachTiddler({ includeSystem: true }, function (title, tiddler) {
      //   var value = tiddler.getFieldString("_canonical_uri");
      //   if (value !== undefined && value !== null && value === importedUri && processed.indexOf(title) === -1) {
      //     $tw.wiki.deleteTiddler(title);
      //     return;
      //   }
      //   var value = tiddler.getFieldString("_import_uri");
      //   if (value !== undefined && value !== null && value === importedUri && processed.indexOf(title) === -1) {
      //     $tw.wiki.deleteTiddler(title);
      //     return;
      //   }
      // });
      // if (this.processedTitles.size > 0) {
      //   $tw.utils.alert(name, "Successfully Added: " + added + ", Updated: " + updated + " Tiddlers...");
      // }
      // if (this.host !== null && this.processedTitles.get(this.host.fields.title) == undefined) {
      //   var updatedTiddler = new $tw.Tiddler(this.host);
      //   if (this.root !== null) {
      //     updatedTiddler = $tw.utils.updateTiddler({
      //       tiddler: updatedTiddler,
      //       fields: [{ key: "text", value: "Successfully Imported Tiddlers: [[" + this.root + "]]..." }],
      //     });
      //   } else if (this.processedTitles.size === 0) {
      //     updatedTiddler = $tw.utils.updateTiddler({
      //       tiddler: updatedTiddler,
      //       fields: [{ key: "text", value: "No Tiddlers have been Imported..." }],
      //     });
      //   } else {
      //     updatedTiddler = $tw.utils.updateTiddler({
      //       tiddler: updatedTiddler,
      //       fields: [{ key: "text", value: "Successfully Imported Tiddlers..." }],
      //     });
      //   }
      //   // Update
      //   $tw.wiki.addTiddler(updatedTiddler);
      // }
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
    }
    this.getLogger().info('*** End Import ***')
    this.host = null
    this.loaded = null
    this.notLoaded = null
    this.notResolved = null
    this.processedImported = null
    this.processedTitles = null
    this.root = null
  }

  IpfsImport.prototype.load = async function (
    canonicalUri,
    importUri,
    parentUrl,
    parentTitle
  ) {
    var count = 0
    if (
      canonicalUri !== null &&
      this.notResolved.indexOf(canonicalUri) === -1
    ) {
      count += await this.importTiddlers(
        '_canonical_uri',
        canonicalUri,
        parentUrl,
        parentTitle
      )
    }
    if (importUri !== null && this.notResolved.indexOf(importUri) === -1) {
      count += await this.importTiddlers(
        '_import_uri',
        importUri,
        parentUrl,
        parentTitle
      )
    }
    return count
  }

  IpfsImport.prototype.importTiddlers = async function (
    parentField,
    key,
    parentUrl,
    parentTitle
  ) {
    var count = 0
    var content = null
    var imported = new Map()
    var normalizedUrl = null
    var resolvedUrl = null
    var tiddlers = null
    var url = null
    try {
      var { normalizedUrl, resolvedUrl } = await $tw.ipfs.resolveUrl(
        false,
        true,
        key
      )
      if (normalizedUrl == null) {
        throw new Error('Failed to resolve key: "' + key + '"')
      }
    } catch (error) {
      this.notResolved.push(key)
      this.getLogger().error(error)
      var msgAlert = 'Failed to resolve field: "'
      msgAlert += parentField
      if (
        parentUrl.hostname === $tw.ipfs.getDocumentUrl().hostname &&
        parentUrl.pathname === $tw.ipfs.getDocumentUrl().pathname
      ) {
        msgAlert += '" from: <a href="'
      } else {
        msgAlert +=
          '" from: <a rel="noopener noreferrer" target="_blank" href="'
      }
      msgAlert += parentUrl
      msgAlert += '">'
      msgAlert += parentTitle
      msgAlert += '</a>'
      $tw.utils.alert(name, msgAlert)
      return count
    }
    // To be loaded
    url = resolvedUrl !== null ? resolvedUrl : normalizedUrl
    // Loaded or can't be loaded
    if (
      this.loaded.get(key) !== undefined ||
      this.notLoaded.indexOf(key) !== -1
    ) {
      // this.getLogger().info("Cycle detected, Tiddler: " + parentTitle + "\n " + parentUrl);
      // $tw.utils.alert(
      //   name,
      //   'Cycle detected, Tiddler: <a rel="noopener noreferrer" target="_blank" href="' +
      //     parentUrl +
      //     '">' +
      //     parentTitle +
      //     "</a>"
      // );
      return count
    }
    try {
      // Load
      content = await $tw.ipfs.loadToUtf8(url.toString())
      if ($tw.ipfs.isJson(content.data)) {
        tiddlers = $tw.wiki.deserializeTiddlers(
          '.json',
          content.data,
          $tw.wiki.getCreationFields()
        )
      } else {
        tiddlers = $tw.wiki.deserializeTiddlers(
          '.tid',
          content.data,
          $tw.wiki.getCreationFields()
        )
      }
      // Loaded
      this.loaded.set(key, imported)
      if (tiddlers !== undefined && tiddlers !== null) {
        // First round
        for (var i in tiddlers) {
          count += 1
          var tiddler = tiddlers[i]
          var title = tiddler['title']
          if (title == undefined || title == null || title.trim() === '') {
            var msgConsole = 'Ignored Unknown Title from: '
            msgConsole += '\n '
            msgConsole += url
            msgConsole += '\n loaded from: "'
            msgConsole += parentTitle
            msgConsole += '", field: "'
            msgConsole += parentField
            msgConsole += '"\n '
            msgConsole += parentUrl
            this.getLogger().info(msgConsole)
            var msgAlert =
              'Ignored unknown Title: <a rel="noopener noreferrer" target="_blank" href="'
            msgAlert += url
            msgAlert += '">Tiddler</a>'
            if (
              parentUrl.hostname === $tw.ipfs.getDocumentUrl().hostname &&
              parentUrl.pathname === $tw.ipfs.getDocumentUrl().pathname
            ) {
              msgAlert += ' loaded from: <a href="'
            } else {
              msgAlert +=
                ' loaded from: <a rel="noopener noreferrer" target="_blank" href="'
            }
            msgAlert += parentUrl
            msgAlert += '">'
            msgAlert += parentTitle
            msgAlert += '</a>, field: "'
            msgAlert += parentField
            msgAlert += '"'
            $tw.utils.alert(name, msgAlert)
            continue
          }
          if (imported.get(title) !== undefined) {
            var msgConsole = 'Ignored Duplicate: "'
            msgConsole += title
            msgConsole += '"\n '
            msgConsole += url
            msgConsole += '\n loaded from: "'
            msgConsole += parentTitle
            msgConsole += '", field: "'
            msgConsole += parentField
            msgConsole += '"\n '
            msgConsole += parentUrl
            this.getLogger().info(msgConsole)
            var msgAlert =
              'Ignored duplicate: <a rel="noopener noreferrer" target="_blank" href="'
            msgAlert += url
            msgAlert += '">'
            msgAlert += title
            msgAlert += '</a>'
            if (
              parentUrl.hostname === $tw.ipfs.getDocumentUrl().hostname &&
              parentUrl.pathname === $tw.ipfs.getDocumentUrl().pathname
            ) {
              msgAlert += ' loaded from: <a href="'
            } else {
              msgAlert +=
                ' loaded from: <a rel="noopener noreferrer" target="_blank" href="'
            }
            msgAlert += parentUrl
            msgAlert += '">'
            msgAlert += parentTitle
            msgAlert += '</a>, field: "'
            msgAlert += parentField
            msgAlert += '"'
            $tw.utils.alert(name, msgAlert)
            continue
          }
          var type = tiddler['type']
          if (type == undefined || type == null) {
            type = 'text/vnd.tiddlywiki'
          }
          var info = $tw.config.contentTypeInfo[type]
          if (info == undefined || info == null) {
            var msgConsole = 'Unknown Content-Type: '
            msgConsole += type
            msgConsole += ' from: '
            msgConsole += title
            msgConsole += '\n '
            msgConsole += url
            msgConsole += '\n loaded from: '
            msgConsole += parentTitle
            msgConsole += ', field: '
            msgConsole += parentField
            msgConsole += '\n '
            msgConsole += parentUrl
            this.getLogger().info(msgConsole)
            var msgAlert = 'Unknown Content-Type: '
            msgAlert += type
            msgAlert +=
              ' from <a rel="noopener noreferrer" target="_blank" href="'
            msgAlert += url
            msgAlert += '">'
            msgAlert += title
            msgAlert += '</a>'
            if (
              parentUrl.hostname === $tw.ipfs.getDocumentUrl().hostname &&
              parentUrl.pathname === $tw.ipfs.getDocumentUrl().pathname
            ) {
              msgAlert += ' loaded from: <a href="'
            } else {
              msgAlert +=
                ' loaded from: <a rel="noopener noreferrer" target="_blank" href="'
            }
            msgAlert += parentUrl
            msgAlert += '">'
            msgAlert += parentTitle
            msgAlert += '</a>, field: "'
            msgAlert += parentField
            msgAlert += '"'
            $tw.utils.alert(name, msgAlert)
            // Default
            type = 'text/vnd.tiddlywiki'
            info = $tw.config.contentTypeInfo[type]
          }
          tiddler['type'] = type
          // Next
          var canonicalUri = await this.getKey(
            '_canonical_uri',
            url,
            title,
            tiddler['_canonical_uri']
          )
          var importUri = await this.getKey(
            '_import_uri',
            url,
            title,
            tiddler['_import_uri']
          )
          if (
            info.encoding !== 'base64' &&
            tiddler['type'] !== 'image/svg+xml'
          ) {
            if (canonicalUri !== null || importUri !== null) {
              count += await this.load(canonicalUri, importUri, url, title)
            }
          }
          imported.set(title, { canonicalUri, importUri, tiddler })
        }
      }
    } catch (error) {
      this.notLoaded.push(key)
      this.getLogger().error(error)
      var msgAlert =
        'Failed to load: <a rel="noopener noreferrer" target="_blank" href="'
      msgAlert += url
      if (
        parentUrl.hostname === $tw.ipfs.getDocumentUrl().hostname &&
        parentUrl.pathname === $tw.ipfs.getDocumentUrl().pathname
      ) {
        msgAlert += '">Content</a>, loaded from: <a href="'
      } else {
        msgAlert +=
          '">Content</a>, loaded from: <a rel="noopener noreferrer" target="_blank" href="'
      }
      msgAlert += parentUrl
      msgAlert += '">'
      msgAlert += parentTitle
      msgAlert += '</a>, field: "'
      msgAlert += parentField
      msgAlert += '"'
      $tw.utils.alert(name, msgAlert)
      return count
    }
    return count
  }

  IpfsImport.prototype.loadRemoteImportedTiddlers = async function (
    importUri,
    canonicalUri,
    title
  ) {
    var added = 0
    var key = null
    var importedTiddlers = null
    var normalizedUrl = null
    var updated = 0
    var url = null
    // Load Imported
    if (importUri !== undefined && importUri !== null) {
      url = importUri
      var {
        importedTiddlers,
        key,
        normalizedUrl
      } = await this.getImportedTiddlers('_import_uri', title, url)
      // Fallback
      if (importedTiddlers == null) {
        url = canonicalUri
        if (url !== undefined && url !== null) {
          var {
            importedTiddlers,
            key,
            normalizedUrl
          } = await this.getImportedTiddlers('_canonical_uri', title, url)
        }
      }
    } else if (canonicalUri !== undefined && canonicalUri !== null) {
      url = canonicalUri
      var {
        importedTiddlers,
        key,
        normalizedUrl
      } = await this.getImportedTiddlers('_canonical_uri', title, url)
    }
    // Process Imported
    if (importedTiddlers !== null) {
      var { added, updated } = await this.processLoadedImportedTiddlers(
        importedTiddlers,
        key,
        url,
        normalizedUrl
      )
    }
    return {
      added: added,
      updated: updated
    }
  }

  IpfsImport.prototype.processImportedTiddlers = async function (
    importedTiddlers,
    key,
    importedUrl,
    importedNormalizedUrl
  ) {
    var importedAdded = 0
    var importedUpdated = 0
    // Process new and existing
    for (var [
      importedTitle,
      importedTiddler
    ] of this.importedTiddlers.entries()) {
      var merged = null
      var currentTiddler = null
      var importedTags =
        importedTiddler['tags'] !== undefined ? importedTiddler['tags'] : ''
      // Type
      var type = importedTiddler['type']
      // Default
      if (type == undefined || type == null) {
        type = 'text/vnd.tiddlywiki'
      }
      // Content-Type
      var info = $tw.config.contentTypeInfo[type]
      // Check
      if (info == undefined || info == null) {
        $tw.utils.alert(
          name,
          "Unknown Content-Type: '" +
            type +
            "', default to: 'text/vnd.tiddlywiki', <a rel='noopener noreferrer' target='_blank' href='" +
            importedNormalizedUrl +
            "'>" +
            importedTitle +
            '</a>'
        )
        // Default
        type = 'text/vnd.tiddlywiki'
        info = $tw.config.contentTypeInfo[type]
      }
      // Load until we reach the leaf
      if (info.encoding !== 'base64' && type !== 'image/svg+xml') {
        var uri = importedTiddler['_import_uri']
        if (uri == undefined || uri == null) {
          uri = importedTiddler['_canonical_uri']
        }
        if (uri !== undefined && uri !== null) {
          try {
            var { added, updated } = await this.loadRemoteImportedTiddlers(
              importedTiddler['_import_uri'],
              importedTiddler['_canonical_uri'],
              importedTitle
            )
            importedAdded += added
            importedUpdated += updated
          } catch (error) {
            if (error.name !== undefined && error.name === 'CircularImport') {
              $tw.utils.alert(name, error.message)
              break
            }
            throw error
          }
        }
      }
      // Imported root
      if (this.host !== null && this.root == null) {
        this.root = importedTitle
      }
      // Retrieve target host Tiddler
      if (this.host !== null && this.host.fields.title === importedTitle) {
        currentTiddler = this.host
      } else {
        currentTiddler = $tw.wiki.getTiddler(importedTitle)
      }
      // Retrieve or prepare merged content
      merged = this.processedImported.get(importedTitle)
      if (merged == undefined) {
        merged = new Object()
        this.processedImported.set(importedTitle, merged)
      }
      // Fields
      for (var field in importedTiddler) {
        // Discard
        if (field === 'tags') {
          continue
        }
        // Unknown from leaf to top, we keep the top modified field
        if (
          merged[field] == undefined ||
          merged[field] == null ||
          field === 'modified'
        ) {
          merged[field] = importedTiddler[field]
        }
        if (field === 'type') {
          merged[field] = type
        }
      }
      // Tags,
      // We use the target tiddler to manage complex tags like [[IPFS Documentation]]
      if (currentTiddler !== undefined && currentTiddler !== null) {
        var tags = (currentTiddler.fields.tags || []).slice(0)
        for (var i = 0; i < tags.length; i++) {
          var tag = tags[i]
          if (importedTags.includes(tag) == false) {
            importedTags = importedTags + ' ' + tag
          }
        }
      }
      // IPFS tag
      if ($tw.ipfs.isCid(key) && importedTags.includes('$:/isIpfs') == false) {
        importedTags = importedTags + ' $:/isIpfs'
      }
      // Imported tag
      if (importedTags.includes('$:/isImported') == false) {
        importedTags = importedTags + ' $:/isImported'
      }
      // Processed tags
      merged['tags'] = importedTags
      // URI
      if (info.encoding === 'base64' || type === 'image/svg+xml') {
        merged['_import_uri'] = importedUrl
      } else {
        var canonical_uri = merged['_canonical_uri']
        if (canonical_uri == undefined || canonical_uri == null) {
          merged['_canonical_uri'] = importedUrl
          // import_uri
        } else if (canonical_uri !== importedUrl) {
          merged['_import_uri'] = importedUrl
        }
      }
      // Count
      if (currentTiddler !== undefined && currentTiddler !== null) {
        importedUpdated += 1
      } else {
        importedAdded += 1
      }
      // Processed Titles
      var titles = this.processedTitles.get(importedTitle)
      if (titles == undefined) {
        titles = new Array()
        this.processedTitles.set(importedTitle, titles)
      }
      if (key !== null) {
        if (titles.indexOf(key) === -1) {
          titles.push(key)
        }
      } else {
        if (titles.indexOf(importedNormalizedUrl) === -1) {
          titles.push(importedNormalizedUrl)
        }
      }
    }
    return {
      added: importedAdded,
      updated: importedUpdated
    }
  }
  exports.IpfsImport = IpfsImport
})()
