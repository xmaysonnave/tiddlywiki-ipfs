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

  const ipfsUtilsName = 'ipfs-utils'

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
    var self = this
    $tw.utils.each(existingAlerts, function (title) {
      var tiddler = $tw.wiki.getTiddler(title)
      if (
        tiddler.fields.text === text &&
        tiddler.fields.component === self.componentName &&
        tiddler.fields.modified &&
        (!alertFields || tiddler.fields.modified < alertFields.modified)
      ) {
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

  // Browser build
  exports.extractIpfsBrowserBuild = function () {
    var metatags = document.getElementsByTagName('meta')
    for (var t = 0; t < metatags.length; t++) {
      var m = metatags[t]
      if (m.name === 'ipfs-browser-build') {
        return m.content
      }
    }
    return null
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

  exports.exportToIpfs = async function (target, content) {
    // Check
    if (content === undefined || content == null) {
      return false
    }
    var account = null
    var added = null
    var cid = null
    var fields = []
    var ipnsKey = null
    var ipnsName = null
    var normalizedUrl = null
    var web3 = null
    const ipfsKeyword = 'ipfs'
    var exportUri = target.fields._export_uri
    try {
      var { cid, ipnsKey, ipnsName, normalizedUrl } = await $tw.ipfs.resolveUrl(true, true, exportUri)
      if (normalizedUrl !== null && normalizedUrl.hostname.endsWith('.eth')) {
        var { account, web3 } = await $tw.ipfs.getEnabledWeb3Provider()
        const isOwner = await $tw.ipfs.isOwner(normalizedUrl.hostname, web3, account)
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
    $tw.ipfs.getLogger().info(`Uploading Tiddler: ${content.length}`)
    try {
      var { cid: added } = await $tw.ipfs.addToIpfs(content)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(ipfsUtilsName, error.message)
      return false
    }
    // Prepare New value
    fields.push({ key: '_export_uri', value: `${ipfsKeyword}://${added}` })
    var updatedTiddler = $tw.utils.updateTiddler({
      tiddler: target,
      addTags: ['$:/isExported', '$:/isIpfs'],
      fields: fields,
    })
    $tw.wiki.addTiddler(updatedTiddler)
    if (ipnsKey !== null && ipnsName !== null) {
      $tw.utils.alert(ipfsUtilsName, `Publishing IPNS name: ${ipnsName}`)
      $tw.ipfs
        .pinToIpfs(`/ipfs/${added}`)
        .then(pin => {
          $tw.ipfs
            .publishIpnsName(added, ipnsKey, ipnsName)
            .then(dummy => {
              fields.push({ key: '_export_uri', value: exportUri })
              const updatedTiddler = $tw.utils.updateTiddler({
                tiddler: target,
                addTags: ['$:/isExported', '$:/isIpfs'],
                fields: fields,
              })
              $tw.wiki.addTiddler(updatedTiddler)
              $tw.utils.alert(ipfsUtilsName, `Successfully Published IPNS name: ${ipnsName}`)
              if ($tw.utils.getIpfsUnpin()) {
                $tw.ipfs
                  .unpinFromIpfs(`/ipfs/${cid}`)
                  .then(unpin => {
                    if (unpin !== undefined && unpin !== null) {
                      $tw.ipfs.removeFromPinUnpin(`/ipfs/${cid}`)
                    }
                  })
                  .catch(error => {
                    $tw.ipfs.getLogger().error(error)
                    $tw.utils.alert(ipfsUtilsName, error.message)
                  })
              }
            })
            .catch(error => {
              $tw.ipfs.getLogger().error(error)
              $tw.utils.alert(ipfsUtilsName, error.message)
              $tw.ipfs.requestToUnpin(`/ipfs/${added}`)
            })
        })
        .catch(error => {
          $tw.ipfs.getLogger().error(error)
          $tw.utils.alert(ipfsUtilsName, error.message)
        })
    } else if (normalizedUrl !== null && normalizedUrl.hostname.endsWith('.eth')) {
      $tw.utils.alert(ipfsUtilsName, `Publishing to ENS: ${normalizedUrl.hostname}`)
      $tw.ipfs
        .pinToIpfs(`/ipfs/${added}`)
        .then(pin => {
          $tw.ipfs
            .setContentHash(normalizedUrl.hostname, `/${ipfsKeyword}/${added}`, web3, account)
            .then(dummy => {
              fields.push({ key: '_export_uri', value: exportUri })
              const updatedTiddler = $tw.utils.updateTiddler({
                tiddler: target,
                addTags: ['$:/isExported', '$:/isIpfs'],
                fields: fields,
              })
              $tw.wiki.addTiddler(updatedTiddler)
              $tw.utils.alert(ipfsUtilsName, 'Successfully Published to ENS...')
              if ($tw.utils.getIpfsUnpin()) {
                $tw.ipfs
                  .unpinFromIpfs(`/ipfs/${cid}`)
                  .then(unpin => {
                    if (unpin !== undefined && unpin !== null) {
                      $tw.ipfs.removeFromPinUnpin(`/ipfs/${cid}`)
                    }
                  })
                  .catch(error => {
                    $tw.ipfs.getLogger().error(error)
                    $tw.utils.alert(ipfsUtilsName, error.message)
                  })
              }
            })
            .catch(error => {
              if (error.name !== 'OwnerError' && error.name !== 'RejectedUserRequest' && error.name !== 'UnauthorizedUserAccount') {
                $tw.ipfs.getLogger().error(error)
              }
              $tw.utils.alert(ipfsUtilsName, error.message)
              $tw.ipfs.requestToUnpin(`/ipfs/${added}`)
            })
        })
        .catch(error => {
          $tw.ipfs.getLogger().error(error)
          $tw.utils.alert(ipfsUtilsName, error.message)
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
    const ipnsKeyword = 'ipns'
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
          var ipnsKey = null
          var fieldValue = current.getFieldString(field)
          if (field === '_canonical_uri' && fieldValue === exportUri) {
            continue
          }
          if (field === '_import_uri' && fieldValue === exportUri) {
            continue
          }
          try {
            var { ipnsKey } = await $tw.ipfs.resolveUrl(false, false, fieldValue)
          } catch (error) {
            $tw.ipfs.getLogger().error(error)
            $tw.utils.alert(ipfsUtilsName, error.message)
            return null
          }
          // IPNS
          if (ipnsKey !== null) {
            fieldValue = `${ipnsKeyword}://${ipnsKey}`
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
})()
