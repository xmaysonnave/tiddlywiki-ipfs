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
      await this.ensLibrary.setContentHash(domain, cid, web3, account)
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
