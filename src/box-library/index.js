import root from 'window-or-global'
import React from 'react'
import ReactDOM from 'react-dom'
import ProfileHover from 'profile-hover'
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

  BoxLibrary.prototype.loadProfileHover = async function () {
    if (root.ProfileHover === undefined || root.ProfileHover == null) {
      try {
        // Load Profile Hover
        await this.ipfsLoader.loadProfileHoverLibrary()
        return
      } catch (error) {
        this.getLogger().error(error)
      }
      // Should not happen...
      throw new Error('Unavailable Profile Hover library...')
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
    if (this.account !== undefined && this.account !== null) {
      if (this.box !== undefined && root.Box.isLoggedIn(account) === false) {
        await this.box.logout()
      }
    }
    if (this.account === undefined || this.account !== account) {
      this.account = account
      this.box = await root.Box.openBox(this.account, provider)
      await this.box.syncDone
    }
    const element = (
      <div className="ethAddress">
        <ProfileHover showName address={account} fullDisplay />
      </div>
    )
    const container = document.getElementById('reactApp')
    ReactDOM.render(element, container)
    // if (this.account !== undefined) {
    //   const config = await root.Box.getConfig(this.account)
    //   this.getLogger().info(JSON.stringify(config))
    //   const profile = await root.Box.getProfile(this.account)
    //   this.getLogger().info(JSON.stringify(profile))
    //   const all = await this.box.public.all()
    //   this.getLogger().info(all)
    // }
  }

  module.exports = BoxLibrary
})()
