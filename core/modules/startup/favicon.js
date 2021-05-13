/*\
title: $:/core/modules/startup/favicon.js
type: application/javascript
module-type: startup

Favicon handling

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  // Export name and synchronous status
  exports.name = 'favicon'
  exports.platforms = ['browser']
  exports.after = ['ipfs-startup']
  exports.synchronous = true

  // Favicon tiddler
  var FAVICON_TITLE = '$:/favicon.ico'

  exports.startup = function () {
    // Set up the favicon
    setFavicon()
    // Reset the favicon when the tiddler changes
    $tw.wiki.addEventListener('change', function (changes) {
      if ($tw.utils.hop(changes, FAVICON_TITLE)) {
        setFavicon()
      }
    })
  }

  async function setFavicon () {
    var tiddler = $tw.wiki.getTiddler(FAVICON_TITLE)
    if (tiddler) {
      try {
        var resolvedUrl = null
        var faviconLink = document.getElementById('faviconLink')
        if (faviconLink !== undefined && faviconLink !== null) {
          resolvedUrl = tiddler.fields.altSourceUri ? tiddler.fields.altSourceUri : tiddler.fields._canonical_uri
          if (resolvedUrl !== undefined && resolvedUrl !== null && resolvedUrl.trim() !== '') {
            try {
              var { resolvedUrl } = await $tw.ipfs.resolveUrl(resolvedUrl, false, false, false)
            } catch (error) {
              // Ignore
            }
            if (faviconLink.href !== undefined) {
              var currentResolvedUrl = decodeURI(faviconLink.href)
              try {
                var { resolvedUrl: currentResolvedUrl } = await $tw.ipfs.resolveUrl(currentResolvedUrl, false, false, false)
                // Nothing to do
                if (resolvedUrl !== null && currentResolvedUrl.toString() === resolvedUrl.toString()) {
                  return
                }
              } catch (error) {
                // Ignore
              }
            }
          }
        }
        faviconLink.setAttribute('href', $tw.utils.makeDataUri(tiddler.fields.text, tiddler.fields.type, resolvedUrl !== null ? resolvedUrl.toString() : undefined))
        $tw.ipfs.getLogger('Updated faviconLink...')
      } catch (error) {
        $tw.ipfs.getLogger().error(error)
      }
    }
  }
})()
