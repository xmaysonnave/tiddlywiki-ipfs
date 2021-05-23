/*\
title: $:/plugins/ipfs/ipfs-saver.js
type: application/javascript
tags: $:/ipfs/core
module-type: saver

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  const { IpfsController } = require('$:/plugins/ipfs/ipfs-controller.js')

  const ensKeyword = 'ens'
  const ipfsKeyword = 'ipfs'
  const ipnsKeyword = 'ipns'

  const ipfsSaverName = 'ipfs-saver'

  /*
   * Select the appropriate saver module and set it up
   */
  var IpfsSaver = function (wiki) {
    // Controller
    $tw.ipfs = new IpfsController()
    $tw.ipfs.init()
    // Log url policy
    $tw.ipfs.getLogger().info('ipfs-saver is starting up...')
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
        $tw.utils.alert(ipfsSaverName, `Published IPNS key: ${ipnsKey}`)
      } catch (error) {
        $tw.ipfs.getLogger().warn(error)
        $tw.utils.alert(ipfsSaverName, error.message)
        if (ipnsIpfsCid !== null) {
          $tw.ipfs.addToPin(`/ipfs/${ipnsIpfsCid}`)
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
      var resolvedCid = null
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
      // Resolve origin
      try {
        var { ipfsCid, ipnsCid, resolvedUrl } = await $tw.ipfs.resolveUrl(wiki, false, false, false)
      } catch (error) {
        $tw.ipfs.getLogger().warn(error)
        callback(error)
      }
      if (ipfsCid !== null && ipnsCid == null) {
        resolvedCid = await $tw.ipfs.resolveIpfsContainer(resolvedUrl)
        if (resolvedCid !== null) {
          $tw.ipfs.addToUnpin(`/ipfs/${resolvedCid}`)
        }
      }
      // IPNS
      if (ipnsCid !== null || $tw.utils.getIpfsProtocol() === ipnsKeyword) {
        // Resolve current IPNS
        try {
          if (ipnsCid !== null) {
            var { ipfsCid: ipnsIpfsCid, ipnsKey, resolvedUrl } = await $tw.ipfs.resolveUrl(wiki, true, true, false)
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
            var { ipfsCid: ipnsIpfsCid, ipnsCid, ipnsKey, resolvedUrl } = await $tw.ipfs.resolveUrl(`/${ipnsKeyword}/${identifier}`, true, true, false)
          }
        } catch (error) {
          $tw.ipfs.getLogger().warn(error)
          $tw.utils.alert(ipfsSaverName, error.message)
        }
        if (ipnsIpfsCid !== null) {
          resolvedCid = await $tw.ipfs.resolveIpfsContainer(resolvedUrl)
          if (resolvedCid !== null) {
            $tw.ipfs.addToUnpin(`/ipfs/${resolvedCid}`)
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
        try {
          var { account, web3 } = await $tw.ipfs.getEnabledWeb3Provider()
          const isOwner = await $tw.ipfs.isEnsOwner(ensDomain, web3, account)
          if (isOwner === false) {
            const err = new Error('Unauthorized Account...')
            err.name = 'OwnerError'
            throw err
          }
          var { ipfsCid: ensCid, ipnsCid: ensIpnsCid, ipnsKey: ensIpnsKey, resolvedUrl: ensResolvedUrl } = await $tw.ipfs.resolveUrl(
            ensDomain,
            $tw.utils.getIpnsResolve(),
            true,
            true,
            null,
            web3
          )
        } catch (error) {
          $tw.ipfs.getLogger().warn(error)
          $tw.utils.alert(ipfsSaverName, error.message)
        }
        if (ensCid !== null || ensIpnsCid !== null) {
          resolvedCid = await $tw.ipfs.resolveIpfsContainer(ensResolvedUrl)
          if (resolvedCid !== null) {
            $tw.ipfs.addToUnpin(`/ipfs/${resolvedCid}`)
          }
        }
      }
      var added = null
      var found = false
      var match = null
      var re = /\r\n/g
      while ((match = re.exec(text)) != null) {
        found = true
        $tw.ipfs.getLogger().info(`*** Found CRLF: ${match.index} ***`)
      }
      if (found) {
        var before = text.length
        text = text.replace(re, '\n') // replace every \r\n with \n
        $tw.ipfs.getLogger().info(`Normalizing CRLF to LF: '${before - text.length}'...`)
      }
      // Upload
      const links = []
      var favicon = $tw.wiki.getTiddler('$:/favicon.ico')
      if (favicon) {
        try {
          var faviconIpfsCid = null
          var faviconIpnsCid = null
          var faviconResolvedUrl = favicon.fields._canonical_uri
          if (faviconResolvedUrl !== undefined && faviconResolvedUrl !== null && faviconResolvedUrl.trim() !== '') {
            try {
              var { ipfsCid: faviconIpfsCid, ipnsCid: faviconIpnsCid, resolvedUrl: faviconResolvedUrl } = await $tw.ipfs.resolveUrl(
                faviconResolvedUrl,
                $tw.utils.getIpnsResolve(),
                false,
                false
              )
            } catch (error) {
              // Ignore
            }
            if (faviconIpfsCid !== null || faviconIpnsCid !== null) {
              var { cid } = await $tw.ipfs.resolveIpfs(faviconResolvedUrl.toString())
              var stat = await $tw.ipfs.objectStat(cid, $tw.ipfs.shortTimeout)
              var cidV1 = $tw.ipfs.cidToCidV1(cid)
              var faviconFileName = 'favicon.ico'
              if (favicon.fields.type === 'image/png') {
                faviconFileName = 'favicon.png'
              }
              links.push({
                Name: faviconFileName,
                Tsize: stat.CumulativeSize,
                Hash: $tw.ipfs.getCid(cidV1),
              })
            }
          }
        } catch (error) {
          $tw.ipfs.getLogger().error(error)
        }
      }
      text = $tw.ipfs.StringToUint8Array(text)
      $tw.ipfs.getLogger().info(`Uploading wiki content: ${text.length} bytes`)
      var { cid: added } = await $tw.ipfs.addContentToIpfs(text, false)
      var stat = await $tw.ipfs.objectStat(added, $tw.ipfs.shortTimeout)
      var cidV1 = $tw.ipfs.cidToCidV1(added)
      links.push({
        Name: 'index.html',
        Tsize: stat.CumulativeSize,
        Hash: cidV1,
      })
      if (resolvedCid !== null) {
        var stat = await $tw.ipfs.objectStat(resolvedCid, $tw.ipfs.shortTimeout)
        var cidV1 = $tw.ipfs.cidToCidV1(resolvedCid)
        links.push({
          Name: 'previous',
          Tsize: stat.CumulativeSize,
          Hash: cidV1,
        })
      }
      var dir = await $tw.ipfs.dagPut(links)
      var cidV1 = $tw.ipfs.cidToCidV1(dir.cid)
      $tw.ipfs.addToPin(`/${ipfsKeyword}/${cidV1}`)
      // Publish to IPNS
      pathname = `/${ipfsKeyword}/${cidV1}/`
      if (ipnsCid !== null && ipnsKey !== null) {
        if (await publishToIpns(cidV1, ipnsIpfsCid, ipnsCid, ipnsKey)) {
          pathname = `/${ipnsKeyword}/${ipnsCid}/`
        }
      }
      if (ensIpnsCid !== null && ensIpnsKey !== null) {
        if (await publishToIpns(cidV1, ensCid, ensIpnsCid, ensIpnsKey)) {
          pathname = `/${ipnsKeyword}/${ensIpnsCid}/`
        }
      }
      // Publish to ENS
      if ($tw.utils.getIpfsProtocol() === ensKeyword && ensIpnsCid == null) {
        try {
          await $tw.ipfs.setContentHash(ensDomain, `/${ipfsKeyword}/${cidV1}`, web3, account)
          $tw.utils.alert(ipfsSaverName, `Published to ENS: ${ensDomain}`)
        } catch (error) {
          $tw.ipfs.getLogger().warn(error)
          $tw.utils.alert(ipfsSaverName, error.message)
          $tw.ipfs.addToPin(ensResolvedUrl !== null ? ensResolvedUrl.pathname : null)
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
            $tw.utils.alert(ipfsSaverName, error.message)
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
            $tw.utils.alert(ipfsSaverName, error.message)
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
