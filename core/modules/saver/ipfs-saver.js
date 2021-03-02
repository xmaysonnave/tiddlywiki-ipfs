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

  const IpfsController = require('$:/plugins/ipfs/ipfs-controller.js').IpfsController

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
    $tw.ipfs.getLogger().info('ipfs-saver is starting up...')
    // Log url policy
    const base = $tw.ipfs.getIpfsBaseUrl()
    if ($tw.utils.getIpfsUrlPolicy() === 'origin') {
      $tw.ipfs.getLogger().info(`Origin Policy: ${base}`)
    } else {
      $tw.ipfs.getLogger().info(`Gateway Policy: ${base}`)
    }
  }

  IpfsSaver.prototype.save = async function (text, method, callback, options) {
    if ($tw.saverHandler.isDirty() === false) {
      return false
    }
    const publishToIpns = async function (added, ipnsCid, ipnsKey, ipnsName) {
      $tw.utils.alert(name, `Publishing IPNS name: ${ipnsName}`)
      try {
        await $tw.ipfs.publishIpnsName(added, ipnsKey, ipnsName)
        pathname = `/${ipnsKeyword}/${ipnsKey}`
        $tw.utils.alert(name, `Successfully Published IPNS name: ${ipnsName}`)
      } catch (error) {
        $tw.ipfs.getLogger().warn(error)
        $tw.utils.alert(name, error.message)
        if (ipnsCid !== null) {
          await $tw.ipfs.requestToPin(`/ipfs/${ipnsCid}`)
        }
      }
    }
    try {
      var account = null
      var ensCid = null
      var ensIpnsKey = null
      var ensIpnsName = null
      var ensDomain = null
      var ipnsCid = null
      var ipnsKey = null
      var ipnsName = null
      var options = options || {}
      var web3 = null
      const wiki = $tw.ipfs.getDocumentUrl()
      const base = $tw.ipfs.getIpfsBaseUrl()
      const protocol = base.protocol
      const host = base.host
      const current = $tw.ipfs.getUrl(wiki, base)
      var credential = ''
      if (current.username && current.password) {
        credential = `${current.username}:${current.password}@`
      }
      var pathname = current.pathname
      const search = current.search
      const hash = current.hash
      try {
        var { cid, ipnsKey, resolvedUrl } = await $tw.ipfs.resolveUrl(false, true, wiki)
      } catch (error) {
        $tw.ipfs.getLogger().error(error)
        callback(error)
        return true
      }
      if (cid !== null && ipnsKey == null) {
        const ipfsPath = await $tw.ipfs.resolveIpfsContainer(resolvedUrl)
        if (ipfsPath !== null) {
          await $tw.ipfs.requestToUnpin(ipfsPath)
        }
      }
      // IPNS
      if (ipnsKey !== null || $tw.utils.getIpfsProtocol() === ipnsKeyword) {
        // Resolve current IPNS
        if (ipnsKey !== null) {
          try {
            var { cid: ipnsCid, ipnsName } = await $tw.ipfs.resolveUrl(true, false, wiki)
          } catch (error) {
            $tw.ipfs.getLogger().error(error)
            $tw.utils.alert(name, error.message)
          }
        } else {
          // Default IPNS
          ipnsKey = $tw.utils.getIpfsIpnsKey()
          ipnsName = $tw.utils.getIpfsIpnsName()
          if (ipnsKey == null && ipnsName == null) {
            callback(new Error('Unknown default IPNS identifiers...'))
            return true
          }
          $tw.ipfs.getLogger().info('Processing default IPNS identifiers...')
          var identifier = ipnsKey
          if (identifier == null) {
            identifier = ipnsName
          }
          try {
            var { cid: ipnsCid, ipnsKey, ipnsName } = await $tw.ipfs.resolveUrl(true, false, `/${ipnsKeyword}/${identifier}`)
          } catch (error) {
            $tw.ipfs.getLogger().error(error)
            $tw.utils.alert(name, error.message)
          }
        }
        if (ipnsCid !== null) {
          await $tw.ipfs.requestToUnpin(`/ipfs/${ipnsCid}`)
        }
      }
      // ENS
      if ($tw.utils.getIpfsProtocol() === ensKeyword) {
        ensDomain = $tw.utils.getIpfsEnsDomain()
        if (ensDomain == null) {
          callback(new Error('Undefined ENS domain...'))
          return true
        }
        var { account, web3 } = await $tw.ipfs.getEnabledWeb3Provider()
        const isOwner = await $tw.ipfs.isOwner(ensDomain, web3, account)
        if (isOwner === false) {
          const err = new Error('Unauthorized Account...')
          err.name = 'OwnerError'
          throw err
        }
        var { cid: ensCid, ipnsKey: ensIpnsKey, ipnsName: ensIpnsName } = await $tw.ipfs.resolveUrl(false, true, ensDomain, null, web3)
        if (ensCid !== null) {
          await $tw.ipfs.requestToUnpin(`/ipfs/${ensCid}`)
        }
      }
      // Upload
      $tw.ipfs.getLogger().info(`Uploading wiki: ${text.length} bytes`)
      const { cid: added } = await $tw.ipfs.addToIpfs(text)
      pathname = `/${ipfsKeyword}/${added}`
      await $tw.ipfs.requestToPin(pathname)
      // Publish to IPNS
      if (ipnsKey !== null && ipnsName !== null) {
        await publishToIpns(added, ipnsCid, ipnsKey, ipnsName)
      }
      if (ensIpnsKey !== null && ensIpnsName !== null) {
        await publishToIpns(added, ensCid, ensIpnsKey, ensIpnsName)
      }
      // Publish to ENS
      if ($tw.utils.getIpfsProtocol() === ensKeyword && ensIpnsKey == null) {
        try {
          $tw.utils.alert(name, `Publishing to ENS: ${ensDomain}`)
          await $tw.ipfs.setContentHash(ensDomain, `/${ipfsKeyword}/${added}`, web3, account)
          $tw.utils.alert(name, `Successfully published to ENS: ${ensDomain}`)
        } catch (error) {
          $tw.ipfs.getLogger().warn(error)
          $tw.utils.alert(name, error.message)
          if (ensCid !== null) {
            await $tw.ipfs.requestToPin(`/${ipfsKeyword}/${ensCid}`)
          }
        }
      }
      // Unpin
      if ($tw.utils.getIpfsUnpin()) {
        for (var i in $tw.ipfs.unpin) {
          try {
            const unpin = $tw.ipfs.unpin[i]
            await $tw.ipfs.unpinFromIpfs(unpin)
          } catch (error) {
            $tw.ipfs.getLogger().warn(error)
            $tw.utils.alert(name, error.message)
          }
        }
      }
      $tw.ipfs.unpin = []
      // Pin
      if ($tw.utils.getIpfsPin()) {
        for (var i in $tw.ipfs.pin) {
          try {
            const pin = $tw.ipfs.pin[i]
            await $tw.ipfs.pinToIpfs(pin)
          } catch (error) {
            $tw.ipfs.getLogger().warn(error)
            $tw.utils.alert(name, error.message)
          }
        }
      }
      $tw.ipfs.pin = []
      // Callback
      callback(null)
      // Next
      const next = $tw.ipfs.getUrl(`${protocol}//${credential}${host}${pathname}${search}${hash}`)
      if (next.protocol !== wiki.protocol || next.host !== wiki.host || next.pathname !== wiki.pathname) {
        $tw.ipfs.getLogger().info(`Loading: '${next.href}'`)
        window.location.assign(next.href)
      }
    } catch (error) {
      if (error.name !== 'OwnerError' && error.name !== 'RejectedUserRequest' && error.name !== 'UnauthorizedUserAccount') {
        $tw.ipfs.getLogger().error(error)
      }
      callback(error)
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
    capabilities: ['save'],
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
