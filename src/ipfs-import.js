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

  const alertFailed = function (
    strings,
    msg,
    key,
    field,
    parentField,
    parentUrl,
    parentTitle
  ) {
    var space = strings[1]
    var endH1 = strings[2]
    var endL1 = strings[3]
    var from = strings[4]
    var endH2 = strings[5]
    var endL2 = strings[6]
    if (
      parentUrl.hostname === $tw.ipfs.getDocumentUrl().hostname &&
      parentUrl.pathname === $tw.ipfs.getDocumentUrl().pathname
    ) {
      return `${msg}${space}${remote}${key}${endH1}${field}${endL1}${parentField}${from}${local}${parentUrl}${endH2}${parentTitle}${endL2}`
    } else {
      return `${msg}${space}${remote}${key}${endH1}${field}${endL1}${parentField}${from}${remote}${parentUrl}${endH2}${parentTitle}${endL2}`
    }
  }

  const alertFieldFailed = function (strings, msg, field, url, title) {
    var failed = strings[1]
    var from = strings[2]
    var endH = strings[3]
    var endL = strings[4]
    if (
      url.hostname === $tw.ipfs.getDocumentUrl().hostname &&
      url.pathname === $tw.ipfs.getDocumentUrl().pathname
    ) {
      return `${msg}${failed}${field}${from}${local}${url}${endH}${title}${endL}`
    } else {
      return `${msg}${failed}${field}${from}${remote}${url}${endH}${title}${endL}`
    }
  }

  const alertConditionFailed = function (
    strings,
    msg,
    condition,
    key,
    title,
    parentUrl
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
      return `${msg}${space}${condition}${from}${remote}${key}${endH1}${title}${endL1}${local}${parentUrl}${endH2}${title}${endL2}`
    } else {
      return `${msg}${space}${condition}${from}${remote}${key}${endH1}${title}${endL1}${remote}${parentUrl}${endH2}${title}${endL2}`
    }
  }

  var IpfsImport = function () {}

  IpfsImport.prototype.getLogger = function () {
    return window.log.getLogger(name)
  }

  IpfsImport.prototype.removeTiddlers = function (keys, title) {
    var removed = 0
    for (var key of this.loaded.keys()) {
      if (keys.indexOf(key) !== -1) {
        continue
      }
      const { resolvedKey, imported } = this.loaded.get(key)
      if (imported.delete(title)) {
        var msg = 'Remove:'
        var field = ''
        this.getLogger().info(`${msg} ${field}"${title}"\n ${resolvedKey}`)
        $tw.utils.alert(
          name,
          alertFieldFailed`${msg} ${field}${resolvedKey}">${title}</a>`
        )
        removed += 1
      }
    }
    return removed
  }

  IpfsImport.prototype.getKey = async function (base, value) {
    var cid = null
    var ipnsKey = null
    var key = null
    var normalizedUrl = null
    var resolvedUrl = null
    value =
      value === undefined || value == null || value.trim() === ''
        ? null
        : value.trim()
    if (value == null) {
      return {
        key: null,
        isIpfs: false,
        resolvedUrl: null
      }
    }
    var {
      cid,
      ipnsKey,
      normalizedUrl,
      resolvedUrl
    } = await $tw.ipfs.resolveUrl(false, true, value, base)
    if (normalizedUrl == null && resolvedUrl == null) {
      throw new Error(`Failed to resolve value: "${value}"`)
    }
    if (cid !== null) {
      key = `/ipfs/${cid}`
    } else if (ipnsKey !== null) {
      key = `/ipns/${ipnsKey}`
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

  IpfsImport.prototype.isIpfs = async function (key) {
    key =
      key === undefined || key == null || key.trim() === '' ? null : key.trim()
    if (key == null) {
      return false
    }
    const { cid, ipnsIdentifier } = $tw.ipfs.decodeCid(key)
    if (cid !== null || ipnsIdentifier !== null) {
      return true
    } else if (key.endsWith('.eth')) {
      return true
    }
    return false
  }

  IpfsImport.prototype.import = async function (
    canonicalUri,
    importUri,
    tiddler
  ) {
    const self = this
    var loadedAdded = 0
    var loadedRemoved = 0
    var added = 0
    var updated = 0
    var deleted = 0
    canonicalUri =
      canonicalUri === undefined ||
      canonicalUri == null ||
      canonicalUri.trim() === ''
        ? null
        : canonicalUri.trim()
    importUri =
      importUri === undefined || importUri == null || importUri.trim() === ''
        ? null
        : importUri.trim()
    this.host = tiddler
    const { type, info } = $tw.utils.getContentType(
      tiddler.fields.title,
      tiddler.fields.type
    )
    this.loaded = new Map()
    this.notLoaded = []
    this.isEmpty = []
    this.resolved = new Map()
    this.notResolved = []
    this.merged = new Map()
    try {
      // Load and prepare imported tiddlers to be processed
      const url = $tw.ipfs.getDocumentUrl()
      url.hash = tiddler.fields.title
      if (canonicalUri !== null || importUri !== null) {
        this.getLogger().info('*** Begin Import ***')
        this.importUri = importUri !== null ? importUri : canonicalUri
        if (this.importUri !== null) {
          const {
            loaded: importLoaded,
            removed: importRemoved
          } = await this.load(
            url,
            tiddler.fields.title,
            '_import_uri',
            importUri,
            true
          )
          loadedAdded += importLoaded
          loadedRemoved += importRemoved
        }
        if (canonicalUri !== null) {
          var load = true
          if (info.encoding === 'base64' || type === 'image/svg+xml') {
            load = false
          }
          const {
            loaded: canonicalLoaded,
            removed: canonicalRemoved
          } = await this.load(
            url,
            tiddler.fields.title,
            '_canonical_uri',
            canonicalUri,
            load
          )
          loadedAdded += canonicalLoaded
          loadedRemoved += canonicalRemoved
        }
        const { processed, removed: processedRemoved } = this.processImported()
        var { added, updated } = this.importTiddlers()
        this.getLogger().info(`*** Loaded: ${this.loaded.size} Resource(s) ***`)
        this.getLogger().info(
          `*** Loaded: ${this.isEmpty.length} Empty Resource(s) ***`
        )
        this.getLogger().info(
          `*** Failed to Load: ${this.notLoaded.length} Resource(s) ***`
        )
        this.getLogger().info(
          `*** Failed to Resolve: ${this.notResolved.length} URL(s) ***`
        )
        this.getLogger().info(
          `*** Loaded: ${loadedAdded}, Removed: ${loadedRemoved} Tiddler(s) ***`
        )
        this.getLogger().info(
          `*** Processed: ${processed}, Removed: ${processedRemoved} Tiddler(s) ***`
        )
        this.getLogger().info(
          `*** Added: ${added}, Updated: ${updated} Tiddler(s) ***`
        )
      }
      // Update Wiki
      var reportMsg = "''Successfully Imported''"
      var reportImported = ''
      for (var [title, merged] of this.merged.entries()) {
        $tw.wiki.addTiddler(merged)
        if (
          this.host !== null &&
          this.merged.get(this.host.fields.title) === undefined
        ) {
          reportImported = `${reportImported}[[${title}]]`
        }
      }
      // Process deleted
      var reportDeletedMsg = "''Successfully Deleted''"
      var reportDeleted = ''
      $tw.wiki.forEachTiddler({ includeSystem: true }, function (
        title,
        tiddler
      ) {
        var value = tiddler.getFieldString('_canonical_uri')
        if (
          value !== undefined &&
          value !== null &&
          value === self.importUri &&
          self.merged.get(title) === undefined
        ) {
          if (
            self.host !== null &&
            self.merged.get(self.host.fields.title) === undefined &&
            self.host.fields.title !== title
          ) {
            $tw.wiki.deleteTiddler(title)
            reportDeleted = `${reportDeleted}[[${title}]]`
            deleted += 1
          }
          return
        }
        var value = tiddler.getFieldString('_import_uri')
        if (
          value !== undefined &&
          value !== null &&
          value === self.importUri &&
          self.merged.get(title) === undefined
        ) {
          if (
            self.host !== null &&
            self.merged.get(self.host.fields.title) === undefined &&
            self.host.fields.title !== title
          ) {
            $tw.wiki.deleteTiddler(title)
            reportDeleted = `${reportDeleted}[[${title}]]`
            deleted += 1
          }
        }
      })
      if (this.merged.size > 0) {
        $tw.utils.alert(
          name,
          'Successfully Added: ' +
            added +
            ', Updated: ' +
            updated +
            ', Deleted: ' +
            deleted +
            ' Tiddlers...'
        )
      }
      if (
        this.host !== null &&
        this.merged.get(this.host.fields.title) === undefined
      ) {
        var updatedTiddler = new $tw.Tiddler(this.host)
        if (this.merged.size === 0) {
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: updatedTiddler,
            fields: [
              {
                key: 'type',
                value: 'text/vnd.tiddlywiki'
              },
              {
                key: 'text',
                value: "''No Tiddlers have been Imported''"
              }
            ]
          })
        } else {
          var value = `${reportMsg}\n\n{{{${reportImported}}}}`
          if (reportDeleted.trim() !== '') {
            value = `${value}\n\n${reportDeletedMsg}\n\n{{{${reportDeleted}}}}`
          }
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: updatedTiddler,
            fields: [
              {
                key: 'type',
                value: 'text/vnd.tiddlywiki'
              },
              {
                key: 'text',
                value: value
              }
            ]
          })
        }
        $tw.wiki.addTiddler(updatedTiddler)
      }
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
    }
    this.getLogger().info('*** End Import ***')
    this.host = null
    this.loaded = null
    this.isEmpty = null
    this.notLoaded = null
    this.resolved = null
    this.notResolved = null
    this.merged = null
  }

  IpfsImport.prototype.load = async function (
    parentUrl,
    parentTitle,
    field,
    url,
    load
  ) {
    var loaded = 0
    var removed = 0
    var key = null
    var resolvedUrl = null
    if (
      url !== null &&
      this.notResolved.indexOf(url) === -1 &&
      this.resolved.get(url) === undefined
    ) {
      try {
        var { key, resolvedUrl } = await this.getKey(parentUrl, url)
        this.resolved.set(url, key)
      } catch (error) {
        var msg = 'Failed to Resolve:'
        this.notResolved.push(url)
        this.getLogger().error(error)
        $tw.utils.alert(
          name,
          alertFieldFailed`${msg} "${field}" from ${parentUrl}">${parentTitle}</a>`
        )
      }
    }
    if (
      load &&
      key !== null &&
      resolvedUrl !== null &&
      this.notLoaded.indexOf(key) === -1 &&
      this.loaded.get(key) === undefined
    ) {
      const {
        loaded: loadedAdded,
        removed: loadedRemoved
      } = await this.loadResource(
        parentUrl,
        parentTitle,
        field,
        url,
        key,
        resolvedUrl
      )
      loaded = loadedAdded
      removed = loadedRemoved
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
    uri,
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
      if (tiddlers !== undefined && tiddlers !== null) {
        this.loaded.set(key, { uri, resolvedKey, imported })
        for (var i in tiddlers) {
          var tiddler = tiddlers[i]
          var title = tiddler.title
          if (title === undefined || title == null || title.trim() === '') {
            var msg = 'Ignore Unknown:'
            var field = 'Title'
            this.getLogger().info(
              `${msg} "${field}"\n ${resolvedKey} \n from "${parentField}", "${parentTitle}"\n ${parentUrl}`
            )
            $tw.utils.alert(
              name,
              alertFailed`${msg} ${resolvedKey}">${field}</a>, from "${parentField}", ${parentUrl}">${parentTitle}</a>`
            )
            removed += 1
            continue
          }
          if (imported.get(title) !== undefined) {
            var msg = 'Ignore Duplicate:'
            this.getLogger().info(
              `${msg} "${title}"\n ${resolvedKey} \n from "${parentField}", "${parentTitle}"\n ${parentUrl}`
            )
            $tw.utils.alert(
              name,
              alertFailed`${msg} ${resolvedKey}">${title}</a>, from "${parentField}", ${parentUrl}">${parentTitle}</a>`
            )
            removed += 1
            continue
          }
          var type = tiddler.type
          if (type === undefined || type == null) {
            type = 'text/vnd.tiddlywiki'
          }
          var info = $tw.config.contentTypeInfo[type]
          if (info === undefined || info == null) {
            var msg = 'Unknown:'
            var field = 'Content-Type'
            this.getLogger().info(
              `${msg} "${field}": "${title}"\n ${resolvedKey}`
            )
            $tw.utils.alert(
              name,
              alertFieldFailed`${msg} "${field}": ${resolvedKey}">${title}</a>`
            )
            // Default
            type = 'text/vnd.tiddlywiki'
            info = $tw.config.contentTypeInfo[type]
          }
          tiddler.type = type
          // Next
          var canonicalUri = tiddler._canonical_uri
          canonicalUri =
            canonicalUri === undefined ||
            canonicalUri == null ||
            canonicalUri.trim() === ''
              ? null
              : canonicalUri.trim()
          tiddler._canonical_uri = canonicalUri
          var importUri = tiddler._import_uri
          importUri =
            importUri === undefined ||
            importUri == null ||
            importUri.trim() === ''
              ? null
              : importUri.trim()
          tiddler._import_uri = importUri
          if (canonicalUri !== null || importUri !== null) {
            if (importUri !== null) {
              const {
                loaded: loadedAdded,
                removed: loadedRemoved
              } = await this.load(
                resolvedKey,
                title,
                '_import_uri',
                importUri,
                true
              )
              loaded += loadedAdded
              removed += loadedRemoved
            }
            if (canonicalUri !== null) {
              var load = true
              if (
                info.encoding === 'base64' ||
                tiddler.type === 'image/svg+xml'
              ) {
                load = false
              }
              const {
                loaded: loadedAdded,
                removed: loadedRemoved
              } = await this.load(
                resolvedKey,
                title,
                'canonical_uri',
                canonicalUri,
                load
              )
              loaded += loadedAdded
              removed += loadedRemoved
            }
          }
          imported.set(title, tiddler)
          loaded += 1
        }
      }
      if (imported.size === 0) {
        this.isEmpty.push(key)
        var msg = 'Empty:'
        var field = 'Resource'
        this.getLogger().info(
          `${msg} "${field}"\n ${resolvedKey} \n from "${parentField}", "${parentTitle}"\n ${parentUrl}`
        )
        $tw.utils.alert(
          name,
          alertFailed`${msg} ${resolvedKey}">${field}</a> from "${parentField}", ${parentUrl}">${parentTitle}</a>`
        )
      }
    } catch (error) {
      this.notLoaded.push(key)
      var msg = 'Failed to Load:'
      var field = 'Resource'
      this.getLogger().info(
        `${msg} "${field}"\n ${resolvedKey} \n from "${parentField}", "${parentTitle}"\n ${parentUrl}`
      )
      this.getLogger().error(error)
      $tw.utils.alert(
        name,
        alertFailed`${msg} ${resolvedKey}">${field}</a> from "${parentField}", ${parentUrl}">${parentTitle}</a>`
      )
    }
    return {
      loaded: loaded,
      removed: removed
    }
  }

  IpfsImport.prototype.processImported = function () {
    var processed = 0
    var removed = 0
    var processedTitles = []
    for (var key of this.loaded.keys()) {
      const { resolvedKey, imported } = this.loaded.get(key)
      for (var title of imported.keys()) {
        if (processedTitles.indexOf(title) !== -1) {
          continue
        }
        const keys = []
        const tiddler = imported.get(title)
        var type = tiddler.type
        var info = $tw.config.contentTypeInfo[type]
        var canonicalUri = tiddler._canonical_uri
        canonicalUri =
          canonicalUri === undefined ||
          canonicalUri == null ||
          canonicalUri.trim() === ''
            ? null
            : canonicalUri.trim()
        var importUri = tiddler._import_uri
        importUri =
          importUri === undefined ||
          importUri == null ||
          importUri.trim() === ''
            ? null
            : importUri.trim()
        if (canonicalUri == null && importUri == null) {
          keys.push(key)
        } else if (canonicalUri == null && importUri !== null) {
          var msg = 'Missing:'
          var field = '_canonical_uri'
          this.getLogger().info(
            `${msg} "${field}" from ${title}"\n ${resolvedKey}`
          )
          $tw.utils.alert(
            name,
            alertFieldFailed`${msg} "${field}" from ${resolvedKey}">${title}</a>`
          )
        } else {
          var canonicalKey = null
          if (
            canonicalUri !== null &&
            this.notResolved.indexOf(canonicalUri) === -1
          ) {
            canonicalKey = this.resolved.get(canonicalUri)
          }
          if (canonicalKey !== undefined && canonicalKey !== null) {
            if (key === canonicalKey) {
              var msg = 'Cycle Graph:'
              var field = '_canonical_uri'
              this.getLogger().info(
                `${msg} "${field}" from ${title}"\n ${resolvedKey}`
              )
              $tw.utils.alert(
                name,
                alertFieldFailed`${msg} "${field}" from ${resolvedKey}">${title}</a>`
              )
            } else if (
              this.processCanonicalKey(
                keys,
                resolvedKey,
                title,
                canonicalKey,
                type,
                info
              )
            ) {
              var importKey = null
              if (
                importUri !== null &&
                this.notResolved.indexOf(importUri) === -1
              ) {
                importKey = this.resolved.get(importUri)
              }
              if (importKey === undefined || importKey == null) {
                keys.push(key)
              } else {
                if (canonicalKey === importKey) {
                  var msg = 'Matching:'
                  var field = '"_canonical_uri" and "_import_uri"'
                  this.getLogger().info(
                    `${msg} ${field} from "${title}"\n ${resolvedKey}`
                  )
                  $tw.utils.alert(
                    name,
                    alertFieldFailed`${msg} ${field} from ${resolvedKey}">${title}</a>`
                  )
                } else if (key === importKey) {
                  var msg = 'Cycle Graph:'
                  var field = '_import_uri'
                  this.getLogger().info(
                    `${msg} "${field}" from "${title}"\n ${resolvedKey}`
                  )
                  $tw.utils.alert(
                    name,
                    alertFieldFailed`${msg} "${field}" from ${resolvedKey}">${title}</a>`
                  )
                } else {
                  keys.push(key)
                  this.processImportKey(
                    keys,
                    resolvedKey,
                    title,
                    canonicalKey,
                    importKey
                  )
                }
              }
            }
          }
        }
        processed += keys.length
        removed += this.removeTiddlers(keys, title)
        processedTitles.push(title)
      }
    }
    return {
      processed: processed,
      removed: removed
    }
  }

  IpfsImport.prototype.processCanonicalKey = function (
    keys,
    parentResolvedKey,
    title,
    canonicalKey,
    type,
    info
  ) {
    if (info.encoding === 'base64' || type === 'image/svg+xml') {
      keys.push(canonicalKey)
      return true
    }
    if (this.notLoaded.indexOf(canonicalKey) !== -1) {
      return false
    }
    const { resolvedKey, imported } = this.loaded.get(canonicalKey)
    if (imported === undefined) {
      return false
    }
    const tiddler = imported.get(title)
    if (tiddler === undefined) {
      return false
    }
    var canonicalUri = tiddler._canonical_uri
    canonicalUri =
      canonicalUri == null ||
      canonicalUri === undefined ||
      canonicalUri.trim() === ''
        ? null
        : canonicalUri.trim()
    if (canonicalUri !== null) {
      var msg = 'Inconsistency:'
      var field = '_canonical_uri'
      this.getLogger().info(
        `${msg} "${field}" from "${title}"\n ${resolvedKey} \n and ${parentResolvedKey}`
      )
      $tw.utils.alert(
        name,
        alertConditionFailed`${msg} "${field}" from ${resolvedKey}">${title}</a> and ${parentResolvedKey}">${title}</a>`
      )
      return false
    }
    var importUri = tiddler._import_uri
    importUri =
      importUri == null || importUri === undefined || importUri.trim() === ''
        ? null
        : importUri.trim()
    if (importUri !== null) {
      var msg = 'Inconsistency:'
      var field = '_import_uri'
      this.getLogger().info(
        `${msg} "${field}" from "${title}"\n ${resolvedKey} \n and ${parentResolvedKey}`
      )
      $tw.utils.alert(
        name,
        alertConditionFailed`${msg} "${field}" from ${resolvedKey}">${title}</a> and ${parentResolvedKey}">${title}</a>`
      )
      return false
    }
    keys.push(canonicalKey)
    return true
  }

  IpfsImport.prototype.processImportKey = function (
    keys,
    parentResolvedKey,
    title,
    canonicalKey,
    importKey
  ) {
    if (this.notLoaded.indexOf(importKey) !== -1) {
      return
    }
    const { resolvedKey: importResolvedKey, imported } = this.loaded.get(
      importKey
    )
    if (imported === undefined) {
      return
    }
    const tiddler = imported.get(title)
    if (tiddler === undefined) {
      return
    }
    var targetCanonicalUri = tiddler._canonical_uri
    targetCanonicalUri =
      targetCanonicalUri == null ||
      targetCanonicalUri === undefined ||
      targetCanonicalUri.trim() === ''
        ? null
        : targetCanonicalUri.trim()
    var targetCanonicalKey = null
    if (
      targetCanonicalUri !== null &&
      this.notResolved.indexOf(targetCanonicalUri) === -1
    ) {
      targetCanonicalKey = this.resolved.get(targetCanonicalUri)
    }
    if (
      targetCanonicalKey !== undefined &&
      targetCanonicalKey !== null &&
      canonicalKey !== targetCanonicalKey
    ) {
      var msg = 'Inconsistency:'
      var field = '_canonical_uri'
      this.getLogger().info(
        `${msg} "${field}" from "${title}"\n ${importResolvedKey} \n and ${parentResolvedKey}`
      )
      $tw.utils.alert(
        name,
        alertConditionFailed`${msg} "${field}" from ${importResolvedKey}">${title}</a> and ${parentResolvedKey}">${title}</a>`
      )
      return
    }
    var nextImportUri = tiddler._import_uri
    nextImportUri =
      nextImportUri == null ||
      nextImportUri === undefined ||
      nextImportUri.trim() === ''
        ? null
        : nextImportUri.trim()
    if (targetCanonicalUri == null && nextImportUri !== null) {
      var msg = 'Missing:'
      var field = '_canonical_uri'
      this.getLogger().info(
        `${msg} "${field}" from "${title}"\n ${importResolvedKey}`
      )
      $tw.utils.alert(
        name,
        alertFieldFailed`${msg} "${field}" from ${importResolvedKey}">${title}</a>`
      )
      return
    }
    if (nextImportUri == null) {
      keys.push(importKey)
    } else {
      var nextImportKey = null
      if (
        nextImportUri !== null &&
        this.notResolved.indexOf(nextImportUri) === -1
      ) {
        nextImportKey = this.resolved.get(nextImportUri)
      }
      if (nextImportKey !== undefined && nextImportKey !== null) {
        if (canonicalKey === nextImportKey) {
          var msg = 'Matching:'
          var field = '"_canonical_uri" and "_import_uri"'
          this.getLogger().info(
            `${msg} ${field} from "${title}"\n ${importResolvedKey}`
          )
          $tw.utils.alert(
            name,
            alertFieldFailed`${msg} ${field} from ${importResolvedKey}">${title}</a>`
          )
        } else if (keys.indexOf(nextImportKey) !== -1) {
          var msg = 'Cycle Graph:'
          var field = '_import_uri'
          this.getLogger().info(
            `${msg} "${field}" from "${title}"\n ${importResolvedKey}`
          )
          $tw.utils.alert(
            name,
            alertFieldFailed`${msg} "${field}" from ${importResolvedKey}">${title}</a>`
          )
        } else {
          keys.push(importKey)
          this.processImportKey(
            keys,
            importResolvedKey,
            title,
            canonicalKey,
            nextImportKey
          )
        }
      }
    }
  }

  IpfsImport.prototype.importTiddlers = function () {
    var added = 0
    var updated = 0
    var processedTitles = []
    for (var key of this.loaded.keys()) {
      const { uri, imported } = this.loaded.get(key)
      for (var title of imported.keys()) {
        if (processedTitles.indexOf(title) !== -1) {
          continue
        }
        const tiddler = imported.get(title)
        var type = tiddler.type
        var info = $tw.config.contentTypeInfo[type]
        var canonicalUri = tiddler._canonical_uri
        canonicalUri =
          canonicalUri === undefined ||
          canonicalUri == null ||
          canonicalUri.trim() === ''
            ? null
            : canonicalUri.trim()
        var importUri = tiddler._import_uri
        importUri =
          importUri === undefined ||
          importUri == null ||
          importUri.trim() === ''
            ? null
            : importUri.trim()
        var exist = null
        if (importUri !== null) {
          exist = this.importTiddler(title, importUri)
        }
        if (
          exist == null &&
          canonicalUri !== null &&
          info.encoding !== 'base64' &&
          type !== 'image/svg+xml'
        ) {
          this.importTiddler(title, canonicalUri)
        }
        exist = this.mergeTiddler(title, uri)
        if (exist !== null) {
          const merged = this.merged.get(title)
          var type = merged.type
          var info = $tw.config.contentTypeInfo[type]
          if (info.encoding === 'base64' || type === 'image/svg+xml') {
            merged._import_uri = this.importUri
          } else {
            var canonicalUri = merged._canonical_uri
            if (canonicalUri === undefined || canonicalUri == null) {
              merged._canonical_uri = this.importUri
            } else {
              merged._canonical_uri = this.resolved.get(merged._canonical_uri)
              if (canonicalUri !== this.importUri) {
                merged._import_uri = this.importUri
              }
            }
          }
          if (exist) {
            updated += 1
          } else {
            added += 1
          }
          processedTitles.push(title)
        }
      }
    }
    return {
      added: added,
      updated: updated
    }
  }

  IpfsImport.prototype.importTiddler = function (title, uri) {
    const key = this.resolved.get(uri)
    if (key === undefined) {
      return null
    }
    const { imported } = this.loaded.get(key)
    if (imported === undefined) {
      return null
    }
    const tiddler = imported.get(title)
    if (tiddler === undefined) {
      return null
    }
    var type = tiddler.type
    var info = $tw.config.contentTypeInfo[type]
    var importUri = tiddler._import_uri
    importUri =
      importUri == null || importUri === undefined || importUri.trim() === ''
        ? null
        : importUri.trim()
    var canonicalUri = tiddler._canonical_uri
    canonicalUri =
      canonicalUri == null ||
      canonicalUri === undefined ||
      canonicalUri.trim() === ''
        ? null
        : canonicalUri.trim()
    var exist = null
    if (importUri !== null) {
      exist = this.importTiddler(title, importUri)
    }
    if (
      exist == null &&
      canonicalUri !== null &&
      info.encoding !== 'base64' &&
      type !== 'image/svg+xml'
    ) {
      this.importTiddler(title, canonicalUri)
    }
    return this.mergeTiddler(title, uri)
  }

  IpfsImport.prototype.mergeTiddler = function (title, uri) {
    var merged = null
    var currentTiddler = null
    const key = this.resolved.get(uri)
    if (key === undefined) {
      return null
    }
    const { imported } = this.loaded.get(key)
    if (imported === undefined) {
      return null
    }
    const tiddler = imported.get(title)
    if (tiddler === undefined) {
      return null
    }
    var tags = tiddler.tags !== undefined ? tiddler.tags : ''
    // Retrieve target host Tiddler
    if (this.host !== null && this.host.fields.title === title) {
      currentTiddler = this.host
    } else {
      currentTiddler = $tw.wiki.getTiddler(title)
    }
    // Retrieve or prepare merged content
    merged = this.merged.get(title)
    if (merged === undefined) {
      merged = {}
      this.merged.set(title, merged)
    }
    // Fields
    var hasModified = false
    for (var field in tiddler) {
      // Discard
      if (field === 'tags') {
        continue
      }
      if (field === 'modified') {
        hasModified = true
      }
      // Unknown from leaf to top, we keep the top modified field
      if (
        merged[field] === undefined ||
        merged[field] == null ||
        field === '_canonical_uri' ||
        field === '_import_uri' ||
        field === 'modified'
      ) {
        merged[field] = tiddler[field]
      }
    }
    if (hasModified === false) {
      merged.modified = new Date()
    }
    // Tags,
    // We use the target tiddler to manage complex tags like [[IPFS Documentation]]
    if (currentTiddler !== undefined && currentTiddler !== null) {
      var currentTags = (currentTiddler.fields.tags || []).slice(0)
      for (var i = 0; i < currentTags.length; i++) {
        var tag = currentTags[i]
        if (tags.includes(tag) === false) {
          tags = `${tags} ${tag}`
        }
      }
    }
    // IPFS tag
    if (this.isIpfs(key) && tags.includes('$:/isIpfs') === false) {
      tags = `${tags} $:/isIpfs`
    }
    // Imported tag
    if (tags.includes('$:/isImported') === false) {
      tags = `${tags} $:/isImported`
    }
    // Processed tags
    merged.tags = tags
    if (currentTiddler !== undefined && currentTiddler !== null) {
      return true
    }
    return false
  }

  exports.IpfsImport = IpfsImport
})()
