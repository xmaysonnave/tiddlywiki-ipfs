/*\
title: $:/plugins/ipfs/ens-wrapper.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

ENS Wrapper

\*/

;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  /*eslint no-unused-vars:"off"*/
  const name = 'ens-wrapper'

  var EnsWrapper = function (ensLibrary) {
    this.ensLibrary = ensLibrary
  }

  EnsWrapper.prototype.getLogger = function () {
    if (window.logger !== undefined && window.logger !== null) {
      return window.logger
    }
    return console
  }

  EnsWrapper.prototype.getContentHash = async function (domain, web3) {
    try {
      var { content, protocol } = await this.ensLibrary.getContentHash(
        domain,
        web3
      )
      if (content !== null && protocol !== null) {
        // Convert CidV0 to CidV1
        content = $tw.ipfs.cidToCidV1(content, true)
        // Success
        return {
          content: content,
          protocol: protocol
        }
      }
      $tw.utils.alert(name, 'Unassigned ENS domain content...')
      return {
        content: null,
        protocol: null
      }
    } catch (error) {
      this.getLogger().error(error)
      throw new Error('Unable to fetch ENS domain content...')
    }
  }

  EnsWrapper.prototype.setContentHash = async function (
    domain,
    cid,
    web3,
    account
  ) {
    try {
      const isOwner = await $tw.ipfs.isOwner(domain, web3, account)
      if (isOwner === false) {
        const err = new Error('Unauthorized Account...')
        err.name = 'OwnerError'
        throw err
      }
      const cidV0 = $tw.ipfs.cidToCidV0(cid, true)
      await this.ensLibrary.setContentHash(domain, cidV0, web3, account)
      return {
        cidV0: cidV0
      }
    } catch (error) {
      if (
        error.name === 'OwnerError' ||
        error.name === 'RejectedUserRequest' ||
        error.name === 'UnauthorizedUserAccount'
      ) {
        throw error
      }
      this.getLogger().error(error)
      throw new Error('Unable to set ENS domain content...')
    }
  }

  exports.EnsWrapper = EnsWrapper
})()
