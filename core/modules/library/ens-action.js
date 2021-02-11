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
      return await self.handleResolveEnsAndOpen(event)
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

  EnsAction.prototype.handleResolveEnsAndOpen = async function (event) {
    var ensDomain = $tw.utils.getIpfsEnsDomain()
    if (ensDomain == null) {
      $tw.utils.alert(name, 'Undefined ENS domain...')
      return false
    }
    try {
      $tw.ipfs.getLogger().info(`ENS domain: ${ensDomain}`)
      const { resolvedUrl } = await $tw.ipfs.resolveEns(ensDomain)
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
    var cid = null
    var ipnsKey = null
    const wiki = $tw.ipfs.getDocumentUrl()
    var ensDomain = $tw.utils.getIpfsEnsDomain()
    if (ensDomain == null) {
      $tw.utils.alert(name, 'Undefined ENS domain...')
      return false
    }
    try {
      var { cid, ipnsKey } = await $tw.ipfs.resolveUrl(false, false, wiki)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    if (cid == null && ipnsKey == null) {
      $tw.utils.alert(name, 'Undefined IPFS identifier...')
      return false
    }
    if (cid !== null) {
      return await this.publishToEns(ensDomain, ipfsKeyword, cid)
    }
    return await this.publishToEns(ensDomain, ipnsKeyword, ipnsKey)
  }

  EnsAction.prototype.handlePublishIpnsToEns = async function (event) {
    var ipnsKey = null
    var ipnsName = $tw.utils.getIpfsIpnsName()
    if (ipnsName == null) {
      $tw.utils.alert(name, 'Undefined IPNS name....')
      return false
    }
    var ensDomain = $tw.utils.getIpfsEnsDomain()
    if (ensDomain == null) {
      $tw.utils.alert(name, 'Undefined ENS domain...')
      return false
    }
    try {
      var { ipnsKey } = await $tw.ipfs.resolveUrl(true, false, `/${ipnsKeyword}/${ipnsName}`)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    return await this.publishToEns(ensDomain, ipnsKeyword, ipnsKey)
  }

  EnsAction.prototype.publishToEns = async function (ensDomain, protocol, identifier) {
    var account = null
    var ensCid = null
    var ensIpnsKey = null
    var ensResolvedUrl = null
    var web3 = null
    try {
      var { account, web3 } = await $tw.ipfs.getEnabledWeb3Provider()
      var { cid: ensCid, ipnsKey: ensIpnsKey, resolvedUrl: ensResolvedUrl } = await $tw.ipfs.resolveUrl(false, true, ensDomain, null, web3)
      if (protocol === ipfsKeyword && identifier === ensCid) {
        $tw.utils.alert(name, 'The current resolved ENS domain content is up to date...')
        return false
      }
      if (protocol === ipnsKeyword && identifier === ensIpnsKey) {
        $tw.utils.alert(name, 'The current resolved ENS domain content is up to date...')
        return false
      }
      const isOwner = await $tw.ipfs.isOwner(ensDomain, web3, account)
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
    $tw.utils.alert(name, `Publishing to ENS: ${ensDomain}`)
    $tw.ipfs
      .requestToUnpin(ensCid)
      .then(data => {
        if (data) {
          $tw.ipfs.removeFromPinUnpin(ensCid, ensResolvedUrl)
        }
        $tw.ipfs
          .setContentHash(ensDomain, `/${protocol}/${identifier}`, web3, account)
          .then(data => {
            $tw.utils.alert(name, 'Successfully published to ENS...')
          })
          .catch(error => {
            if (error.name !== 'OwnerError' && error.name !== 'RejectedUserRequest' && error.name !== 'UnauthorizedUserAccount') {
              $tw.ipfs.getLogger().error(error)
            }
            $tw.utils.alert(name, error.message)
            $tw.ipfs.requestToPin(ensCid)
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
