/*\
title: $:/plugins/ipfs/utils/ipfs-utils.js
type: application/javascript
tags: $:/ipfs/core
module-type: utils

IPFS utils

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  /*eslint no-unused-vars:"off"*/
  const ipfsUtilsName = 'ipfs-utils'
  const ipfsKeyword = 'ipfs'

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

  exports.isTiddlyWikiReservedWord = function (value) {
    return reservedFields.indexOf(value) !== -1
  }

  /*eslint no-unused-vars: "off"*/
  const ipfsReservedFields = [
    '_canonical_uri',
    '_alt_canonical_uri',
    '_canonical_uri_ipfs',
    '_alt_canonical_uri_ipfs',
    '_compress',
    '_encryption_public_key',
    '_export_uri',
    '_export_uri_ipfs',
    '_import_uri',
    '_alt_import_uri',
    '_import_uri_ipfs',
    '_alt_import_uri_ipfs',
    '_password',
    '_sandbox_tokens',
    '_sign',
  ]

  exports.isIpfsReservedWord = function (value) {
    return ipfsReservedFields.indexOf(value) !== -1
  }

  /**
   * $:/core/modules/utils/logger.js
   *
   * TiddlyWiki created by Jeremy Ruston, (jeremy [at] jermolene [dot] com)
   *
   * Copyright (c) 2004-2007, Jeremy Ruston
   * Copyright (c) 2007-2018, UnaMesa Association
   * Copyright (c) 2019-2020, Blue Light
   * All rights reserved.
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * * Redistributions of source code must retain the above copyright notice, this
   *   list of conditions and the following disclaimer.
   *
   * * Redistributions in binary form must reproduce the above copyright notice,
   *   this list of conditions and the following disclaimer in the documentation
   *   and/or other materials provided with the distribution.
   *
   * * Neither the name of the copyright holder nor the names of its
   *   contributors may be used to endorse or promote products derived from
   *   this software without specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 'AS IS'
   * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
   * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   */

  /*
   * from $:/core/modules/utils/logger.js
   **/
  exports.alert = function (callee, text) {
    if (typeof window === 'undefined' || typeof window.navigator === 'undefined') {
      return
    }
    const ALERT_TAG = '$:/tags/Alert'
    // Prepare the text of the alert
    // var text = Array.prototype.join.call(arguments," ");
    // Check if there is an existing alert with the same text and the same component
    var existingAlerts = $tw.wiki.getTiddlersWithTag(ALERT_TAG)
    var alertFields
    var existingCount
    $tw.utils.each(existingAlerts, function (title) {
      var tiddler = $tw.wiki.getTiddler(title)
      if (tiddler.fields.text === text && tiddler.fields.component === callee && tiddler.fields.modified && (!alertFields || tiddler.fields.modified < alertFields.modified)) {
        alertFields = $tw.utils.extend({}, tiddler.fields)
      }
    })
    if (alertFields) {
      existingCount = alertFields.count || 1
    } else {
      alertFields = {
        title: $tw.wiki.generateNewTitle('$:/temp/alerts/alert', {
          prefix: '',
        }),
        text: text,
        tags: [ALERT_TAG],
        component: callee,
      }
      existingCount = 0
    }
    alertFields.modified = new Date()
    if (++existingCount > 1) {
      alertFields.count = existingCount
    } else {
      alertFields.count = undefined
    }
    $tw.wiki.addTiddler(new $tw.Tiddler(alertFields))
  }

  // Edition build
  exports.getIpfsEditionBuild = function () {
    if (globalThis.document) {
      var metatags = globalThis.document.getElementsByTagName('meta')
      for (var t = 0; t < metatags.length; t++) {
        var m = metatags[t]
        if (m.name === 'ipfs-edition-build') {
          return m.content
        }
      }
    }
    return ''
  }

  // Edition version
  exports.getIpfsEditionVersion = function () {
    if (globalThis.document) {
      var metatags = globalThis.document.getElementsByTagName('meta')
      for (var t = 0; t < metatags.length; t++) {
        var m = metatags[t]
        if (m.name === 'ipfs-edition-version') {
          return m.content
        }
      }
    }
    return ''
  }

  exports.getChangedTiddler = function (object) {
    // Holder
    const changedTiddler = Object.create(null)
    // Check
    if (object === undefined || object == null) {
      return changedTiddler
    }
    if (object instanceof $tw.Tiddler === false && typeof object !== 'string') {
      return changedTiddler
    }
    // Retrieve title
    var title = null
    if (typeof object === 'string') {
      title = object
    }
    if (object instanceof $tw.Tiddler) {
      title = object.fields.title
    }
    // Check
    if (title === undefined || title == null) {
      return changedTiddler
    }
    // Process title
    changedTiddler[title] = Object.create(null)
    // Done
    return changedTiddler
  }

  exports.updateTiddler = function (updates) {
    // Is there anything to do
    if (updates === undefined || updates == null || updates.tiddler === undefined || updates.tiddler == null) {
      return null
    }
    // Prepare updates
    const fields = $tw.wiki.getModificationFields()
    // Tags
    fields.tags = (updates.tiddler.fields.tags || []).slice(0)
    // Process add tags
    if (updates.addTags !== undefined && updates.addTags !== null && Array.isArray(updates.addTags)) {
      for (var i = 0; i < updates.addTags.length; i++) {
        const tag = updates.addTags[i]
        if (fields.tags.indexOf(tag) === -1) {
          $tw.utils.pushTop(fields.tags, tag)
        }
      }
    }
    // Process remove tags
    if (updates.removeTags !== undefined && updates.removeTags !== null && Array.isArray(updates.removeTags)) {
      for (var i = 0; i < updates.removeTags.length; i++) {
        const tag = updates.removeTags[i]
        const index = fields.tags.indexOf(tag)
        if (index !== -1) {
          fields.tags.splice(index, 1)
        }
      }
    }
    // Process fields
    if (updates.fields !== undefined && updates.fields !== null && Array.isArray(updates.fields)) {
      for (var i = 0; i < updates.fields.length; i++) {
        const field = updates.fields[i]
        if (field.key !== undefined && field.key !== null) {
          fields[field.key] = field.value
        }
      }
    }
    // Update tiddler
    return new $tw.Tiddler(updates.tiddler, fields)
  }

  exports.getContentType = function (tiddler) {
    tiddler = tiddler !== undefined && tiddler !== null ? tiddler : null
    if (tiddler == null) {
      throw new Error('Undefined Tiddler...')
    }
    var type = tiddler.fields.type !== undefined && tiddler.fields.type !== null && tiddler.fields.type.trim() !== '' ? tiddler.fields.type.trim() : null
    if (type == null) {
      type = 'text/vnd.tiddlywiki'
    }
    var info = $tw.config.contentTypeInfo[type]
    if (info === undefined || info == null) {
      throw new Error(`Unknown Content-Type: "${type}" from Tidler: "${tiddler.fields.title}"`)
    }
    return {
      type: type,
      info: info,
    }
  }

  exports.loadTiddlers = function (text) {
    if (text) {
      var json = JSON.parse(text)
      var tiddlers = []
      for (var title in json) {
        if (title !== '$:/isEncrypted' && title !== '$:/isCompressed') {
          tiddlers.push(json[title])
        }
      }
      return tiddlers
    }
    return null
  }

  exports.processUpdatedTiddler = async function (tiddler, oldTiddler, updatedTiddler) {
    var canonicalUri = null
    var exportUri = null
    var importUri = null
    var isIpfs = false
    var updatedTiddler = updatedTiddler === undefined || updatedTiddler == null ? new $tw.Tiddler(tiddler) : updatedTiddler
    const { type, info } = $tw.utils.getContentType(tiddler)
    // Process fields
    for (var field in tiddler.fields) {
      const value = tiddler.getFieldString(field)
      // Resolve value
      var ipfsCid = null
      var ipnsCid = null
      var resolvedUrl = null
      try {
        var { ipfsCid, ipnsCid, resolvedUrl } = await $tw.ipfs.resolveUrl(value, false, false, true)
      } catch (error) {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(ipfsUtilsName, error.message)
        continue
      }
      // isIpfs
      if (ipfsCid !== null || ipnsCid !== null) {
        isIpfs = true
      }
      // Store special fields
      resolvedUrl = resolvedUrl !== undefined && resolvedUrl !== null && resolvedUrl.toString().trim() !== '' ? resolvedUrl.toString().trim() : null
      if (field === '_canonical_uri') {
        canonicalUri = resolvedUrl
      }
      if (field === '_import_uri') {
        importUri = resolvedUrl
      }
      if (field === '_export_uri') {
        exportUri = resolvedUrl
      }
      if (oldTiddler !== undefined && oldTiddler !== null) {
        if (value === oldTiddler.getFieldString(field)) {
          continue
        }
        var oldResolvedUrl = null
        try {
          var { resolvedUrl: oldResolvedUrl } = await $tw.ipfs.resolveUrl(oldTiddler.getFieldString(field), false, false, true)
        } catch (error) {
          // We cannot resolve the previous value
          $tw.ipfs.getLogger().error(error)
          $tw.utils.alert(ipfsUtilsName, error.message)
        }
        $tw.ipfs.addToPin(resolvedUrl !== null ? resolvedUrl.pathname : null)
        $tw.ipfs.addToUnpin(oldResolvedUrl !== null ? oldResolvedUrl.pathname : null)
      }
    }
    // Tag management
    var addTags = []
    var removeTags = []
    if (canonicalUri == null && exportUri == null && importUri == null) {
      removeTags.push('$:/isExported', '$:/isImported', '$:/isIpfs')
    }
    if (isIpfs) {
      addTags.push('$:/isIpfs')
    } else {
      if (removeTags.indexOf('$:/isIpfs') === -1) {
        removeTags.push('$:/isIpfs')
      }
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

  exports.exportToIpfs = async function (tiddler, content, fields, field, ipfsPath, incomingName) {
    // Check
    if (tiddler === undefined || tiddler == null) {
      return false
    }
    if (content === undefined || content == null) {
      return false
    }
    fields = fields !== undefined && fields !== null ? fields : []
    ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.trim() !== '' ? ipfsPath.trim() : '/'
    incomingName = incomingName !== undefined && incomingName !== null && incomingName.trim() !== '' ? incomingName.trim() : ''
    if (tiddler.fields[field] !== undefined && tiddler.fields[field].endsWith('/')) {
      incomingName = `${tiddler.fields[field]}${incomingName}`
    } else if (tiddler.fields[field] !== undefined) {
      incomingName = `${tiddler.fields[field]}/${incomingName}`
    } else {
      incomingName = `/${incomingName}`
    }
    var account = null
    var addedCid = null
    var addedPath = ''
    var addedUri = null
    var ipfsCid = null
    var ipnsCid = null
    var ipnsKey = null
    var normalizedUrl = null
    var web3 = null
    try {
      var { ipfsCid, ipnsCid, ipnsKey, normalizedUrl } = await $tw.ipfs.resolveUrl(tiddler.fields[field], true, true, true)
      if (ipnsCid == null && normalizedUrl !== null && (normalizedUrl.hostname.endsWith('.eth') || normalizedUrl.hostname.endsWith('.eth.link'))) {
        var ensDomain = normalizedUrl.hostname
        if (normalizedUrl.hostname.endsWith('.eth.link')) {
          ensDomain = normalizedUrl.hostname.substring(0, normalizedUrl.hostname.indexOf('.link'))
        }
        var { account, web3 } = await $tw.ipfs.getEnabledWeb3Provider()
        const isOwner = await $tw.ipfs.isEnsOwner(ensDomain, web3, account)
        if (isOwner === false) {
          const err = new Error('Unauthorized Account...')
          err.name = 'OwnerError'
          throw err
        }
      }
    } catch (error) {
      if (error.name !== 'OwnerError') {
        $tw.ipfs.getLogger().error(error)
      }
      $tw.utils.alert(ipfsUtilsName, error.message)
      return false
    }
    $tw.ipfs.getLogger().info(`Uploading: ${content.length}
 path: ${ipfsPath}`)
    try {
      const upload = [
        {
          path: `${ipfsPath}`,
          content: content,
        },
      ]
      var { cid: addedCid, path: addedPath, uri: addedUri } = await $tw.ipfs.addContentToIpfs(upload)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(ipfsUtilsName, error.message)
      return false
    }
    if (ipnsCid !== null) {
      if (ipnsKey !== null) {
        $tw.utils.alert(ipfsUtilsName, `Publishing IPNS key: ${ipnsKey}`)
        $tw.ipfs
          .pinToIpfs(addedPath)
          .then(pin => {
            $tw.ipfs
              .publishIpnsKey(addedCid, ipnsCid, ipnsKey)
              .then(dummy => {
                $tw.utils.alert(ipfsUtilsName, `Published IPNS key: ${ipnsKey}`)
                if ($tw.utils.getIpfsUnpin()) {
                  $tw.ipfs
                    .unpinFromIpfs(`/${ipfsKeyword}/${ipfsCid}`)
                    .then(unpin => {
                      if (unpin !== undefined && unpin !== null) {
                        $tw.ipfs.removeFromPinUnpin(`/${ipfsKeyword}/${ipfsCid}`)
                      }
                    })
                    .catch(error => {
                      $tw.ipfs.getLogger().error(error)
                      $tw.utils.alert(ipfsUtilsName, error.message)
                    })
                }
                // Update tiddler
                fields.push({ key: field, value: incomingName })
                const updatedTiddler = $tw.utils.updateTiddler({
                  tiddler: tiddler,
                  fields: fields,
                })
                $tw.utils.processUpdatedTiddler(updatedTiddler).then(updatedTiddler => {
                  $tw.wiki.addTiddler(updatedTiddler)
                })
              })
              .catch(error => {
                $tw.ipfs.getLogger().error(error)
                $tw.utils.alert(ipfsUtilsName, error.message)
                $tw.ipfs.addToUnpin(addedPath)
                // Update tiddler
                fields.push({ key: field, value: incomingName })
                fields.push({ key: `${field}_ipfs`, value: addedUri })
                const updatedTiddler = $tw.utils.updateTiddler({
                  tiddler: tiddler,
                  fields: fields,
                })
                $tw.utils.processUpdatedTiddler(updatedTiddler).then(updatedTiddler => {
                  $tw.wiki.addTiddler(updatedTiddler)
                })
              })
          })
          .catch(error => {
            $tw.ipfs.getLogger().error(error)
            $tw.utils.alert(ipfsUtilsName, error.message)
            // Update tiddler
            fields.push({ key: field, value: incomingName })
            fields.push({ key: `${field}_ipfs`, value: addedUri })
            const updatedTiddler = $tw.utils.updateTiddler({
              tiddler: tiddler,
              fields: fields,
            })
            $tw.utils.processUpdatedTiddler(updatedTiddler).then(updatedTiddler => {
              $tw.wiki.addTiddler(updatedTiddler)
            })
          })
      }
    } else if (normalizedUrl !== null && normalizedUrl.hostname.endsWith('.eth.link')) {
      $tw.ipfs
        .pinToIpfs(addedPath)
        .then(pin => {
          $tw.ipfs
            .setContentHash(normalizedUrl.hostname, `/${ipfsKeyword}/${addedCid}`, web3, account)
            .then(dummy => {
              if ($tw.utils.getIpfsUnpin()) {
                $tw.ipfs
                  .unpinFromIpfs(addedPath)
                  .then(unpin => {
                    if (unpin !== undefined && unpin !== null) {
                      $tw.ipfs.removeFromPinUnpin(addedPath)
                    }
                  })
                  .catch(error => {
                    $tw.ipfs.getLogger().error(error)
                    $tw.utils.alert(ipfsUtilsName, error.message)
                  })
              }
              // Update tiddler
              fields.push({ key: field, value: incomingName })
              const updatedTiddler = $tw.utils.updateTiddler({
                tiddler: tiddler,
                fields: fields,
              })
              $tw.utils.processUpdatedTiddler(updatedTiddler).then(updatedTiddler => {
                $tw.wiki.addTiddler(updatedTiddler)
              })
            })
            .catch(error => {
              if (error.name !== 'OwnerError' && error.name !== 'RejectedUserRequest' && error.name !== 'UnauthorizedUserAccount') {
                $tw.ipfs.getLogger().error(error)
              }
              $tw.utils.alert(ipfsUtilsName, error.message)
              $tw.ipfs.addToUnpin(addedPath)
              // Update tiddler
              fields.push({ key: field, value: incomingName })
              fields.push({ key: `${field}_ipfs`, value: addedUri })
              const updatedTiddler = $tw.utils.updateTiddler({
                tiddler: tiddler,
                fields: fields,
              })
              $tw.utils.processUpdatedTiddler(updatedTiddler).then(updatedTiddler => {
                $tw.wiki.addTiddler(updatedTiddler)
              })
            })
        })
        .catch(error => {
          $tw.ipfs.getLogger().error(error)
          $tw.utils.alert(ipfsUtilsName, error.message)
          // Update tiddler
          fields.push({ key: field, value: incomingName })
          fields.push({ key: `${field}_ipfs`, value: addedUri })
          var updatedTiddler = $tw.utils.updateTiddler({
            tiddler: tiddler,
            fields: fields,
          })
          $tw.utils.processUpdatedTiddler(updatedTiddler).then(updatedTiddler => {
            $tw.wiki.addTiddler(updatedTiddler)
          })
        })
    } else {
      if (field === '_canonical_uri' && tiddler.fields._canonical_uri !== undefined && tiddler.fields._canonical_uri !== null && tiddler.fields._canonical_uri.trim() !== '') {
        fields.push({ key: field, value: incomingName })
      } else {
        fields.push({ key: field, value: addedUri })
      }
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: fields,
      })
      $tw.utils.processUpdatedTiddler(updatedTiddler).then(updatedTiddler => {
        $tw.wiki.addTiddler(updatedTiddler)
      })
    }
    return true
  }

  exports.locateNavigatorWidget = function (element) {
    if (element.parseTreeNode.type === 'navigator') {
      return element
    }
    if (element.children) {
      for (var i = 0; i < element.children.length; i++) {
        const found = $tw.utils.locateNavigatorWidget(element.children[i])
        if (found) {
          return found
        }
      }
    }
    return null
  }

  exports.exportTiddlersAsJson = async function (tiddlers, exportUri, spaces) {
    var json
    var data = []
    var spaces = spaces !== undefined && spaces !== null ? spaces : $tw.config.preferences.jsonSpaces
    // Process Tiddlers
    if (tiddlers) {
      for (var t = 0; t < tiddlers.length; t++) {
        // Load Tiddler
        var current = $tw.wiki.getTiddler(tiddlers[t])
        // Process
        var fields = {}
        // Process fields
        for (var field in current.fields) {
          // Discard
          if (field === 'tags' || field === '_export_uri') {
            continue
          }
          var ipfsCid = null
          var ipnsIdentifier = null
          var ipfsPath = null
          var fieldValue = current.getFieldString(field)
          if (field === '_canonical_uri' && fieldValue === exportUri) {
            continue
          }
          if (field === '_import_uri' && fieldValue === exportUri) {
            continue
          }
          try {
            var { ipfsCid, ipnsIdentifier, ipfsPath } = $tw.ipfs.getIpfsIdentifier(fieldValue)
          } catch (error) {
            $tw.ipfs.getLogger().error(error)
            $tw.utils.alert(ipfsUtilsName, error.message)
            return null
          }
          if (ipnsIdentifier !== null) {
            fieldValue = `ipns://${ipnsIdentifier}${ipfsPath}`
          } else if (ipfsCid !== null) {
            fieldValue = `ipfs://${ipfsCid}${ipfsPath}`
          }
          // Store field
          fields[field] = fieldValue
        }
        // Process tags
        var tags = current.fields.tags
        if (tags !== undefined && tags !== null) {
          var tagValues = ''
          for (var i = 0; i < tags.length; i++) {
            const tag = tags[i]
            // Discard
            if (tag === '$:/isExported' || tag === '$:/isImported') {
              continue
            }
            tagValues = (tagValues.length === 0 ? '[[' : `${tagValues} [[`) + `${tag}]]`
          }
          // Store tags
          fields.tags = tagValues
        }
        // Store
        data.push(fields)
      }
      json = JSON.stringify(data, null, spaces)
    }
    return json
  }

  exports.exportTiddler = async function (tiddler, child) {
    // Check
    if (tiddler === undefined || tiddler == null) {
      const error = new Error('Unknown Tiddler...')
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(ipfsUtilsName, error.message)
      return {
        content: null,
        extension: null,
      }
    }
    const title = tiddler.fields.title
    // Filter
    var exportFilter = `[[${tiddler.fields.title}]]`
    // Child filters
    if (child) {
      // Links
      const linked = $tw.wiki.getTiddlerLinks(title)
      $tw.ipfs.getLogger().info(`Found ${linked.length} Tiddler link(s)...`)
      // Transcluded
      const transcluded = $tw.utils.transcludeContent(title)
      $tw.ipfs.getLogger().info(`Found ${transcluded.length} transcluded Tiddler reference(s)...`)
      const filtered = linked.concat(transcluded)
      // Process filtered content
      for (var i = 0; i < filtered.length; i++) {
        if (exportFilter.includes(`[[${filtered[i]}]]`) === false) {
          exportFilter = `${exportFilter} [[${filtered[i]}]]`
        }
      }
    }
    var content = null
    var extension = null
    var type = null
    if (child || $tw.utils.getIpfsExport() === 'json') {
      content = await $tw.utils.exportTiddlersAsJson($tw.wiki.filterTiddlers(exportFilter), tiddler.fields._export_uri)
      if (content !== null) {
        const navigator = $tw.utils.locateNavigatorWidget($tw.pageWidgetNode)
        if (navigator) {
          navigator.dispatchEvent({
            target: tiddler.fields.title,
            type: 'tm-export-tiddlers',
            param: content,
          })
          return {
            content: null,
            extension: null,
          }
        }
      }
    } else if ($tw.utils.getIpfsExport() === 'static') {
      extension = '.html'
      type = 'text/html'
      const options = {
        downloadType: 'text/plain',
        method: 'download',
        template: '$:/core/templates/exporters/StaticRiver',
        variables: {
          exportFilter: exportFilter,
        },
      }
      content = $tw.wiki.renderTiddler('text/plain', '$:/core/templates/exporters/StaticRiver', options)
    } else {
      extension = '.tid'
      const options = {
        downloadType: 'text/plain',
        method: 'download',
        template: '$:/core/templates/exporters/TidFile',
        variables: {
          exportFilter: exportFilter,
        },
      }
      content = $tw.wiki.renderTiddler('text/plain', '$:/core/templates/exporters/TidFile', options)
    }
    if (content !== undefined && content !== null) {
      return {
        content: await $tw.ipfs.processContent(tiddler, content, 'utf8', type != null ? type : 'text/plain'),
        extension: extension,
      }
    }
    return {
      content: null,
      extension: null,
    }
  }

  exports.transcludeContent = function (title) {
    var tiddlers = []
    // Build a transclude widget
    var transclude = $tw.wiki.makeTranscludeWidget(title)
    // Build a fake document element
    const container = $tw.fakeDocument.createElement('div')
    // Transclude
    transclude.render(container, null)
    // Process children
    $tw.utils.locateTiddlers(transclude, tiddlers)
    // Return
    return tiddlers
  }

  exports.locateTiddlers = function (transclude, tiddlers) {
    // Children lookup
    for (var i = 0; i < transclude.children.length; i++) {
      // Current child
      const child = transclude.children[i]
      if (child.variables !== undefined && child.variables !== null) {
        // Locate Tiddler
        const currentTiddler = 'currentTiddler'
        const current = child.variables[currentTiddler]
        if (current !== undefined && current !== null && current.value !== undefined && current.value !== null) {
          if (tiddlers.indexOf(current.value) === -1) {
            tiddlers.push(current.value)
          }
        }
      }
      // Process children
      $tw.utils.locateTiddlers(child, tiddlers)
    }
  }
})()
