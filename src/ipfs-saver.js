/*\
title: $:/plugins/ipfs/ipfs-saver.js
type: application/javascript
tags: $:/ipfs/core
module-type: saver

IPFS Saver

\*/

;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  const IpfsController = require('$:/plugins/ipfs/ipfs-controller.js')
    .IpfsController

  const ensKeyword = 'ens'
  const ipfsKeyword = 'ipfs'
  const ipnsKeyword = 'ipns'

  const name = 'ipfs-saver'

  /*
   * Select the appropriate saver module and set it up
   */
  var IpfsSaver = function (wiki) {
    // Controller
    $tw.ipfs = new IpfsController()
    $tw.ipfs.init()
    // Log
    this.getLogger().info('ipfs-saver is starting up...')
    // Log url policy
    const base = $tw.ipfs.getIpfsBaseUrl()
    if ($tw.utils.getIpfsUrlPolicy() === 'origin') {
      this.getLogger().info(`Origin base URL: ${base}`)
    } else {
      this.getLogger().info(`Gateway base URL: ${base}`)
    }
  }

  IpfsSaver.prototype.getLogger = function () {
    if (window.logger !== undefined && window.logger !== null) {
      return window.logger
    }
    return console
  }

  IpfsSaver.prototype.save = async function (text, method, callback, options) {
    if ($tw.saverHandler.isDirty() === false) {
      return false
    }
    try {
      var account = null
      var chainId = null
      var cid = null
      var ensCid = null
      var ensDomain = null
      var ipnsCid = null
      var ipnsKey = null
      var ipnsName = null
      var options = options || {}
      var web3 = null
      const wiki = $tw.ipfs.getDocumentUrl()
      const base = $tw.ipfs.getIpfsBaseUrl()
      const nextWiki = $tw.ipfs.getUrl(wiki)
      nextWiki.protocol = base.protocol
      nextWiki.host = base.host
      nextWiki.port = base.port
      try {
        var { cid, ipnsKey } = await $tw.ipfs.resolveUrl(false, true, wiki)
        if (cid != null) {
          await $tw.ipfs.requestToUnpin(cid)
        }
      } catch (error) {
        this.getLogger().error(error)
        callback(error.message)
        return true
      }
      // IPNS
      if (ipnsKey !== null || $tw.utils.getIpfsProtocol() === ipnsKeyword) {
        // Resolve current IPNS
        if (ipnsKey !== null) {
          try {
            var { cid: ipnsCid, ipnsName } = await $tw.ipfs.resolveUrl(
              true,
              false,
              wiki
            )
          } catch (error) {
            this.getLogger().error(error)
            $tw.utils.alert(name, error.message)
          }
        } else {
          // Default IPNS
          ipnsKey = $tw.utils.getIpfsIpnsKey()
          ipnsKey =
            ipnsKey === undefined || ipnsKey == null || ipnsKey.trim() === ''
              ? null
              : ipnsKey.trim()
          ipnsName = $tw.utils.getIpfsIpnsName()
          ipnsName =
            ipnsName === undefined || ipnsName == null || ipnsName.trim() === ''
              ? null
              : ipnsName.trim()
          if (ipnsKey == null && ipnsName == null) {
            callback(null, 'Unknown default IPNS identifiers...')
            return true
          }
          this.getLogger().info('Processing default IPNS identifiers...')
          var identifier = ipnsKey
          if (identifier == null) {
            identifier = ipnsName
          }
          try {
            var { cid: ipnsCid, ipnsKey, ipnsName } = await $tw.ipfs.resolveUrl(
              true,
              false,
              `/${ipnsKeyword}/${identifier}`
            )
          } catch (error) {
            this.getLogger().error(error)
            $tw.utils.alert(name, error.message)
          }
        }
        if (ipnsCid != null) {
          await $tw.ipfs.requestToUnpin(ipnsCid)
        }
      }
      // ENS
      if ($tw.utils.getIpfsProtocol() === ensKeyword) {
        ensDomain = $tw.utils.getIpfsEnsDomain()
        if (ensDomain == null) {
          callback(null, 'Undefined ENS domain...')
          return true
        }
        /*eslint no-unused-vars:"off"*/
        var { account, chainId, web3 } = await $tw.ipfs.getEnabledWeb3Provider()
        const isOwner = await $tw.ipfs.isOwner(ensDomain, web3, account)
        if (isOwner === false) {
          const err = new Error('Unauthorized Account...')
          err.name = 'OwnerError'
          throw err
        }
        var { cid: ensCid } = await $tw.ipfs.resolveUrl(
          false,
          true,
          ensDomain,
          null,
          web3
        )
        if (ensCid != null) {
          await $tw.ipfs.requestToUnpin(ensCid)
        }
      }
      // Upload  current document
      this.getLogger().info(`Uploading wiki: ${text.length}`)
      // Add
      const { added } = await $tw.ipfs.addToIpfs(text)
      // Default next
      nextWiki.pathname = `/${ipfsKeyword}/${added}`
      // Pin
      try {
        await $tw.ipfs.pinToIpfs(added)
      } catch (error) {
        this.getLogger().warn(error)
        $tw.utils.alert(name, error.message)
      }
      // Publish to IPNS
      if (ipnsKey !== null && ipnsName !== null) {
        $tw.utils.alert(name, `Publishing IPNS name: ${ipnsName}`)
        try {
          await $tw.ipfs.publishIpnsName(added, ipnsKey, ipnsName)
          nextWiki.pathname = `/${ipnsKeyword}/${ipnsKey}`
          $tw.utils.alert(name, `Successfully Published IPNS name: ${ipnsName}`)
        } catch (error) {
          this.getLogger().warn(error)
          $tw.utils.alert(name, error.message)
          $tw.ipfs.requestToPin(ipnsCid)
        }
      }
      // Publish to ENS
      if ($tw.utils.getIpfsProtocol() === ensKeyword) {
        try {
          $tw.utils.alert(name, `Publishing to ENS: ${ensDomain}`)
          await $tw.ipfs.setContentHash(ensDomain, added, web3, account)
          // if (chainId !== null && chainId === 1) {
          //   nextWiki.protocol = 'https:'
          //   nextWiki.host = ensDomain
          // } else {
          const { resolvedUrl } = await $tw.ipfs.resolveEns(ensDomain, web3)
          nextWiki.protocol = resolvedUrl.protocol
          nextWiki.host = resolvedUrl.host
          nextWiki.pathname = resolvedUrl.pathname
          // }
          $tw.utils.alert(name, `Successfully published to ENS: ${ensDomain}`)
        } catch (error) {
          this.getLogger().warn(error)
          $tw.utils.alert(name, error.message)
          $tw.ipfs.requestToPin(ensCid)
        }
      }
      $tw.ipfs.pin = []
      // Unpin
      if ($tw.utils.getIpfsUnpin()) {
        for (var i in $tw.ipfs.unpin) {
          try {
            const unpin = $tw.ipfs.unpin[i]
            await $tw.ipfs.unpinFromIpfs(unpin)
          } catch (error) {
            this.getLogger().warn(error)
            $tw.utils.alert(name, error.message)
          }
        }
      }
      $tw.ipfs.unpin = []
      // Pin
      for (var i in $tw.ipfs.pin) {
        try {
          const pin = $tw.ipfs.pin[i]
          await $tw.ipfs.pinToIpfs(pin)
        } catch (error) {
          this.getLogger().warn(error)
          $tw.utils.alert(name, error.message)
        }
      }
      callback(null)
      if (nextWiki.host !== wiki.host || nextWiki.pathname !== wiki.pathname) {
        window.location.assign(nextWiki.toString())
      }
    } catch (error) {
      if (
        error.name !== 'OwnerError' &&
        error.name !== 'RejectedUserRequest' &&
        error.name !== 'UnauthorizedUserAccount'
      ) {
        this.getLogger().error(error)
      }
      callback(error.message)
      return true
    }
    callback(null)
    return true
  }

  /*
   * Information about this saver
   */
  IpfsSaver.prototype.info = {
    name: 'Ipfs',
    priority: 3100,
    capabilities: ['save']
  }

  /*
   * Static method that returns true if this saver is capable of working
   */
  exports.canSave = function (wiki) {
    return true
  }

  /*
   * Create an instance of this saver
   */
  exports.create = function (wiki) {
    return new IpfsSaver(wiki)
  }
})()
