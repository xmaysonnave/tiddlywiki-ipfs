/*\
title: $:/plugins/ipfs/ens-action.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

ENS Action

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  const ipfsKeyword = 'ipfs'
  const ipnsKeyword = 'ipns'

  const name = 'ens-action'

  var EnsAction = function () {
    this.once = false
  }

  EnsAction.prototype.init = function () {
    // Init once
    if (this.once) {
      return
    }
    const self = this
    $tw.rootWidget.addEventListener('tm-ens-manager-open', function (event) {
      return self.handleOpenEnsManager(event)
    })
    $tw.rootWidget.addEventListener('tm-ens-resolve-and-open', async function (event) {
      return await self.handleEnsResolveAndOpen(event)
    })
    $tw.rootWidget.addEventListener('tm-ens-publish', async function (event) {
      return await self.handlePublishToEns(event)
    })
    $tw.rootWidget.addEventListener('tm-ipns-publish-to-ens', async function (event) {
      return await self.handlePublishIpnsToEns(event)
    })
    // Init once
    this.once = true
  }

  EnsAction.prototype.handleOpenEnsManager = function (event) {
    var ensDomain = $tw.utils.getIpfsEnsDomain()
    if (ensDomain == null) {
      window.open('https://app.ens.domains', '_blank', 'noopener,noreferrer')
    } else {
      window.open(`https://app.ens.domains/name/${ensDomain}`, '_blank', 'noopener,noreferrer')
    }
    return true
  }

  EnsAction.prototype.handleEnsResolveAndOpen = async function (event) {
    var ensDomain = $tw.utils.getIpfsEnsDomain()
    if (ensDomain == null) {
      $tw.utils.alert(name, 'Undefined ENS domain...')
      return false
    }
    try {
      var { resolvedUrl } = await $tw.ipfs.resolveUrl(ensDomain, $tw.utils.getIpnsResolve(), false, $tw.utils.getEthLinkResolve())
      if (resolvedUrl !== null) {
        window.open(resolvedUrl.href, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    return true
  }

  EnsAction.prototype.handlePublishToEns = async function (event) {
    var ipfsCid = null
    var ipnsCid = null
    const wiki = $tw.ipfs.getDocumentUrl()
    var ensDomain = $tw.utils.getIpfsEnsDomain()
    if (ensDomain == null) {
      $tw.utils.alert(name, 'Undefined ENS domain...')
      return false
    }
    try {
      var { ipfsCid, ipnsCid } = await $tw.ipfs.resolveUrl(wiki, false, false, false)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    if (ipfsCid == null && ipnsCid == null) {
      $tw.utils.alert(name, 'Undefined IPFS identifier...')
      return false
    }
    if (ipfsCid !== null) {
      return await this.publishToEns(ensDomain, ipfsKeyword, ipfsCid)
    }
    return await this.publishToEns(ensDomain, ipnsKeyword, ipnsCid)
  }

  EnsAction.prototype.handlePublishIpnsToEns = async function (event) {
    var ipnsCid = null
    var ipnsKey = $tw.utils.getIpnsKey()
    if (ipnsKey == null) {
      $tw.utils.alert(name, 'Undefined IPNS key....')
      return false
    }
    var ensDomain = $tw.utils.getIpfsEnsDomain()
    if (ensDomain == null) {
      $tw.utils.alert(name, 'Undefined ENS domain...')
      return false
    }
    try {
      var { ipnsCid } = await $tw.ipfs.resolveUrl(`/${ipnsKeyword}/${ipnsKey}`, false, false, false)
      if (ipnsCid == null) {
        $tw.utils.alert(name, 'Undefined IPFS identifier...')
        return false
      }
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    return await this.publishToEns(ensDomain, ipnsKeyword, ipnsCid)
  }

  EnsAction.prototype.publishToEns = async function (ensDomain, protocol, identifier) {
    var account = null
    var ipfsCid = null
    var ipnsCid = null
    var resolvedUrl = null
    var web3 = null
    try {
      var { account, web3 } = await $tw.ipfs.getEnabledWeb3Provider()
      var { ipfsCid, ipnsCid, resolvedUrl } = await $tw.ipfs.resolveUrl(ensDomain, $tw.utils.getIpnsResolve(), false, true, null, web3)
      if (protocol === ipfsKeyword && identifier === ipfsCid) {
        $tw.utils.alert(name, 'The current resolved ENS domain content is up to date...')
        return false
      }
      if (protocol === ipnsKeyword && identifier === ipnsCid) {
        $tw.utils.alert(name, 'The current resolved ENS domain content is up to date...')
        return false
      }
      const isOwner = await $tw.ipfs.isEnsOwner(ensDomain, web3, account)
      if (isOwner === false) {
        const err = new Error('Unauthorized Account...')
        err.name = 'OwnerError'
        throw err
      }
    } catch (error) {
      if (error.name !== 'OwnerError') {
        $tw.ipfs.getLogger().error(error)
      }
      $tw.utils.alert(name, error.message)
      return false
    }
    $tw.ipfs
      .addToUnpin(resolvedUrl !== null ? resolvedUrl.pathname : null)
      .then(unpin => {
        if (unpin) {
          $tw.ipfs.removeFromPinUnpin(resolvedUrl.pathname)
        }
        $tw.ipfs
          .setContentHash(ensDomain, `/${protocol}/${identifier}`, web3, account)
          .then(data => {
            $tw.utils.alert(name, 'Published to ENS...')
          })
          .catch(error => {
            if (error.name !== 'OwnerError' && error.name !== 'RejectedUserRequest' && error.name !== 'UnauthorizedUserAccount') {
              $tw.ipfs.getLogger().error(error)
            }
            $tw.utils.alert(name, error.message)
            $tw.ipfs.addToPin(resolvedUrl !== null ? resolvedUrl.pathname : null)
          })
      })
      .catch(error => {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
    return true
  }

  exports.EnsAction = EnsAction
})()
