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

  const local = '<a href="'
  const remote = '<a rel="noopener noreferrer" target="_blank" href="'

  var alertKeyFailed = function (strings, field, url, title) {
    var failed = strings[0]
    var from = strings[1]
    var endH = strings[2]
    var endL = strings[3]
    if (
      url.hostname === $tw.ipfs.getDocumentUrl().hostname &&
      url.pathname === $tw.ipfs.getDocumentUrl().pathname
    ) {
      return `${failed}${field}${from}${local}${url}${endH}${title}${endL}`
    } else {
      return `${failed}${field}${from}${remote}${url}${endH}${title}${endL}`
    }
  }

  var alertFailed = function (
    strings,
    msg,
    key,
    field,
    parentUrl,
    parentTitle,
    parentField
  ) {
    var space = strings[1]
    var endH1 = strings[2]
    var endL1 = strings[3]
    var endH2 = strings[4]
    var endL2 = strings[5]
    if (
      parentUrl.hostname === $tw.ipfs.getDocumentUrl().hostname &&
      parentUrl.pathname === $tw.ipfs.getDocumentUrl().pathname
    ) {
      return `${msg}${space}${remote}${key}${endH1}${field}${endL1}${local}${parentUrl}${endH2}${parentTitle}${endL2}${parentField}`
    } else {
      return `${msg}${space}${remote}${key}${endH1}${field}${endL1}${remote}${parentUrl}${endH2}${parentTitle}${endL2}${parentField}`
    }
  }

  var alertTypeFailed = function (
    strings,
    msg,
    type,
    key,
    field,
    parentUrl,
    parentTitle,
    parentField
  ) {
    var space = strings[1]
    var from = strings[2]
    var endH1 = strings[3]
    var endL1 = strings[4]
    var endH2 = strings[5]
    var endL2 = strings[6]
    if (
      parentUrl.hostname === $tw.ipfs.getDocumentUrl().hostname &&
      parentUrl.pathname === $tw.ipfs.getDocumentUrl().pathname
    ) {
      return `${msg}${space}${type}${from}${remote}${key}${endH1}${field}${endL1}${local}${parentUrl}${endH2}${parentTitle}${endL2}${parentField}`
    } else {
      return `${msg}${space}${type}${from}${remote}${key}${endH1}${field}${endL1}${remote}${parentUrl}${endH2}${parentTitle}${endL2}${parentField}`
    }
  }

  var IpfsImport = function () {}

  IpfsImport.prototype.getLogger = function () {
    return window.log.getLogger(name)
  }

  IpfsImport.prototype.getImported = function (key, title) {
    const imported = this.loaded.get(key)
    if (imported !== undefined) {
      for (var importedTitle of imported.keys()) {
        if (importedTitle === title) {
          const { canonicalKey, importKey, tiddler } = imported.get(
            importedTitle
          )
          return {
            canonicalKey: canonicalKey,
            importKey: importKey,
            tiddler: tiddler
          }
        }
      }
    }
    return {
      canonicalKey: null,
      importKey: null,
      tiddler: null
    }
  }

  IpfsImport.prototype.removeTitles = function (keys, currentTitle) {
    var removed = 0
    for (var key of this.loaded.keys()) {
      const imported = this.loaded.get(key)
      for (var title of imported.keys()) {
        if (currentTitle === title && keys.indexOf(key) === -1) {
          imported.delete(title)
          removed += 1
        }
      }
    }
    return removed
  }

  IpfsImport.prototype.getKey = async function (base, value) {
    var cid = null
    var ipnsKey = null
    var key = null
    var normalizedUrl = null
    var resolvedUrl = null;
    value =
      value == null || value == undefined || value.trim() === ''
        ? null
        : value.trim()
    if (value == null) {
      return null
    }
    var { cid, ipnsKey, normalizedUrl, resolvedUrl } = await $tw.ipfs.resolveUrl(
      false,
      true,
      value,
      base
    )
    if (normalizedUrl == null && resolvedUrl == null) {
      throw new Error(`Failed to resolve value: "${value}"`)
    }
    if (cid !== null) {
      key = '/ipfs/' + cid
    } else if (ipnsKey !== null) {
      key = '/ipns/' + ipnsKey
    } else if (normalizedUrl.hostname.endsWith('.eth')) {
      key = normalizedUrl.hostname
    } else {
      key = normalizedUrl.toString()
    }
    return {
      key: key,
      resolvedUrl: resolvedUrl
    }
  }

  IpfsImport.prototype.import = async function (
    canonicalUri,
    importUri,
    title
  ) {
    canonicalUri =
      canonicalUri == null ||
      canonicalUri == undefined ||
      canonicalUri.trim() === ''
        ? null
        : canonicalUri.trim()
    importUri =
      importUri == null || importUri == undefined || importUri.trim() === ''
        ? null
        : importUri.trim()
    this.host =
      title !== undefined && title !== null && title.trim() !== ''
        ? $tw.wiki.getTiddler(title.trim())
        : null
    if (this.host == undefined) {
      this.host = null
    }
    this.loaded = new Map()
    this.notLoaded = new Array()
    this.resolved = new Map()
    this.notResolved = new Array()
    this.processedImported = new Map()
    this.processedTitles = new Map()
    this.root = null
    try {
      // Load and prepare imported tiddlers to be processed
      var added = 0
      var updated = 0
      var url = $tw.ipfs.getDocumentUrl()
      url.hash = title
      if (canonicalUri !== null || importUri !== null) {
        this.getLogger().info('*** Begin Import ***')
        var { loaded, removed: loadedRemoved } = await this.loadResources(
          url,
          title,
          canonicalUri,
          importUri
        )
        //var { prepared, removed: preparedRemoved } = this.prepareTiddlers()
        this.getLogger().info(`*** Loaded: ${this.loaded.size} resource(s) ***`)
        this.getLogger().info(
          `*** Failed to load: ${this.notLoaded.length} resource(s) ***`
        )
        this.getLogger().info(
          `*** Failed to resolve: ${this.notResolved.length} URL(s) ***`
        )
        this.getLogger().info(
          `*** Loaded: ${loaded} and Removed: ${loadedRemoved} Tiddler(s) ***`
        )
        // this.getLogger().info(
        //   `*** Prepared: ${prepared} and Removed: ${preparedRemoved} Tiddler(s) ***`
        // )
      }
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
    this.resolved = null
    this.notResolved = null
    this.processedImported = null
    this.processedTitles = null
    this.root = null
  }

  IpfsImport.prototype.loadResources = async function (
    url,
    title,
    canonicalUri,
    importUri
  ) {
    var loaded = 0
    var removed = 0
    var canonicalKey = null
    var resolvedCanonicalKey = null
    if (
      canonicalUri !== null &&
      this.notResolved.indexOf(canonicalUri) === -1 &&
      this.resolved.get(canonicalUri) == undefined
    ) {
      try {
        var { key: canonicalKey, resolvedUrl: resolvedCanonicalKey } = await this.getKey(url, canonicalUri)
        this.resolved.set(canonicalUri, canonicalKey)
      } catch (error) {
        var field = '_canonical_uri'
        this.notResolved.push(canonicalUri)
        this.getLogger().error(error)
        $tw.utils.alert(
          name,
          alertKeyFailed`Failed to resolve field: "${field}" from: ${url}">${title}</a>`
        )
      }
    }
    var importKey = null
    var resolvedImportKey = null
    if (
      importUri !== null &&
      this.notResolved.indexOf(importUri) === -1 &&
      this.resolved.get(importUri) == undefined
    ) {
      try {
        var { key: importKey, resolvedUrl: resolvedImportKey } = await this.getKey(url, importUri)
        this.resolved.set(importUri, importKey)
      } catch (error) {
        var field = '_import_uri'
        this.notResolved.push(canonicalUri)
        this.getLogger().error(error)
        $tw.utils.alert(
          name,
          alertKeyFailed`Failed to resolve field: "${field}" from: ${url}">${title}</a>`
        )
      }
    }
    if (
      canonicalKey !== null &&
      this.notLoaded.indexOf(canonicalKey) === -1 &&
      this.loaded.get(canonicalKey) == undefined
    ) {
      const {
        loaded: loadedAdded,
        removed: loadedRemoved
      } = await this.loadResource(url, title, '_canonical_uri', canonicalKey, resolvedCanonicalKey)
      loaded = loadedAdded
      removed = loadedRemoved
    }
    if (
      importKey !== null &&
      this.notLoaded.indexOf(importKey) === -1 &&
      this.loaded.get(importKey) == undefined
    ) {
      const {
        loaded: loadedAdded,
        removed: loadedRemoved
      } = await this.loadResource(url, title, '_import_uri', importKey, resolvedImportKey)
      loaded += loadedAdded
      removed += loadedRemoved
    }
    return {
      loaded: loaded,
      removed: removed
    }
  }

  IpfsImport.prototype.loadResource = async function (
    parentUrl,
    parentTitle,
    parentField,
    key,
    resolvedKey
  ) {
    var loaded = 0
    var removed = 0
    var content = null
    var imported = new Map()
    var tiddlers = null
    try {
      // Load
      content = await $tw.ipfs.loadToUtf8(resolvedKey.toString())
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
        for (var i in tiddlers) {
          var tiddler = tiddlers[i]
          var title = tiddler['title']
          if (title == undefined || title == null || title.trim() === '') {
            this.getLogger().info(
              `Ignored Unknown "Title":\n ${resolvedKey}\n loaded from: "${parentTitle}", field: "${parentField}"\n ${parentUrl}`
            )
            var msg = 'Ignored Unknown'
            var field = 'Title'
            $tw.utils.alert(
              name,
              alertFailed`${msg}: ${resolvedKey}">${field}</a>, loaded from: ${parentUrl}">${parentTitle}</a>, field: "${parentField}"`
            )
            removed += 1
            continue
          }
          if (imported.get(title) !== undefined) {
            this.getLogger().info(
              `Ignored Duplicate "${title}"\n ${resolvedKey}\n loaded from: "${parentTitle}", field: "${parentField}"\n ${parentUrl}`
            )
            var msg = 'Ignored Duplicate'
            $tw.utils.alert(
              name,
              alertFailed`${msg}: ${resolvedKey}">${title}</a>, loaded from: ${parentUrl}">${parentTitle}</a>, field: "${parentField}"`
            )
            removed += 1
            continue
          }
          var type = tiddler['type']
          if (type == undefined || type == null) {
            type = 'text/vnd.tiddlywiki'
          }
          var info = $tw.config.contentTypeInfo[type]
          if (info == undefined || info == null) {
            var msg = `Unknown Content-Type "${type}" from: "${title}"\n ${resolvedKey}\n loaded from: "${parentTitle}", field: "${parentField}"\n ${parentUrl}`;
            this.getLogger().info(
              `Unknown Content-Type "${type}" from: "${title}"\n ${resolvedKey}\n loaded from: "${parentTitle}", field: "${parentField}"\n ${parentUrl}`
            )
            var msg = 'Unknown Content-Type'
            $tw.utils.alert(
              name,
              alertTypeFailed`${msg}: "${type}" from ${resolvedKey}">${title}</a>, loaded from: ${parentUrl}">${parentTitle}</a>, field: "${parentField}"`
            )
            // Default
            type = 'text/vnd.tiddlywiki'
            info = $tw.config.contentTypeInfo[type]
          }
          tiddler['type'] = type
          // Next
          var canonicalUri = tiddler['_canonical_uri']
          canonicalUri =
            canonicalUri == null ||
            canonicalUri == undefined ||
            canonicalUri.trim() === ''
              ? null
              : canonicalUri.trim()
          var importUri = tiddler['_import_uri']
          importUri =
            importUri == null ||
            importUri == undefined ||
            importUri.trim() === ''
              ? null
              : importUri.trim()
          if (
            info.encoding !== 'base64' &&
            tiddler['type'] !== 'image/svg+xml'
          ) {
            if (canonicalUri !== null || importUri !== null) {
              const {
                loaded: loadedAdded,
                removed: loadedRemoved
              } = await this.loadResources(resolvedKey, title, canonicalUri, importUri)
              loaded += loadedAdded
              removed += loadedRemoved
            }
          }
          imported.set(title, tiddler)
          loaded += 1
        }
      }
      if (imported.size === 0) {
        this.getLogger().info(
          `Empty Content:\n ${resolvedKey}\n loaded from: "${parentTitle}", field: "${parentField}"\n ${parentUrl}`
        )
        var msg = 'Empty'
        var field = 'Content'
        $tw.utils.alert(
          name,
          alertFailed`${msg}: ${resolvedKey}">${field}</a>, loaded from: ${parentUrl}">${parentTitle}</a>, field: "${parentField}"`
        )
      }
    } catch (error) {
      this.notLoaded.push(key)
      this.getLogger().info(
        `Failed to Load:\n ${resolvedKey}\n loaded from: "${parentTitle}", field: "${parentField}"\n ${parentUrl}`
      )
      this.getLogger().error(error)
      var msg = 'Failed to Load'
      var field = 'Content'
      $tw.utils.alert(
        name,
        alertFailed`${msg}: ${resolvedKey}">${field}</a>, loaded from: ${parentUrl}">${parentTitle}</a>, field: "${parentField}"`
      )
    }
    return {
      loaded: loaded,
      removed: removed
    }
  }

  IpfsImport.prototype.prepareTiddlers = function (parentKey, parentTitle) {
    var prepared = 0
    var removed = 0
    var processedTitles = new Array()
    for (var key of this.loaded.keys()) {
      const imported = this.loaded.get(key)
      for (var title of imported.keys()) {
        if (processedTitles.indexOf(title) !== -1) {
          continue
        }
        const keys = new Array()
        const {
          canonicalUriKey,
          canonicalUri,
          importUriKey,
          importUri
        } = this.getImported(key, title)
        if (canonicalUri !== null || importUri !== null) {
          if (canonicalUri == null && importUri !== null) {
            // Inconsistency
          } else {
            if (
              this.notResolved.indexOf(canonicalUri) === -1 &&
              this.notLoaded.indexOf(canonicalUriKey) === -1
            ) {
              const {
                canonicalUri: leafCanonicalUri,
                importUri: leafImportUri
              } = this.getImported(canonicalUri, title)
              if (leafCanonicalUri !== null || leafImportUri !== null) {
                // Inconsistency
              } else if (importUri !== null) {
                if (
                  this.notResolved.indexOf(importUri) === -1 &&
                  this.notLoaded.indexOf(importUriKey) === -1
                ) {
                  if (
                    this.prepareTiddler(
                      keys,
                      key,
                      canonicalUri,
                      importUriKey,
                      title
                    )
                  ) {
                    keys.push(key)
                  }
                }
              } else {
                keys.push(key)
              }
            }
          }
        } else {
          // Leaf
          keys.push(key)
        }
        prepared += keys.length
        removed += this.removeTitles(keys, title)
        processedTitles.push(title)
      }
    }
    return {
      prepared: prepared,
      removed: removed
    }
  }

  IpfsImport.prototype.prepareTiddler = function (
    keys,
    parentKey,
    canonicalUri,
    importUriKey,
    title
  ) {
    const {
      canonicalUri: nextCanonicalUri,
      importUriKey: nextImportUriKey,
      importUri: nextImportUri
    } = this.getImported(importUriKey, title)
    // Inconsistency
    if (nextCanonicalUri !== null && nextCanonicalUri !== canonicalUri) {
      return false
    }
    // Inconsistency
    if (nextCanonicalUri == null && nextImportUri !== null) {
      return false
    }
    if (nextImportUri !== null) {
      // Cycle
      if (keys.indexOf(nextImportUriKey) !== -1) {
        return false
      }
      // Next
      if (
        this.notResolved.indexOf(nextImportUri) === -1 &&
        this.notLoaded.indexOf(nextImportUriKey) === -1
      ) {
        if (
          this.prepareTiddler(
            keys,
            importUriKey,
            canonicalUri,
            nextImportUriKey,
            title
          )
        ) {
          keys.push(importUriKey)
          return true
        }
      }
      return false
    }
    keys.push(importUriKey)
    return true
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
