import root from 'window-or-global'
;(function () {
  /*jslint node: true, browser: true*/
  'use strict'

  /*eslint no-unused-vars: "off"*/
  const name = '3box-library'

  // https://github.com/ensdomains/resolvers
  var BoxLibrary = function (ipfsLoader) {
    this.ipfsLoader = ipfsLoader
  }

  BoxLibrary.prototype.getLogger = function () {
    if (root.logger !== undefined && root.logger !== null) {
      return root.logger
    }
    return console
  }

  BoxLibrary.prototype.loadThreeBox = async function () {
    if (this.box === undefined || this.box == null) {
      try {
        // Load 3box
        await this.ipfsLoader.loadThreeBoxLibrary()
        this.box = await root.Box.create()
        return
      } catch (error) {
        this.getLogger().error(error)
      }
      // Should not happen...
      throw new Error('Unavailable 3box library...')
    }
  }

  /*eslint no-empty-pattern: "off"*/
  BoxLibrary.prototype.load3Box = async function (provider, account) {
    if (provider === undefined || provider == null) {
      throw new Error('Undefined Ethereum provider...')
    }
    account =
      account === undefined || account == null || account.trim() === ''
        ? null
        : account.trim()
    if (account == null) {
      throw new Error('Undefined Ethereum account...')
    }
    if (root.Box === undefined || root.Box == null) {
      await this.loadThreeBox()
    }
    // if (this.account !== undefined && this.account !== null) {
    //   if (this.account.toLowerCase() !== account.toLowercase()) {
    //     await this.box.logout()
    //   }
    // }
    // if (
    //   this.account === undefined ||
    //   this.account.toLowerCase() !== account.toLowercase()
    // ) {
    //   this.account = account
    //   this.box = await root.Box.openBox(account, provider)
    //   await this.box.syncDone
    // }
    const profile = await root.Box.getProfile(account)
    this.getLogger().info(profile)
  }

  module.exports = BoxLibrary
})()
