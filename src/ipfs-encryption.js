/*\
title: $:/plugins/ipfs/ipfs-encryption.js
type: application/javascript
module-type: startup

Compression handling

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  // Export name and synchronous status
  exports.name = 'ipfs-encryption'
  exports.platforms = ['browser']
  exports.after = ['startup']
  exports.synchronous = true

  exports.startup = function () {
    var getLogger = function () {
      if (window.logger !== undefined && window.logger !== null) {
        return window.logger
      }
      return console
    }
    var setPassword = function () {
      $tw.passwordPrompt.createPrompt({
        serviceName: $tw.language.getString('Encryption/PromptSetPassword'),
        noUserName: true,
        submitText: $tw.language.getString('Encryption/SetPassword'),
        canCancel: true,
        repeatPassword: true,
        callback: function (data) {
          if (data) {
            $tw.crypto.setPassword(data.password)
          } else {
            $tw.crypto.setPassword(null)
          }
          return true // Get rid of the password prompt
        }
      })
    }
    // Ensure that $:/isCompressed is maintained properly
    $tw.wiki.addEventListener('change', function (changes) {
      if ($tw.utils.hop(changes, '$:/config/Standford')) {
        const encrypted = $tw.wiki.getTiddler('$:/isEncrypted')
        if (encrypted && encrypted.fields.text === 'yes') {
          const hasPassword = $tw.crypto.hasPassword()
          const standford = $tw.wiki.getTiddler('$:/config/Standford')
          if (!hasPassword && standford.fields.text === 'yes') {
            setPassword()
          } else if (hasPassword) {
            $tw.rootWidget.dispatchEvent({ type: 'tm-clear-password' })
          }
        }
      }
    })
    $tw.rootWidget.addEventListener('tm-set-password', async function (event) {
      const standford = $tw.wiki.getTiddler('$:/config/Standford')
      if (!$tw.crypto.hasPassword() && standford.fields.text === 'yes') {
        setPassword()
      } else {
        try {
          const encryptionKey = await $tw.ipfs.getPublicEncryptionKey()
          if (encryptionKey !== undefined && encryptionKey !== null) {
            getLogger().info(
              `Current Ethereum Public Encryption Key: ${encryptionKey}`
            )
          }
          $tw.crypto.setPublicKey(encryptionKey)
        } catch (error) {
          getLogger().error(error)
          $tw.utils.alert(name, error.message)
          $tw.crypto.setPublicKey(null)
        }
      }
    })
    $tw.rootWidget.addEventListener('tm-clear-password', async function (
      event
    ) {
      const hasPassword = $tw.crypto.hasPassword()
      const standford = $tw.wiki.getTiddler('$:/config/Standford')
      if ($tw.browser) {
        if (
          hasPassword &&
          standford.fields.text === 'yes' &&
          !confirm($tw.language.getString('Encryption/ConfirmClearPassword'))
        ) {
          return
        }
      }
      $tw.crypto.setPassword(null)
      if (hasPassword && standford.fields.text === 'no') {
        try {
          const encryptionKey = await $tw.ipfs.getPublicEncryptionKey()
          if (encryptionKey !== undefined && encryptionKey !== null) {
            getLogger().info(`Ethereum Public Encryption Key: ${encryptionKey}`)
          }
          $tw.crypto.setPublicKey(encryptionKey)
        } catch (error) {
          getLogger().error(error)
          $tw.utils.alert(name, error.message)
          $tw.crypto.setPublicKey(null)
        }
      }
    })
  }
})()
