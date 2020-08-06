/*\
title: $:/plugins/ipfs/ipfs-utils.js
type: application/javascript
tags: $:/ipfs/core
module-type: utils

IPFS utils

\*/

;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

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
    if (
      typeof window === 'undefined' ||
      typeof window.navigator === 'undefined'
    ) {
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
          prefix: ''
        }),
        text: text,
        tags: [ALERT_TAG],
        component: callee
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
      title = object.getFieldString('title')
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
    if (
      updates === undefined ||
      updates == null ||
      updates.tiddler === undefined ||
      updates.tiddler == null
    ) {
      return null
    }
    // Prepare updates
    const fields = $tw.wiki.getModificationFields()
    // Tags
    fields.tags = (updates.tiddler.fields.tags || []).slice(0)
    // Process add tags
    if (
      updates.addTags !== undefined &&
      updates.addTags !== null &&
      Array.isArray(updates.addTags)
    ) {
      for (var i = 0; i < updates.addTags.length; i++) {
        const tag = updates.addTags[i]
        if (fields.tags.indexOf(tag) === -1) {
          $tw.utils.pushTop(fields.tags, tag)
        }
      }
    }
    // Process remove tags
    if (
      updates.removeTags !== undefined &&
      updates.removeTags !== null &&
      Array.isArray(updates.removeTags)
    ) {
      for (var i = 0; i < updates.removeTags.length; i++) {
        const tag = updates.removeTags[i]
        const index = fields.tags.indexOf(tag)
        if (index !== -1) {
          fields.tags.splice(index, 1)
        }
      }
    }
    // Process fields
    if (
      updates.fields !== undefined &&
      updates.fields !== null &&
      Array.isArray(updates.fields)
    ) {
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

  exports.getContentType = function (title, type) {
    type =
      type === undefined || type == null || type.trim() === ''
        ? null
        : type.trim()
    if (type == null) {
      type = 'text/vnd.tiddlywiki'
    }
    var info = $tw.config.contentTypeInfo[type]
    if (info === undefined || info == null) {
      const url = $tw.ipfs.getDocumentUrl()
      url.hash = title
      $tw.ipfs.getLogger().info(
        `Unknown Content-Type: "${type}", default: "text/vnd.tiddlywiki":
 ${url}`
      )
      type = 'text/vnd.tiddlywiki'
      info = $tw.config.contentTypeInfo[type]
    }
    return {
      type: type,
      info: info
    }
  }
})()
