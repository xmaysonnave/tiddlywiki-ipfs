/*\
title: $:/plugins/ipfs/ipfs-action.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Action

\*/

;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  const fileProtocol = 'file:'
  const ipfsKeyword = 'ipfs'
  const ipnsKeyword = 'ipns'

  const name = 'ipfs-action'

  var IpfsAction = function () {
    this.once = false
    this.console = false
    this.ipnsName = $tw.utils.getIpfsIpnsName()
    this.ipnsKey = $tw.utils.getIpfsIpnsKey()
  }

  IpfsAction.prototype.getLogger = function () {
    if (window.logger !== undefined && window.logger !== null) {
      return window.logger
    }
    return console
  }

  IpfsAction.prototype.init = function () {
    // Init once
    if (this.once) {
      return
    }
    const self = this
    // Widget
    $tw.rootWidget.addEventListener('tm-ipfs-export', async function (event) {
      return await self.handleExportToIpfs(event, false)
    })
    $tw.rootWidget.addEventListener('tm-ipfs-export-content', async function (
      event
    ) {
      return await self.handleExportToIpfs(event, true)
    })
    $tw.rootWidget.addEventListener('tm-ipns-fetch', async function (event) {
      return await self.handleFetchIpnsKey(event)
    })
    $tw.rootWidget.addEventListener('tm-ipns-generate', async function (event) {
      return await self.handleGenerateIpnsKey(event)
    })
    $tw.rootWidget.addEventListener('tm-console-mobile', async function (
      event
    ) {
      return await self.handleMobileConsole(event)
    })
    $tw.rootWidget.addEventListener(
      'tm-ipfs-export-attachment',
      async function (event) {
        return await self.handleExportAttachmentToIpfs(event)
      }
    )
    $tw.rootWidget.addEventListener('tm-ipns-publish', async function (event) {
      return await self.handlePublishToIpns(event)
    })
    $tw.rootWidget.addEventListener('tm-ipns-remove', async function (event) {
      return await self.handleRemoveIpnsKey(event)
    })
    $tw.rootWidget.addEventListener('tm-ipns-rename', async function (event) {
      return await self.handleRenameIpnsName(event)
    })
    $tw.rootWidget.addEventListener('tm-ipns-resolve-and-open', async function (
      event
    ) {
      return await self.handleResolveIpnsKeyAndOpen(event)
    })
    // Init once
    this.once = true
  }

  IpfsAction.prototype.handleExportToIpfs = async function (event, child) {
    var account = null
    var added = null
    var cid = null
    var fields = []
    var ipnsKey = null
    var ipnsName = null
    var normalizedUrl = null
    var web3 = null
    const self = this
    const title = event.tiddlerTitle
    var tiddler = $tw.wiki.getTiddler(title)
    var exportUri = tiddler.getFieldString('_export_uri')
    try {
      var { cid, ipnsKey, ipnsName, normalizedUrl } = await $tw.ipfs.resolveUrl(
        true,
        true,
        exportUri
      )
      if (normalizedUrl !== null && normalizedUrl.hostname.endsWith('.eth')) {
        var { account, web3 } = await $tw.ipfs.getEnabledWeb3Provider()
        const isOwner = await $tw.ipfs.isOwner(
          normalizedUrl.hostname,
          web3,
          account
        )
        if (isOwner === false) {
          const err = new Error('Unauthorized Account...')
          err.name = 'OwnerError'
          throw err
        }
      }
    } catch (error) {
      if (error.name !== 'OwnerError') {
        this.getLogger().error(error)
      }
      $tw.utils.alert(name, error.message)
      return false
    }
    // Retrieve content
    const content = await this.exportTiddler(child, exportUri, tiddler)
    // Check
    if (content == null) {
      return false
    }
    this.getLogger().info(`Uploading Tiddler: ${content.length}`)
    try {
      var { added } = await $tw.ipfs.addToIpfs(content)
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    // Prepare New value
    fields.push({ key: '_export_uri', value: `/${ipfsKeyword}/${added}` })
    var tiddler = $tw.wiki.getTiddler(title)
    var updatedTiddler = $tw.utils.updateTiddler({
      tiddler: tiddler,
      addTags: ['$:/isExported', '$:/isIpfs'],
      fields: fields
    })
    $tw.wiki.addTiddler(updatedTiddler)
    if (ipnsKey !== null) {
      $tw.utils.alert(name, `Publishing IPNS name: ${ipnsName}`)
      $tw.ipfs
        .pinToIpfs(added)
        .then(data => {
          $tw.ipfs
            .publishIpnsName(added, ipnsKey, ipnsName)
            .then(data => {
              fields.push({ key: '_export_uri', value: exportUri })
              tiddler = $tw.utils.updateTiddler({
                tiddler: tiddler,
                addTags: ['$:/isExported', '$:/isIpfs'],
                fields: fields
              })
              $tw.wiki.addTiddler(tiddler)
              $tw.utils.alert(
                name,
                `Successfully Published IPNS name: ${ipnsName}`
              )
              if ($tw.utils.getIpfsUnpin()) {
                $tw.ipfs
                  .unpinFromIpfs(cid)
                  .then(data => {
                    if (data !== undefined && data !== null) {
                      $tw.ipfs.removeFromPinUnpin(cid, normalizedUrl)
                    }
                  })
                  .catch(error => {
                    self.getLogger().error(error)
                    $tw.utils.alert(name, error.message)
                  })
              }
            })
            .catch(error => {
              $tw.ipfs.requestToUnpin(added)
              self.getLogger().error(error)
              $tw.utils.alert(name, error.message)
            })
        })
        .catch(error => {
          self.getLogger().error(error)
          $tw.utils.alert(name, error.message)
        })
    } else if (
      normalizedUrl !== null &&
      normalizedUrl.hostname.endsWith('.eth')
    ) {
      $tw.utils.alert(name, `Publishing to ENS: ${normalizedUrl.hostname}`)
      $tw.ipfs
        .pinToIpfs(added)
        .then(data => {
          $tw.ipfs
            .setContentHash(normalizedUrl.hostname, added, web3, account)
            .then(data => {
              fields.push({ key: '_export_uri', value: exportUri })
              tiddler = $tw.utils.updateTiddler({
                tiddler: tiddler,
                addTags: ['$:/isExported', '$:/isIpfs'],
                fields: fields
              })
              $tw.wiki.addTiddler(tiddler)
              $tw.utils.alert(name, 'Successfully Published to ENS...')
              if ($tw.utils.getIpfsUnpin()) {
                $tw.ipfs
                  .unpinFromIpfs(cid)
                  .then(data => {
                    if (data !== undefined && data !== null) {
                      $tw.ipfs.removeFromPinUnpin(cid, normalizedUrl)
                    }
                  })
                  .catch(error => {
                    self.getLogger().error(error)
                    $tw.utils.alert(name, error.message)
                  })
              }
            })
            .catch(error => {
              $tw.ipfs.requestToUnpin(added)
              if (
                error.name !== 'OwnerError' &&
                error.name !== 'RejectedUserRequest' &&
                error.name !== 'UnauthorizedUserAccount'
              ) {
                self.getLogger().error(error)
              }
              $tw.utils.alert(name, error.message)
            })
        })
        .catch(error => {
          self.getLogger().error(error)
          $tw.utils.alert(name, error.message)
        })
    }
    return true
  }

  IpfsAction.prototype.handleExportAttachmentToIpfs = async function (event) {
    const title = event.tiddlerTitle
    var tiddler = $tw.wiki.getTiddler(title)
    const { type, info } = $tw.utils.getContentType(title, tiddler.fields.type)
    var added = null
    if (info.encoding !== 'base64' && type !== 'image/svg+xml') {
      $tw.utils.alert(name, 'This Tiddler do not contain any Attachment...')
      return false
    }
    // Do not process if _canonical_uri is set and the text field is empty
    const canonicalUri = tiddler.getFieldString('_canonical_uri')
    if (
      canonicalUri !== undefined &&
      canonicalUri !== null &&
      canonicalUri.trim() !== ''
    ) {
      $tw.utils.alert(name, 'Attachment is already published...')
      return false
    }
    try {
      const content = this.getAttachmentContent(tiddler)
      if (content == null) {
        return false
      }
      this.getLogger().info(`Uploading attachment: ${content.length} bytes`)
      var { added } = await $tw.ipfs.addToIpfs(content)
      $tw.ipfs.requestToPin(added)
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    var addTags = []
    var removeTags = []
    if ($tw.crypto.hasPassword()) {
      addTags = ['$:/isAttachment', '$:/isIpfs']
      removeTags = ['$:/isEmbedded']
    } else {
      addTags = ['$:/isAttachment', '$:/isIpfs']
      removeTags = ['$:/isEmbedded']
    }
    // Update
    tiddler = $tw.utils.updateTiddler({
      tiddler: tiddler,
      addTags: addTags,
      removeTags: removeTags,
      fields: [
        { key: 'text', value: '' },
        { key: '_canonical_uri', value: `/${ipfsKeyword}/${added}` }
      ]
    })
    $tw.wiki.addTiddler(tiddler)
    return true
  }

  IpfsAction.prototype.getAttachmentContent = function (tiddler) {
    const { type, info } = $tw.utils.getContentType(
      tiddler.fields.title,
      tiddler.fields.type
    )
    if (info.encoding !== 'base64' && type !== 'image/svg+xml') {
      $tw.utils.alert(name, 'Unsupported Tiddler Content-Type...')
      return null
    }
    var content = tiddler.getFieldString('text')
    if (content === undefined || content == null || content === '') {
      $tw.utils.alert(name, 'Empty attachment content...')
      return null
    }
    const compressed = $tw.wiki.getTiddler('$:/isCompressed')
    const encrypted = $tw.wiki.getTiddler('$:/isEncrypted')
    if (encrypted.fields.text === 'yes') {
      try {
        if (compressed.fields.text === 'yes') {
          content = $tw.compress.deflate(content)
          content = $tw.crypto.encrypt(content)
          content = JSON.stringify({ pako: content })
        } else {
          // https://github.com/xmaysonnave/tiddlywiki-ipfs/issues/9
          if (info.encoding === 'base64') {
            content = atob(content)
          }
          content = $tw.crypto.encrypt(content)
        }
        content = $tw.ipfs.StringToUint8Array(content)
      } catch (error) {
        this.getLogger().error(error)
        $tw.utils.alert(
          name,
          'Failed to process encrypted Attachment content...'
        )
        return null
      }
    } else {
      try {
        if (compressed.fields.text === 'yes') {
          content = $tw.compress.deflate(content)
          content = JSON.stringify({ pako: content })
          content = $tw.ipfs.StringToUint8Array(content)
        } else {
          if (info.encoding === 'base64') {
            content = $tw.ipfs.Base64ToUint8Array(content)
          } else {
            content = $tw.ipfs.StringToUint8Array(content)
          }
        }
      } catch (error) {
        this.getLogger().error(error)
        $tw.utils.alert(name, 'Failed to process Attachment content...')
        return null
      }
    }
    return content
  }

  IpfsAction.prototype.handleRenameIpnsName = async function (event) {
    var ipnsKey = null
    var ipnsName = $tw.utils.getIpfsIpnsName()
    ipnsName =
      ipnsName === undefined || ipnsName == null || ipnsName.trim() === ''
        ? null
        : ipnsName.trim()
    if (ipnsName == null) {
      $tw.utils.alert(name, 'Undefined IPNS name....')
      return false
    }
    if (this.ipnsName == null || this.ipnsName === ipnsName) {
      $tw.utils.alert(name, 'Nothing to rename....')
      return false
    }
    try {
      var { ipnsKey } = await $tw.ipfs.renameIpnsName(this.ipnsName, ipnsName)
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/key')
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: ipnsKey }]
      })
      $tw.wiki.addTiddler(tiddler)
    }
    this.ipnsKey = ipnsKey
    this.ipnsName = ipnsName
    return true
  }

  IpfsAction.prototype.handleGenerateIpnsKey = async function (event) {
    var ipnsKey = null
    var ipnsName = $tw.utils.getIpfsIpnsName()
    ipnsName =
      ipnsName === undefined || ipnsName == null || ipnsName.trim() === ''
        ? null
        : ipnsName.trim()
    if (ipnsName == null) {
      $tw.utils.alert(name, 'Undefined IPNS name....')
      return false
    }
    try {
      var ipnsKey = await $tw.ipfs.generateIpnsKey(ipnsName)
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/key')
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: ipnsKey }]
      })
      $tw.wiki.addTiddler(tiddler)
    }
    this.ipnsKey = ipnsKey
    this.ipnsName = ipnsName
    return true
  }

  IpfsAction.prototype.handleRemoveIpnsKey = async function (event) {
    var ipnsKey = null
    var normalizedUrl = null
    const self = this
    var ipnsName = $tw.utils.getIpfsIpnsName()
    ipnsName =
      ipnsName === undefined || ipnsName == null || ipnsName.trim() === ''
        ? null
        : ipnsName.trim()
    if (ipnsName == null) {
      $tw.utils.alert(name, 'Undefined IPNS name....')
      return false
    }
    try {
      var { ipnsKey, normalizedUrl } = await $tw.ipfs.getIpnsIdentifiers(
        ipnsName
      )
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    // Async
    $tw.ipfs
      .requestToUnpin(null, ipnsKey, normalizedUrl)
      .then(data => {
        $tw.ipfs
          .removeIpnsKey(ipnsName)
          .then(data => {
            $tw.utils.alert(name, 'Succesfully removed Ipns key....')
          })
          .catch(error => {
            self.getLogger().error(error)
            $tw.utils.alert(name, error.message)
          })
      })
      .catch(error => {
        self.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/name')
    if (tiddler !== undefined) {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: '' }]
      })
      $tw.wiki.addTiddler(updatedTiddler)
    }
    tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/key')
    if (tiddler !== undefined) {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: '' }]
      })
      $tw.wiki.addTiddler(updatedTiddler)
    }
    this.ipnsName = null
    this.ipnsKey = null
    return true
  }

  IpfsAction.prototype.handleFetchIpnsKey = async function (event) {
    var ipnsKey = null
    var ipnsName = $tw.utils.getIpfsIpnsName()
    ipnsName =
      ipnsName === undefined || ipnsName == null || ipnsName.trim() === ''
        ? null
        : ipnsName.trim()
    if (ipnsName == null) {
      $tw.utils.alert(name, 'Undefined IPNS name....')
      return false
    }
    try {
      var { ipnsKey } = await $tw.ipfs.getIpnsIdentifiers(ipnsName)
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/key')
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: ipnsKey }]
      })
      $tw.wiki.addTiddler(tiddler)
      this.ipnsKey = ipnsKey
    }
    this.ipnsName = ipnsName
    return true
  }

  IpfsAction.prototype.handleResolveIpnsKeyAndOpen = async function (event) {
    var ipnsKey = null
    var resolvedUrl = null
    var ipnsName = $tw.utils.getIpfsIpnsName()
    ipnsName =
      ipnsName === undefined || ipnsName == null || ipnsName.trim() === ''
        ? null
        : ipnsName.trim()
    if (ipnsName == null) {
      $tw.utils.alert(name, 'Undefined IPNS name....')
      return false
    }
    try {
      var { ipnsKey, resolvedUrl } = await $tw.ipfs.resolveUrl(
        true,
        false,
        `/${ipnsKeyword}/${ipnsName}`
      )
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/key')
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: ipnsKey }]
      })
      this.ipnsKey = ipnsKey
      $tw.wiki.addTiddler(tiddler)
    }
    this.ipnsName = ipnsName
    window.open(resolvedUrl.toString(), '_blank', 'noopener,noreferrer')
    return true
  }

  IpfsAction.prototype.handleMobileConsole = async function (event) {
    // Show or Hide
    if (typeof window.eruda !== 'undefined') {
      if (this.console === false) {
        window.eruda.show()
        window.eruda.show('console')
        this.console = true
      } else {
        window.eruda.hide()
        this.console = false
      }
      $tw.rootWidget.refresh(
        $tw.utils.getChangedTiddler('$:/core/ui/Buttons/ipfs/console/mobile')
      )
      return true
    }
    // Load mobile console
    try {
      // Load eruda
      await $tw.ipfs.ipfsBundle.ipfsLoader.loadErudaLibrary()
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    const erudaContainer = window.document.createElement('div')
    window.document.body.appendChild(erudaContainer)
    window.eruda.init({
      container: erudaContainer,
      tool: ['console'],
      useShadowDom: true,
      autoScale: true
    })
    // Inherit font
    erudaContainer.style.fontFamily = 'inherit'
    // Preserve user preference if any, default is 80
    if (window.eruda.get().config.get('displaySize') === 80) {
      window.eruda.get().config.set('displaySize', 40)
    }
    // Preserve user preference if any, default is 0.95
    if (window.eruda.get().config.get('transparency') === 0.95) {
      window.eruda.get().config.set('transparency', 1)
    }
    // Hide Eruda button
    if (window.eruda._shadowRoot !== undefined) {
      const btn = window.eruda._shadowRoot.querySelector('.eruda-entry-btn')
      if (btn !== undefined) {
        btn.style.display = 'none'
      }
    }
    // Init Logger
    window.logger = window.logger.getLogger('eruda')
    if ($tw.utils.getIpfsVerbose()) {
      window.logger.setLevel('info', false)
    } else {
      window.logger.setLevel('warn', false)
    }
    // Log
    window.logger.info('Mobile console has been loaded...')
    // Show
    window.eruda.show()
    window.eruda.show('console')
    this.console = true
    $tw.rootWidget.refresh(
      $tw.utils.getChangedTiddler('$:/core/ui/Buttons/ipfs/console/mobile')
    )
    return true
  }

  IpfsAction.prototype.handlePublishToIpns = async function (event) {
    var cid = null
    var ipnsKey = null
    var wikiCid = null
    var wikiIpnsKey = null
    const self = this
    const wiki = $tw.ipfs.getDocumentUrl()
    if (wiki.protocol === fileProtocol) {
      $tw.utils.alert(name, 'Undefined IPFS identifier...')
      return false
    }
    if (wiki.pathname === '/') {
      $tw.utils.alert(name, 'Unknown IPFS identifier...')
      return false
    }
    var ipnsName = $tw.utils.getIpfsIpnsName()
    ipnsName =
      ipnsName === undefined || ipnsName == null || ipnsName.trim() === ''
        ? null
        : ipnsName.trim()
    if (ipnsName == null) {
      $tw.utils.alert(name, 'Undefined IPNS name....')
      return false
    }
    try {
      var { cid, ipnsKey } = await $tw.ipfs.resolveUrl(
        true,
        false,
        `/ipns/${ipnsName}`
      )
      var { cid: wikiCid, ipnsKey: wikiIpnsKey } = await $tw.ipfs.resolveUrl(
        true,
        true,
        wiki
      )
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    if (wikiIpnsKey !== null && wikiIpnsKey === ipnsKey) {
      $tw.utils.alert(name, 'Default IPNS key matches current IPNS key....')
      return false
    }
    $tw.utils.alert(name, 'Publishing IPNS name: ' + ipnsName)
    $tw.ipfs
      .publishIpnsName(wikiCid, ipnsKey, ipnsName)
      .then(data => {
        $tw.ipfs.requestToUnpin(cid)
        $tw.utils.alert(name, 'Successfully Published IPNS name: ' + ipnsName)
      })
      .catch(error => {
        self.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
    return true
  }

  IpfsAction.prototype.exportTiddlersAsJson = async function (
    exportFilter,
    exportUri,
    spaces
  ) {
    var tiddlers = $tw.wiki.filterTiddlers(exportFilter)
    var spaces =
      spaces === undefined ? $tw.config.preferences.jsonSpaces : spaces
    var data = []
    // Process Tiddlers
    for (var t = 0; t < tiddlers.length; t++) {
      // Load Tiddler
      var tiddler = $tw.wiki.getTiddler(tiddlers[t])
      // Process
      var fields = {}
      // Process fields
      for (var field in tiddler.fields) {
        // Discard
        if (field === 'tags' || field === '_export_uri') {
          continue
        }
        var ipnsKey = null
        var fieldValue = tiddler.getFieldString(field)
        if (field === '_canonical_uri' && fieldValue === exportUri) {
          continue
        }
        if (field === '_import_uri' && fieldValue === exportUri) {
          continue
        }
        try {
          var { ipnsKey } = await $tw.ipfs.resolveUrl(false, false, fieldValue)
        } catch (error) {
          this.getLogger().error(error)
          $tw.utils.alert(name, error.message)
          return null
        }
        // IPNS
        if (ipnsKey !== null) {
          fieldValue = `/${ipnsKeyword}/${ipnsKey}`
        }
        // Store field
        fields[field] = fieldValue
      }
      // Process tags
      var tags = tiddler.fields.tags
      if (tags !== undefined && tags !== null) {
        var tagValues = ''
        for (var i = 0; i < tags.length; i++) {
          const tag = tags[i]
          // Discard
          if (tag === '$:/isExported' || tag === '$:/isImported') {
            continue
          }
          tagValues =
            (tagValues.length === 0 ? '[[' : `${tagValues} [[`) + `${tag}]]`
        }
        // Store tags
        fields.tags = tagValues
      }
      // Store
      data.push(fields)
    }
    return JSON.stringify(data, null, spaces)
  }

  IpfsAction.prototype.exportTiddler = async function (
    child,
    exportUri,
    tiddler
  ) {
    // Check
    if (tiddler === undefined || tiddler == null) {
      const error = new Error('Unknown Tiddler...')
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return null
    }
    // Title
    const title = tiddler.getFieldString('title')
    // Filter
    var exportFilter = `[[${tiddler.fields.title}]]`
    // Child filters
    if (child) {
      // Links
      const linked = $tw.wiki.getTiddlerLinks(title)
      this.getLogger().info(`Found ${linked.length} Tiddler link(s)...`)
      // Transcluded
      const transcluded = this.transcludeContent(title)
      this.getLogger().info(
        `Found ${transcluded.length} transcluded Tiddler reference(s)...`
      )
      const filtered = linked.concat(transcluded)
      // Process filtered content
      for (var i = 0; i < filtered.length; i++) {
        if (exportFilter.includes(`[[${filtered[i]}]]`) === false) {
          exportFilter = `${exportFilter} [[${filtered[i]}]]`
        }
      }
    }
    var content = null
    if (child || $tw.utils.getIpfsExport() === 'json') {
      content = await this.exportTiddlersAsJson(exportFilter, exportUri)
    } else if ($tw.utils.getIpfsExport() === 'static') {
      // Export Tiddler as Static River
      const options = {
        downloadType: 'text/plain',
        method: 'download',
        template: '$:/core/templates/exporters/StaticRiver',
        variables: {
          exportFilter: exportFilter
        }
      }
      content = $tw.wiki.renderTiddler(
        'text/plain',
        '$:/core/templates/exporters/StaticRiver',
        options
      )
    } else {
      // Export Tiddler as tid
      const options = {
        downloadType: 'text/plain',
        method: 'download',
        template: '$:/core/templates/exporters/TidFile',
        variables: {
          exportFilter: exportFilter
        }
      }
      content = $tw.wiki.renderTiddler(
        'text/plain',
        '$:/core/templates/exporters/TidFile',
        options
      )
    }
    if (content !== undefined && content !== null) {
      // Encrypt
      if ($tw.crypto.hasPassword()) {
        try {
          content = $tw.crypto.encrypt(content, $tw.crypto.currentPassword)
        } catch (error) {
          this.getLogger().error(error)
          $tw.utils.alert(name, 'Failed to encrypt content...')
          return null
        }
      }
      try {
        content = $tw.ipfs.StringToUint8Array(content)
      } catch (error) {
        this.getLogger().error(error)
        $tw.utils.alert(name, 'Failed to convert content...')
        return null
      }
    }
    return content
  }

  IpfsAction.prototype.transcludeContent = function (title) {
    var tiddlers = []
    // Build a transclude widget
    var transclude = $tw.wiki.makeTranscludeWidget(title)
    // Build a fake document element
    const container = $tw.fakeDocument.createElement('div')
    // Transclude
    transclude.render(container, null)
    // Process children
    this.locateTiddlers(transclude, tiddlers)
    // Return
    return tiddlers
  }

  IpfsAction.prototype.locateTiddlers = function (transclude, tiddlers) {
    // Children lookup
    for (var i = 0; i < transclude.children.length; i++) {
      // Current child
      const child = transclude.children[i]
      if (child.variables !== undefined && child.variables !== null) {
        // Locate Tiddler
        const currentTiddler = 'currentTiddler'
        const current = child.variables[currentTiddler]
        if (
          current !== undefined &&
          current !== null &&
          current.value !== undefined &&
          current.value !== null
        ) {
          if (tiddlers.indexOf(current.value) === -1) {
            tiddlers.push(current.value)
          }
        }
      }
      // Process children
      this.locateTiddlers(child, tiddlers)
    }
  }

  exports.IpfsAction = IpfsAction
})()
