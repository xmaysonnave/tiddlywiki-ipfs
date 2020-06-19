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
    if (root.Box === undefined || root.Box == null) {
      try {
        // Load 3box
        await this.ipfsLoader.loadThreeBoxLibrary()
        if (root.Box !== undefined && root.Box !== null) {
          return
        }
      } catch (error) {
        this.getLogger().error(error)
      }
      // Should not happen...
      throw new Error('Unavailable 3box library...')
    }
  }

  /*eslint no-empty-pattern: "off"*/
  BoxLibrary.prototype.load3Box = async function (provider, account) {
    if (root.Box === undefined || root.Box == null) {
      await this.loadThreeBox()
      const box = await root.Box.openBox(account, provider)
      await box.syncDone
    }
  }

  module.exports = BoxLibrary
})()
