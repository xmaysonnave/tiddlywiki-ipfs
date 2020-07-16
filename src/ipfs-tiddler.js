/*\
title: $:/plugins/ipfs/ipfs-tiddler.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Tiddler

\*/

;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  const IpfsImport = require('$:/plugins/ipfs/ipfs-import.js').IpfsImport

  const name = 'ipfs-tiddler'

  /*
   * https://tiddlywiki.com/#TiddlerFields
   * $:/core/modules/server/routes/get-tiddler.js
   * TODO: expose it as Tiddler ??
   */
  const reservedFields = [
    'bag',
    'caption',
    'class',
    'color',
    'description',
    'created',
    'creator',
    'fields',
    'footer',
    'hide-body',
    'icon',
    '_is_skinny',
    'library',
    'list',
    'list-after',
    'list-before',
    'modified',
    'modifier',
    'name',
    'plugin-priority',
    'plugin-type',
    'permissions',
    'recipe',
    'revision',
    // "source",
    'subtitle',
    'tags',
    'text',
    // "url",
    'throttle.refresh',
    'toc-link',
    'title',
    'type'
  ]

  var IpfsTiddler = function () {
    this.once = false
  }

  IpfsTiddler.prototype.getLogger = function () {
    if (window.logger !== undefined && window.logger !== null) {
      return window.logger
    }
    return console
  }

  IpfsTiddler.prototype.init = function () {
    // Init once
    if (this.once) {
      return
    }
    const self = this
    // Wiki
    $tw.wiki.addEventListener('change', function (changes) {
      return self.handleChangeEvent(changes)
    })
    // Hook
    $tw.hooks.addHook('th-deleting-tiddler', async function (tiddler) {
      return await self.handleDeleteTiddler(tiddler)
    })
    $tw.hooks.addHook('th-importing-tiddler', function (tiddler) {
      return self.handleFileImport(tiddler)
    })
    $tw.hooks.addHook('th-saving-tiddler', async function (tiddler) {
      return await self.handleSaveTiddler(tiddler)
    })
    // Widget
    $tw.rootWidget.addEventListener('tm-ipfs-pin', function (event) {
      return self.handleIpfsPin(event)
    })
    $tw.rootWidget.addEventListener('tm-refresh-tiddler', function (event) {
      return self.handleRefreshTiddler(event)
    })
    $tw.rootWidget.addEventListener('tm-ipfs-unpin', function (event) {
      return self.handleIpfsUnpin(event)
    })
    // Init once
    this.once = true
  }

  IpfsTiddler.prototype.handleChangeEvent = function (changes) {
    // Gateway preference
    const gateway = changes['$:/ipfs/saver/gateway']
    if (gateway !== undefined && gateway.modified) {
      const base = $tw.ipfs.getIpfsBaseUrl()
      if ($tw.utils.getIpfsUrlPolicy() === 'gateway') {
        this.getLogger().info(
          `Gateway Relative URL:
 ${base}`
        )
      }
    }
    // Policy preference
    const policy = changes['$:/ipfs/saver/policy']
    if (policy !== undefined && policy.modified) {
      const base = $tw.ipfs.getIpfsBaseUrl()
      if ($tw.utils.getIpfsUrlPolicy() === 'origin') {
        this.getLogger().info(`Origin base URL: ${base}`)
      } else {
        this.getLogger().info(`Gateway base URL: ${base}`)
      }
    }
    // Unpin preference
    const unpin = changes['$:/ipfs/saver/unpin']
    if (unpin !== undefined && unpin.modified) {
      if ($tw.utils.getIpfsUnpin()) {
        this.getLogger().info('Unpin previous IPFS content...')
      } else {
        this.getLogger().info('Do not unpin previous IPFS content...')
      }
    }
    // Verbose preference
    const verbose = changes['$:/ipfs/saver/verbose']
    if (verbose !== undefined && verbose.modified) {
      if (window.logger !== undefined && window.logger !== null) {
        if ($tw.utils.getIpfsVerbose()) {
          window.logger.setLevel('info', false)
        } else {
          window.logger.setLevel('warn', false)
        }
      }
    }
  }

  IpfsTiddler.prototype.handleIpfsPin = function (event) {
    const title = event.tiddlerTitle
    const tiddler = $tw.wiki.getTiddler(title)
    if (event.param !== undefined && event.param !== null) {
      // Tiddler
      for (var field in tiddler.fields) {
        if (reservedFields.indexOf(field) !== -1) {
          continue
        }
        var value = tiddler.getFieldString(field)
        value =
          value === undefined || value == null || value.trim() === ''
            ? null
            : value.trim()
        if (value !== null) {
          this.ipfsPin(value, field)
        }
      }
      return true
    }
    // Wiki
    this.ipfsPin($tw.ipfs.getDocumentUrl().toString(), 'Wiki')
    return true
  }

  IpfsTiddler.prototype.ipfsPin = function (value, field) {
    const self = this
    $tw.ipfs
      .resolveUrl(true, true, value)
      .then(data => {
        const { cid, resolvedUrl } = data
        if (resolvedUrl !== null && cid !== null) {
          self.getLogger().info(
            `Pinning: "${field}"
 ${resolvedUrl}`
          )
          $tw.ipfs
            .pinToIpfs(cid)
            .then(data => {
              if (data) {
                $tw.ipfs.removeFromPinUnpin(cid, resolvedUrl)
                $tw.utils.alert(
                  name,
                  `Successfully Pinned : <a rel="noopener noreferrer" target="_blank" href="${resolvedUrl}">${field}</a>`
                )
              }
            })
            .catch(error => {
              self.getLogger().error(error)
              $tw.utils.alert(name, error.message)
            })
        }
      })
      .catch(error => {
        self.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
  }

  IpfsTiddler.prototype.handleIpfsUnpin = async function (event) {
    const title = event.tiddlerTitle
    const tiddler = $tw.wiki.getTiddler(title)
    const { type, info } = $tw.utils.getContentType(title, tiddler.fields.type)
    if (event.param !== undefined && event.param !== null) {
      // Tiddler
      for (var field in tiddler.fields) {
        if (reservedFields.indexOf(field) !== -1) {
          continue
        }
        var value = tiddler.getFieldString(field)
        value =
          value === undefined || value == null || value.trim() === ''
            ? null
            : value.trim()
        if (value !== null) {
          if (info.encoding !== 'base64' && type !== 'image/svg+xml') {
            if (field === '_canonical_uri' || field === '_import_uri') {
              continue
            }
          }
          this.ipfsUnpin(value, field)
        }
      }
      return true
    }
    // Wiki
    this.ipfsUnpin($tw.ipfs.getDocumentUrl().toString(), 'Wiki')
    return true
  }

  IpfsTiddler.prototype.ipfsUnpin = function (value, field) {
    value =
      value === undefined || value == null || value.trim() === ''
        ? null
        : value.trim()
    if (value == null) {
      return
    }
    field =
      field === undefined || field == null || field.trim() === ''
        ? null
        : field.trim()
    if (field == null) {
      return
    }
    const self = this
    $tw.ipfs
      .resolveUrl(true, true, value)
      .then(data => {
        const { cid, resolvedUrl } = data
        if (resolvedUrl !== null && cid !== null) {
          self.getLogger().info(
            `Unpinning: "${field}
 ${resolvedUrl}`
          )
          if ($tw.utils.getIpfsUnpin()) {
            $tw.ipfs
              .unpinFromIpfs(cid)
              .then(data => {
                if (data !== undefined && data !== null) {
                  $tw.ipfs.removeFromPinUnpin(cid, resolvedUrl)
                  $tw.utils.alert(
                    name,
                    `Successfully Unpinned : <a rel="noopener noreferrer" target="_blank" href="${resolvedUrl}">${field}</a>`
                  )
                }
              })
              .catch(error => {
                self.getLogger().error(error)
                $tw.utils.alert(name, error.message)
              })
          }
        }
      })
      .catch(error => {
        self.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
  }

  IpfsTiddler.prototype.handleDeleteTiddler = async function (tiddler) {
    try {
      const { type, info } = $tw.utils.getContentType(
        tiddler.fields.title,
        tiddler.fields.type
      )
      // Process
      var field = null
      if (info.encoding === 'base64' || type === 'image/svg+xml') {
        field = '_canonical_uri'
      } else {
        field = '_export_uri'
      }
      // Value
      var url = null
      const value = tiddler.getFieldString(field)
      if (value !== undefined && value !== null && value !== '') {
        // URL or not
        try {
          url = $tw.ipfs.normalizeUrl(value)
        } catch (error) {
          // Ignore
        }
        // Process
        if (url !== undefined && url !== null) {
          const { cid } = $tw.ipfs.decodeCid(url)
          // Request to unpin
          if ($tw.utils.getIpfsUnpin() && cid !== null) {
            $tw.ipfs.requestToUnpin(cid)
          }
        }
      }
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
    }
    return tiddler
  }

  IpfsTiddler.prototype.handleFileImport = function (tiddler) {
    // Update tiddler
    const addition = $tw.wiki.getModificationFields()
    addition.title = tiddler.fields.title
    addition.tags = (tiddler.fields.tags || []).slice(0)
    // Add isAttachment tag
    if (addition.tags.indexOf('$:/isAttachment') === -1) {
      $tw.utils.pushTop(addition.tags, '$:/isAttachment')
    }
    // Add isEmbedded tag
    if (addition.tags.indexOf('$:/isEmbedded') === -1) {
      $tw.utils.pushTop(addition.tags, '$:/isEmbedded')
    }
    return new $tw.Tiddler(tiddler, addition)
  }

  IpfsTiddler.prototype.handleRefreshTiddler = function (event) {
    const self = this
    const title = event.tiddlerTitle
    const tiddler = $tw.wiki.getTiddler(title)
    const { type, info } = $tw.utils.getContentType(title, tiddler.fields.type)
    var canonicalUri = tiddler.getFieldString('_canonical_uri')
    canonicalUri =
      canonicalUri === undefined ||
      canonicalUri == null ||
      canonicalUri.trim() === ''
        ? null
        : canonicalUri.trim()
    var importUri = tiddler.getFieldString('_import_uri')
    importUri =
      importUri === undefined || importUri == null || importUri.trim() === ''
        ? null
        : importUri.trim()
    // Reload Attachment
    if (
      (info.encoding === 'base64' || type === 'image/svg+xml') &&
      canonicalUri !== null &&
      importUri == null
    ) {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: '' }]
      })
      $tw.wiki.addTiddler(updatedTiddler)
      return true
    }
    // Async Import
    if (
      type === 'text/vnd.tiddlywiki' &&
      (canonicalUri !== null || importUri !== null)
    ) {
      var ipfsImport = new IpfsImport()
      ipfsImport.import(canonicalUri, importUri, tiddler).catch(error => {
        self.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
    } else {
      $tw.wiki.clearCache(title)
      const changedTiddler = $tw.utils.getChangedTiddler(title)
      $tw.rootWidget.refresh(changedTiddler)
    }
    return true
  }

  IpfsTiddler.prototype.handleSaveTiddler = async function (tiddler) {
    const oldTiddler = $tw.wiki.getTiddler(tiddler.fields.title)
    const { type, info } = $tw.utils.getContentType(
      tiddler.fields.title,
      tiddler.fields.type
    )
    // Prepare
    var updatedTiddler = new $tw.Tiddler(tiddler)
    // Process deleted fields
    if (oldTiddler !== undefined && oldTiddler !== null) {
      for (var field in oldTiddler.fields) {
        // Not a reserved keyword
        if (reservedFields.indexOf(field) !== -1) {
          continue
        }
        // Updated
        const discard = tiddler.fields[field]
        if (
          discard !== undefined &&
          discard !== null &&
          tiddler.getFieldString(field) !== undefined
        ) {
          continue
        }
        // Process
        var oldCid = null
        var oldIpnsKey = null
        var oldNormalizedUrl = null
        var oldResolvedUrl = null
        var oldValue = oldTiddler.getFieldString(field)
        try {
          var {
            cid: oldCid,
            ipnsKey: oldIpnsKey,
            normalizedUrl: oldNormalizedUrl,
            resolvedUrl: oldResolvedUrl
          } = await $tw.ipfs.resolveUrl(false, true, oldValue)
        } catch (error) {
          this.getLogger().error(error)
          $tw.utils.alert(name, error.message)
          return tiddler
        }
        oldResolvedUrl =
          oldResolvedUrl === undefined ||
          oldResolvedUrl == null ||
          oldResolvedUrl.toString().trim() === ''
            ? null
            : oldResolvedUrl.toString().trim()
        if (oldResolvedUrl !== null && field === '_canonical_uri') {
          var data = tiddler.getFieldString('text')
          // Attachment
          if (info.encoding === 'base64' || type === 'image/svg+xml') {
            // Embed
            try {
              if (info.encoding === 'base64') {
                data = await $tw.ipfs.loadToBase64(oldResolvedUrl)
              } else {
                data = await $tw.ipfs.loadToUtf8(oldResolvedUrl)
              }
              updatedTiddler = $tw.utils.updateTiddler({
                tiddler: updatedTiddler,
                addTags: ['$:/isAttachment', '$:/isEmbedded'],
                fields: [{ key: 'text', value: data }]
              })
              this.getLogger().info(
                `Embed attachment: ${data.length}
 ${oldResolvedUrl}`
              )
            } catch (error) {
              this.getLogger().error(error)
              $tw.utils.alert(name, error.message)
              return tiddler
            }
          }
        }
        $tw.ipfs.requestToUnpin(oldCid, oldIpnsKey, oldNormalizedUrl)
      }
    }
    var canonicalUri = null
    var exportUri = null
    var importUri = null
    var canonicalCid = null
    var exportCid = null
    var importCid = null
    // Process new and updated fields
    for (var field in tiddler.fields) {
      // Not a reserved keyword
      if (reservedFields.indexOf(field) !== -1) {
        continue
      }
      // Process
      var cid = null
      var ipnsKey = null
      var normalizedUrl = null
      var resolvedUrl = null
      var value = tiddler.getFieldString(field)
      try {
        var {
          cid,
          ipnsKey,
          normalizedUrl,
          resolvedUrl
        } = await $tw.ipfs.resolveUrl(false, true, value)
      } catch (error) {
        this.getLogger().error(error)
        $tw.utils.alert(name, error.message)
        return tiddler
      }
      // Store
      resolvedUrl =
        resolvedUrl === undefined ||
        resolvedUrl == null ||
        resolvedUrl.toString().trim() === ''
          ? null
          : resolvedUrl.toString().trim()
      if (field === '_canonical_uri') {
        canonicalUri = resolvedUrl
        canonicalCid = cid
      }
      if (field === '_import_uri') {
        importUri = resolvedUrl
        importCid = cid
      }
      if (field === '_export_uri') {
        exportUri = resolvedUrl
        exportCid = cid
      }
      // Previous values if any
      var oldValue = null
      if (oldTiddler !== undefined && oldTiddler !== null) {
        oldValue = oldTiddler.getFieldString(field)
      }
      // Process new or updated
      if (value === oldValue) {
        continue
      }
      var oldCid = null
      var oldIpnsKey = null
      var oldNormalizedUrl = null
      try {
        var {
          cid: oldCid,
          ipnsKey: oldIpnsKey,
          normalizedUrl: oldNormalizedUrl
        } = await $tw.ipfs.resolveUrl(false, true, oldValue)
      } catch (error) {
        // We cannot resolve the previous value
        this.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      }
      // Process _canonical_uri
      if (field === '_canonical_uri') {
        updatedTiddler = $tw.utils.updateTiddler({
          tiddler: updatedTiddler,
          fields: [{ key: 'text', value: '' }]
        })
      }
      $tw.ipfs.requestToPin(cid, ipnsKey, normalizedUrl)
      $tw.ipfs.requestToUnpin(oldCid, oldIpnsKey, oldNormalizedUrl)
    }
    // Tag management
    var addTags = []
    var removeTags = []
    if (canonicalUri == null && exportUri == null && importUri == null) {
      removeTags.push('$:/isExported', '$:/isImported', '$:/isIpfs')
    }
    if (canonicalCid == null && exportCid == null && importCid == null) {
      if (removeTags.indexOf('$:/isIpfs') === -1) {
        removeTags.push('$:/isIpfs')
      }
    } else {
      addTags.push('$:/isIpfs')
    }
    if (canonicalUri !== null) {
      // Attachment
      if (info.encoding === 'base64' || type === 'image/svg+xml') {
        if (addTags.indexOf('$:/isAttachment') === -1) {
          addTags.push('$:/isAttachment')
        }
        if (removeTags.indexOf('$:/isEmbedded') === -1) {
          removeTags.push('$:/isEmbedded')
        }
        if (importUri !== null) {
          if (addTags.indexOf('$:/isImported') === -1) {
            addTags.push('$:/isImported')
          }
        } else {
          if (removeTags.indexOf('$:/isImported') === -1) {
            removeTags.push('$:/isImported')
          }
        }
        // Others
      } else {
        if (removeTags.indexOf('$:/isAttachment') === -1) {
          removeTags.push('$:/isAttachment')
        }
        if (removeTags.indexOf('$:/isEmbedded') === -1) {
          removeTags.push('$:/isEmbedded')
        }
        if (addTags.indexOf('$:/isImported') === -1) {
          addTags.push('$:/isImported')
        }
      }
    } else {
      // Attachment
      if (info.encoding === 'base64' || type === 'image/svg+xml') {
        if (addTags.indexOf('$:/isAttachment') === -1) {
          addTags.push('$:/isAttachment')
        }
        if (addTags.indexOf('$:/isEmbedded') === -1) {
          addTags.push('$:/isEmbedded')
        }
        // Others
      } else {
        if (removeTags.indexOf('$:/isAttachment') === -1) {
          removeTags.push('$:/isAttachment')
        }
        if (removeTags.indexOf('$:/isEmbedded') === -1) {
          removeTags.push('$:/isEmbedded')
        }
      }
      if (importUri !== null) {
        if (addTags.indexOf('$:/isImported') === -1) {
          addTags.push('$:/isImported')
        }
      } else {
        if (removeTags.indexOf('$:/isImported') === -1) {
          removeTags.push('$:/isImported')
        }
      }
    }
    if (exportUri !== null) {
      if (addTags.indexOf('$:/isExported') === -1) {
        addTags.push('$:/isExported')
      }
    } else {
      if (removeTags.indexOf('$:/isExported') === -1) {
        removeTags.push('$:/isExported')
      }
    }
    if (addTags.length > 0 || removeTags.length > 0) {
      updatedTiddler = $tw.utils.updateTiddler({
        tiddler: updatedTiddler,
        addTags: addTags,
        removeTags: removeTags
      })
    }
    $tw.wiki.addTiddler(updatedTiddler)
    return updatedTiddler
  }

  exports.IpfsTiddler = IpfsTiddler
})()
