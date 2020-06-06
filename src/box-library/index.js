import root from 'window-or-global'
import React from 'react'
import ReactDOM from 'react-dom'
import ProfileHover from 'profile-hover'
;(function () {
  /*jslint node: true, browser: true*/
  'use strict'

  const name = '3box-library'

  // https://github.com/ensdomains/resolvers
  var BoxLibrary = function (ipfsLoader) {
    this.ipfsLoader = ipfsLoader
  }

  BoxLibrary.prototype.getLogger = function () {
    return root.log.getLogger(name)
  }

  BoxLibrary.prototype.loadReact = async function () {
    if (root.React === undefined || root.React == null) {
      try {
        // Load React
        await this.ipfsLoader.loadReactLibrary()
        if (root.React !== undefined && root.React !== null) {
          return
        }
      } catch (error) {
        this.getLogger().error(error)
      }
      // Should not happen...
      throw new Error('Unavailable React library...')
    }
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

  BoxLibrary.prototype.loadThreeBoxProfile = async function () {
    if (root.ProfileHover === undefined || root.ProfileHover == null) {
      try {
        // Load 3box profile hover
        await this.ipfsLoader.loadThreeBoxProfileLibrary()
        if (root.ProfileHover !== undefined && root.ProfileHover !== null) {
          return
        }
      } catch (error) {
        this.getLogger().error(error)
      }
      // Should not happen...
      throw new Error('Unavailable 3box profile hover library...')
    }
  }

  /*eslint no-empty-pattern: "off"*/
  BoxLibrary.prototype.load3BoxProfile = async function (provider, account) {
    if (root.Box === undefined || root.Box == null) {
      await this.loadThreeBox()
    }
    const box = await root.Box.openBox(account, provider)
    await box.syncDone
    const Example = ({}) => {
      return (
        <div className="ethAddress">
          <ProfileHover address={account} />
        </div>
      )
    }
    const appContainer = document.getElementById('reactApp')
    ReactDOM.render(<Example />, appContainer)
  }

  module.exports = BoxLibrary
})()
