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

  /*eslint no-unused-vars: "off"*/
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
    'type',
  ]

  var IpfsTiddler = function () {
    this.once = false
  }

  IpfsTiddler.prototype.init = function () {
    // Init once
    if (this.once) {
      return
    }
    const self = this
    // Events
    $tw.wiki.addEventListener('change', function (changes) {
      return self.handleChangeEvent(changes)
    })
    $tw.rootWidget.addEventListener('tm-ipfs-pin', function (event) {
      return self.handleIpfsPin(event)
    })
    $tw.rootWidget.addEventListener('tm-ipfs-unpin', function (event) {
      return self.handleIpfsUnpin(event)
    })
    $tw.rootWidget.addEventListener('tm-refresh-tiddler', function (event) {
      return self.handleRefreshTiddler(event)
    })
    // Hooks
    $tw.hooks.addHook('th-deleting-tiddler', async function (tiddler) {
      return await self.handleDeleteTiddler(tiddler)
    })
    $tw.hooks.addHook('th-importing-file', async function (info) {
      return await self.handleImportFile(info)
    })
    $tw.hooks.addHook('th-saving-tiddler', async function (tiddler) {
      return await self.handleSaveTiddler(tiddler)
    })
    // Init once
    this.once = true
  }

  IpfsTiddler.prototype.handleChangeEvent = function (changes) {
    // Gateway preference
    const api = changes['$:/ipfs/saver/api']
    if (api !== undefined && api.modified) {
      $tw.ipfs.getLogger().info(`IPFS API: ${$tw.ipfs.getIpfsApiUrl()}`)
    }
    // Gateway preference
    const gateway = changes['$:/ipfs/saver/gateway']
    if (gateway !== undefined && gateway.modified) {
      const base = $tw.ipfs.getIpfsBaseUrl()
      if ($tw.utils.getIpfsUrlPolicy() === 'gateway') {
        $tw.ipfs.getLogger().info(`Gateway Policy: ${base}`)
      }
    }
    // Policy preference
    const policy = changes['$:/ipfs/saver/policy']
    if (policy !== undefined && policy.modified) {
      const base = $tw.ipfs.getIpfsBaseUrl()
      if ($tw.utils.getIpfsUrlPolicy() === 'origin') {
        $tw.ipfs.getLogger().info(`Origin Policy: ${base}`)
      } else {
        $tw.ipfs.getLogger().info(`Gateway Policy: ${base}`)
      }
    }
    // Pin preference
    const pin = changes['$:/ipfs/saver/pin']
    if (pin !== undefined && pin.modified) {
      if ($tw.utils.getIpfsPin()) {
        $tw.ipfs.getLogger().info('Pin current IPFS content...')
      } else {
        $tw.ipfs.getLogger().info('Do not pin current IPFS content...')
      }
    }
    // Unpin preference
    const unpin = changes['$:/ipfs/saver/unpin']
    if (unpin !== undefined && unpin.modified) {
      if ($tw.utils.getIpfsUnpin()) {
        $tw.ipfs.getLogger().info('Unpin previous IPFS content...')
      } else {
        $tw.ipfs.getLogger().info('Do not unpin previous IPFS content...')
      }
    }
    // Verbose preference
    const verbose = changes['$:/ipfs/saver/verbose']
    if (verbose !== undefined && verbose.modified) {
      if (window.log !== undefined && window.log !== null) {
        if ($tw.utils.getIpfsVerbose()) {
          window.log.setLevel('info', false)
        } else {
          window.log.setLevel('warn', false)
        }
      }
    }
  }

  IpfsTiddler.prototype.handleIpfsPin = function (event) {
    const title = event.tiddlerTitle
    const tiddler = $tw.wiki.getTiddler(title)
    // Tiddler
    if (tiddler !== undefined && title !== '$:/plugins/tiddlywiki/menubar/items/pagecontrols') {
      if (event.param) {
        // Tiddler
        for (var field in tiddler.fields) {
          if (reservedFields.indexOf(field) !== -1) {
            continue
          }
          var value = tiddler.getFieldString(field)
          value = value !== undefined && value !== null && value.trim() !== '' ? value.trim() : null
          if (value !== null) {
            this.ipfsPin(value, field)
          }
        }
        return true
      }
      return false
    }
    // Wiki
    this.ipfsPin($tw.ipfs.getDocumentUrl().toString(), 'Wiki')
    return true
  }

  IpfsTiddler.prototype.ipfsPin = function (value, field) {
    $tw.ipfs
      .resolveUrl(value, $tw.utils.getIpnsResolve(), false, true)
      .then(data => {
        const { resolvedUrl } = data
        if (resolvedUrl !== null) {
          $tw.ipfs
            .pinToIpfs(resolvedUrl.pathname)
            .then(pin => {
              if (pin !== undefined && pin !== null) {
                $tw.ipfs.removeFromPinUnpin(resolvedUrl.pathname)
                if (field !== undefined && field !== null) {
                  $tw.ipfs.getLogger().info(
                    `Pinned: "${field}"
 ${resolvedUrl.pathname}`
                  )
                  $tw.utils.alert(name, `Pinned: '${field}'`)
                }
              }
            })
            .catch(error => {
              $tw.ipfs.getLogger().error(error)
              $tw.utils.alert(name, error.message)
            })
        }
      })
      .catch(error => {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
  }

  IpfsTiddler.prototype.handleIpfsUnpin = async function (event) {
    const title = event.tiddlerTitle
    const tiddler = $tw.wiki.getTiddler(title)
    if (tiddler !== undefined && title !== '$:/plugins/tiddlywiki/menubar/items/pagecontrols') {
      const { type, info } = $tw.utils.getContentType(tiddler)
      if (event.param) {
        // Tiddler
        for (var field in tiddler.fields) {
          if (reservedFields.indexOf(field) !== -1) {
            continue
          }
          var value = tiddler.getFieldString(field)
          value = value !== undefined && value !== null && value.trim() !== '' ? value.trim() : null
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
      return false
    }
    // Wiki
    this.ipfsUnpin($tw.ipfs.getDocumentUrl().toString(), 'Wiki')
    return true
  }

  IpfsTiddler.prototype.ipfsUnpin = function (value, field) {
    field = field !== undefined && field !== null && field.trim() !== '' ? field.trim() : null
    $tw.ipfs
      .resolveUrl(value, $tw.utils.getIpnsResolve(), false, true)
      .then(data => {
        const { resolvedUrl } = data
        if (resolvedUrl !== null) {
          if (field !== null) {
          }
          $tw.ipfs
            .unpinFromIpfs(resolvedUrl.pathname)
            .then(unpin => {
              if (unpin !== undefined && unpin !== null) {
                $tw.ipfs.removeFromPinUnpin(resolvedUrl.pathname)
                if (field !== undefined && field !== null) {
                  $tw.ipfs.getLogger().info(
                    `Unpinned: "${field}
 ${resolvedUrl.pathname}`
                  )
                  $tw.utils.alert(name, `Unpinned: '${field}'`)
                }
              }
            })
            .catch(error => {
              $tw.ipfs.getLogger().error(error)
              $tw.utils.alert(name, error.message)
            })
        }
      })
      .catch(error => {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
  }

  IpfsTiddler.prototype.handleDeleteTiddler = async function (tiddler) {
    try {
      const { type, info } = $tw.utils.getContentType(tiddler)
      // Process
      var field = null
      if (info.encoding === 'base64' || type === 'image/svg+xml') {
        field = '_canonical_uri'
      } else {
        field = '_export_uri'
      }
      // Value
      var resolvedUrl = null
      const value = tiddler.getFieldString(field)
      if (value !== undefined && value !== null && value.trim() !== '') {
        try {
          var { resolvedUrl } = await $tw.ipfs.resolveUrl(value, $tw.utils.getIpnsResolve(), false, true)
        } catch (error) {
          $tw.ipfs.getLogger().error(error)
          $tw.utils.alert(name, error.message)
          return tiddler
        }
        $tw.ipfs.addToUnpin(resolvedUrl !== null ? resolvedUrl.pathname : null)
      }
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
    }
    return tiddler
  }

  IpfsTiddler.prototype.handleRefreshTiddler = function (event) {
    const title = event.tiddlerTitle
    const tiddler = $tw.wiki.getTiddler(title)
    if (tiddler === undefined || title === '$:/plugins/tiddlywiki/menubar/items/pagecontrols') {
      return false
    }
    var canonicalUri = tiddler.fields._canonical_uri
    canonicalUri = canonicalUri !== undefined && canonicalUri !== null && canonicalUri.trim() !== '' ? canonicalUri.trim() : null
    var importUri = tiddler.fields._import_uri
    importUri = importUri !== undefined && importUri !== null && importUri.trim() !== '' ? importUri.trim() : null
    // Reload
    if (canonicalUri !== null && importUri == null) {
      $tw.wiki.clearCache(title)
      const changedTiddler = $tw.utils.getChangedTiddler(title)
      $tw.rootWidget.refresh(changedTiddler)
      return true
    }
    // Import
    if (canonicalUri !== null || importUri !== null) {
      const ipfsImport = new IpfsImport()
      ipfsImport
        .import(canonicalUri, importUri, tiddler)
        .then(data => {
          if (data !== undefined && data !== null) {
            const navigator = $tw.utils.locateNavigatorWidget($tw.pageWidgetNode)
            if (navigator !== undefined && navigator !== null) {
              navigator.dispatchEvent({
                type: 'tm-ipfs-import-tiddlers',
                param: data,
              })
            }
          }
        })
        .catch(error => {
          $tw.ipfs.getLogger().error(error)
          $tw.utils.alert(name, error.message)
        })
      return true
    }
    // Refresh
    $tw.wiki.clearCache(title)
    const changedTiddler = $tw.utils.getChangedTiddler(title)
    $tw.rootWidget.refresh(changedTiddler)
    return true
  }

  IpfsTiddler.prototype.handleImportFile = async function (info) {
    const dummy = new $tw.Tiddler({
      title: $tw.wiki.generateNewTitle('Untitled'),
      type: info.type,
    })
    try {
      const ipfsImport = new IpfsImport()
      const url = URL.createObjectURL(info.file)
      try {
        const data = await ipfsImport.import(null, url, dummy)
        if (data.merged.size > 0 || data.deleted.size > 0) {
          info.callback(data)
        }
      } catch (error) {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      }
      URL.revokeObjectURL(url)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
    }
    return true
  }

  IpfsTiddler.prototype.handleSaveTiddler = async function (tiddler) {
    const oldTiddler = $tw.wiki.getTiddler(tiddler.fields.title)
    const { info } = $tw.utils.getContentType(tiddler)
    var password = tiddler.fields._password
    password = password !== undefined && password !== null && password.trim() !== '' ? password.trim() : null
    // Prepare
    var updatedTiddler = new $tw.Tiddler(tiddler)
    // Process deleted fields
    if (oldTiddler) {
      for (var field in oldTiddler.fields) {
        // Not a reserved keyword
        if (reservedFields.indexOf(field) !== -1) {
          continue
        }
        // Updated
        const discard = tiddler.fields[field]
        if (discard && tiddler.getFieldString(field)) {
          continue
        }
        // Process
        var oldResolvedUrl = null
        var oldValue = oldTiddler.getFieldString(field)
        try {
          var { resolvedUrl: oldResolvedUrl } = await $tw.ipfs.resolveUrl(oldValue, $tw.utils.getIpnsResolve(), false, true)
        } catch (error) {
          $tw.ipfs.getLogger().error(error)
          $tw.utils.alert(name, error.message)
          return tiddler
        }
        oldResolvedUrl = oldResolvedUrl !== undefined && oldResolvedUrl !== null && oldResolvedUrl.toString().trim() !== '' ? oldResolvedUrl.toString().trim() : null
        if (oldResolvedUrl !== null && field === '_canonical_uri') {
          var data = tiddler.fields.text
          try {
            if (info.encoding === 'base64') {
              data = await $tw.ipfs.loadToBase64(oldResolvedUrl, password)
            } else {
              data = await $tw.ipfs.loadToUtf8(oldResolvedUrl, password)
            }
            updatedTiddler = $tw.utils.updateTiddler({
              tiddler: updatedTiddler,
              addTags: ['$:/isAttachment', '$:/isEmbedded'],
              fields: [{ key: 'text', value: data }],
            })
            $tw.ipfs.getLogger().info(
              `Embed attachment: ${data.length}
 ${oldResolvedUrl}`
            )
          } catch (error) {
            $tw.ipfs.getLogger().error(error)
            //$tw.utils.alert(name, error.message)
            return tiddler
          }
        }
        $tw.ipfs.addToUnpin(oldResolvedUrl !== null ? oldResolvedUrl.pathname : null)
      }
    }
    // Process new and updated fields
    updatedTiddler = await this.updateIpfsTags(tiddler, oldTiddler, updatedTiddler)
    // Update
    $tw.wiki.addTiddler(updatedTiddler)
    return updatedTiddler
  }

  IpfsTiddler.prototype.updateIpfsTags = async function (tiddler, oldTiddler, updatedTiddler) {
    var canonicalUri = null
    var exportUri = null
    var importUri = null
    var canonicalIpfsCid = null
    var canonicalIpnsCid = null
    var exportIpfsCid = null
    var exportIpnsCid = null
    var importIpfsCid = null
    var importIpnsCid = null
    var updatedTiddler = updatedTiddler === undefined || updatedTiddler == null ? new $tw.Tiddler(tiddler) : updatedTiddler
    const { type, info } = $tw.utils.getContentType(tiddler)
    // Process
    for (var field in tiddler.fields) {
      // Not a reserved keyword
      if (reservedFields.indexOf(field) !== -1) {
        continue
      }
      // Process
      var ipfsCid = null
      var ipnsCid = null
      var resolvedUrl = null
      var oldResolvedUrl = null
      var value = tiddler.getFieldString(field)
      try {
        var { ipfsCid, ipnsCid, resolvedUrl } = await $tw.ipfs.resolveUrl(value, false, false, true)
      } catch (error) {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
        return tiddler
      }
      // Store
      resolvedUrl = resolvedUrl !== undefined && resolvedUrl !== null && resolvedUrl.toString().trim() !== '' ? resolvedUrl.toString().trim() : null
      if (field === '_canonical_uri') {
        canonicalUri = resolvedUrl
        canonicalIpfsCid = ipfsCid
        canonicalIpnsCid = ipnsCid
      }
      if (field === '_import_uri') {
        importUri = resolvedUrl
        importIpfsCid = ipfsCid
        importIpnsCid = ipnsCid
      }
      if (field === '_export_uri') {
        exportUri = resolvedUrl
        exportIpfsCid = ipfsCid
        exportIpnsCid = ipnsCid
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
      try {
        var { oldResolvedUrl } = await $tw.ipfs.resolveUrl(oldValue, false, false, true)
      } catch (error) {
        // We cannot resolve the previous value
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      }
      $tw.ipfs.addToPin(resolvedUrl !== null ? resolvedUrl.pathname : null)
      $tw.ipfs.addToUnpin(oldResolvedUrl !== null ? oldResolvedUrl.pathname : null)
    }
    // Tag management
    var addTags = []
    var removeTags = []
    if (canonicalUri == null && exportUri == null && importUri == null) {
      removeTags.push('$:/isExported', '$:/isImported', '$:/isIpfs')
    }
    if (canonicalIpfsCid == null && canonicalIpnsCid == null && exportIpfsCid == null && exportIpnsCid == null && importIpfsCid == null && importIpnsCid == null) {
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
        removeTags: removeTags,
      })
    }
    return updatedTiddler
  }

  exports.IpfsTiddler = IpfsTiddler
})()
