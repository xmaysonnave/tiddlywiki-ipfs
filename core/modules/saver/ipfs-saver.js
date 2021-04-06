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
    const publishToIpns = async function (added, ipnsIpfsCid, ipnsCid, ipnsKey) {
      try {
        await $tw.ipfs.publishIpnsKey(added, ipnsCid, ipnsKey)
        $tw.utils.alert(name, `Published IPNS key: ${ipnsKey}`)
      } catch (error) {
        $tw.ipfs.getLogger().warn(error)
        $tw.utils.alert(name, error.message)
        if (ipnsIpfsCid !== null) {
          await $tw.ipfs.requestToPin(`/ipfs/${ipnsIpfsCid}`)
        }
        return false
      }
      return true
    }
    try {
      var account = null
      var ensCid = null
      var ensIpnsCid = null
      var ensIpnsKey = null
      var ensDomain = null
      var ipfsCid = null
      var ipnsCid = null
      var ipnsIpfsCid = null
      var ipnsKey = null
      var options = options || {}
      var resolvedUrl = null
      var web3 = null
      const base = $tw.ipfs.getIpfsBaseUrl()
      const wiki = $tw.ipfs.normalizeUrl($tw.ipfs.getDocumentUrl(), base)
      const protocol = base.protocol
      const host = base.host
      var credential = ''
      if (wiki.username && wiki.password) {
        credential = `${wiki.username}:${wiki.password}@`
      }
      var pathname = wiki.pathname
      const search = wiki.search
      const hash = wiki.hash
      try {
        var { ipfsCid, ipnsCid, resolvedUrl } = await $tw.ipfs.resolveUrl(wiki, false, false, true)
      } catch (error) {
        $tw.ipfs.getLogger().error(error)
        callback(error)
        return true
      }
      if (ipfsCid !== null && ipnsCid == null) {
        const resolvedCid = await $tw.ipfs.resolveIpfsContainer(resolvedUrl)
        if (resolvedCid !== null) {
          await $tw.ipfs.requestToUnpin(`/ipfs/${resolvedCid}`)
        }
      }
      // IPNS
      if (ipnsCid !== null || $tw.utils.getIpfsProtocol() === ipnsKeyword) {
        // Resolve current IPNS
        if (ipnsCid !== null) {
          try {
            var { ipfsCid: ipnsIpfsCid, ipnsKey, resolvedUrl } = await $tw.ipfs.resolveUrl(wiki, true, true, false)
          } catch (error) {
            $tw.ipfs.getLogger().error(error)
            $tw.utils.alert(name, error.message)
          }
        } else {
          // Default IPNS
          ipnsCid = $tw.utils.getIpnsCid()
          ipnsKey = $tw.utils.getIpnsKey()
          if (ipnsCid == null && ipnsKey == null) {
            callback(new Error('Unknown default IPNS key pair...'))
            return true
          }
          $tw.ipfs.getLogger().info('Processing default IPNS key pair...')
          var identifier = ipnsCid
          if (identifier == null) {
            identifier = ipnsKey
          }
          try {
            var { ipfsCid: ipnsIpfsCid, ipnsCid, ipnsKey, resolvedUrl } = await $tw.ipfs.resolveUrl(`/${ipnsKeyword}/${identifier}`, true, true, false)
          } catch (error) {
            $tw.ipfs.getLogger().error(error)
            $tw.utils.alert(name, error.message)
          }
        }
        if (ipnsIpfsCid !== null) {
          const resolvedCid = await $tw.ipfs.resolveIpfsContainer(resolvedUrl)
          if (resolvedCid !== null) {
            await $tw.ipfs.requestToUnpin(`/ipfs/${resolvedCid}`)
          }
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
        var { ipfsCid: ensCid, ipnsCid: ensIpnsCid, ipnsKey: ensIpnsKey, resolvedUrl } = await $tw.ipfs.resolveUrl(ensDomain, true, true, true, null, web3)
        if (ensCid !== null) {
          const resolvedCid = await $tw.ipfs.resolveIpfsContainer(resolvedUrl)
          if (resolvedCid !== null) {
            await $tw.ipfs.requestToUnpin(`/ipfs/${resolvedCid}`)
          }
        }
      }
      // Upload
      $tw.ipfs.getLogger().info(`Uploading wiki: ${text.length} bytes`)
      const { cid: added } = await $tw.ipfs.addToIpfs($tw.ipfs.StringToUint8Array(text))
      await $tw.ipfs.requestToPin(`/${ipfsKeyword}/${added}`)
      // Publish to IPNS
      pathname = `/${ipfsKeyword}/${added}/`
      if (ipnsCid !== null && ipnsKey !== null) {
        if (await publishToIpns(added, ipnsIpfsCid, ipnsCid, ipnsKey)) {
          pathname = `/${ipnsKeyword}/${ipnsCid}/`
        }
      }
      if (ensIpnsCid !== null && ensIpnsKey !== null) {
        if (await publishToIpns(added, ensCid, ensIpnsCid, ensIpnsKey)) {
          pathname = `/${ipnsKeyword}/${ensIpnsCid}/`
        }
      }
      // Publish to ENS
      if ($tw.utils.getIpfsProtocol() === ensKeyword && ensIpnsCid == null) {
        try {
          await $tw.ipfs.setContentHash(ensDomain, `/${ipfsKeyword}/${added}`, web3, account)
          $tw.utils.alert(name, `Published to ENS: ${ensDomain}`)
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
