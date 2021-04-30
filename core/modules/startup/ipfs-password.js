/*\
title: $:/plugins/ipfs/startup/ipfs-password.js
type: application/javascript
tags: $:/ipfs/core
module-type: startup

Compression handling

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  // Export name and synchronous status
  exports.name = 'ipfs-password'
  exports.platforms = ['browser']
  exports.after = ['ipfs-startup']
  exports.synchronous = true

  exports.startup = function () {
    const setPassword = function () {
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
        },
      })
    }
    // Ensure that $:/isEncrypted is maintained properly
    $tw.wiki.addEventListener('change', function (changes) {
      if ($tw.utils.hop(changes, '$:/config/encryption')) {
        const encrypted = $tw.wiki.getTiddler('$:/isEncrypted')
        if (encrypted !== undefined && encrypted.fields.text === 'yes') {
          const hasPassword = $tw.crypto.hasPassword()
          const encryption = $tw.wiki.getTiddler('$:/config/encryption')
          if (!hasPassword && encryption !== undefined && encryption.fields.text === 'standford') {
            setPassword()
          } else if (hasPassword) {
            $tw.rootWidget.dispatchEvent({ type: 'tm-clear-password' })
          }
        }
      }
    })
    $tw.rootWidget.addEventListener('tm-set-password', async function (event) {
      const encryption = $tw.wiki.getTiddler('$:/config/encryption')
      if (encryption !== undefined && encryption.fields.text === 'standford') {
        if ($tw.crypto.hasPassword() === false) {
          setPassword()
        }
      } else {
        try {
          const encryptionKey = await $tw.ipfs.getPublicEncryptionKey()
          $tw.crypto.setEncryptionKey(encryptionKey)
        } catch (error) {
          if (error.name !== 'RejectedUserRequest') {
            $tw.ipfs.getLogger().error(error)
          }
          $tw.utils.alert('ipfs-password', error.message)
          $tw.crypto.setEncryptionKey()
        }
      }
    })
    $tw.rootWidget.addEventListener('tm-clear-password', async function (event) {
      if ($tw.browser) {
        const hasPassword = $tw.crypto.hasPassword()
        const hasEncryptionPublicKey = $tw.crypto.hasEncryptionPublicKey()
        if (hasPassword) {
          if (!confirm($tw.language.getString('Encryption/ConfirmClearPassword'))) {
            return
          }
          $tw.crypto.setPassword()
        } else if (hasEncryptionPublicKey) {
          if (!confirm($tw.language.getString('Encryption/ConfirmClearEncryptionPublicKey'))) {
            return
          }
          $tw.crypto.setEncryptionKey()
        }
      }
    })
  }
})()
