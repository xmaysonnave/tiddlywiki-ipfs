/*eslint no-unused-expressions:"off"*/
/*eslint no-undef:"off"*/
;('use strict')

const log = require('loglevel')
const chai = require('chai')
const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle

/**
 * url.href;
 * url.origin
 * url.protocol;
 * url.username;
 * url.password;
 * url.host;
 * url.hostname;
 * url.port;
 * url.pathname;
 * url.search;
 * url.hash;
 * https://jsdom.github.io/whatwg-url/
 * https://github.com/stevenvachon/universal-url
 * https://github.com/stevenvachon/universal-url-lite
 * https://url.spec.whatwg.org/
 */

const { expect } = chai

before(() => {
  globalThis.log = log
  const logger = log.getLogger('ipfs')
  logger.setLevel('silent', false)
})

describe('URL getBase', () => {
  it('default', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const { base } = ipfsBundle.getBase()
    expect(base.toString() === 'https://dweb.link/').to.be.true
  })
  it('subdomain', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    var { base } = ipfsBundle.getBase('https://dweb.link/ipfs/bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy/')
    expect(base.toString() === 'https://dweb.link/ipfs/bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy/').to.be.true
    var { base } = ipfsBundle.getBase('https://bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy.ipfs.dweb.link/')
    expect(base.toString() === 'https://dweb.link/ipfs/bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy/').to.be.true
  })
  it('subdomain document', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    var { base } = ipfsBundle.getBase('https://dweb.link/ipfs/bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy/content/document.odt')
    expect(base.toString() === 'https://dweb.link/ipfs/bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy/content/document.odt').to.be.true
    var { base } = ipfsBundle.getBase('https://bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy.ipfs.dweb.link/content/document.odt')
    expect(base.toString() === 'https://dweb.link/ipfs/bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy/content/document.odt').to.be.true
  })
  it('ipfs from ipfs', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const { base } = ipfsBundle.getBase('ipfs://bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy/')
    expect(base.toString() === 'https://dweb.link/ipfs/bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy/').to.be.true
  })
  it('ipfs document from ipfs', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const { base } = ipfsBundle.getBase('ipfs://bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy/content/document.odt')
    expect(base.toString() === 'https://dweb.link/ipfs/bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy/content/document.odt').to.be.true
  })
  it('ipns', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const { base } = ipfsBundle.getBase('https://ipns-key.ipns.dweb.link')
    expect(base.toString() === 'https://dweb.link/ipns/ipns-key/').to.be.true
  })
  it('ipns document', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const { base } = ipfsBundle.getBase('https://ipns-key.ipns.dweb.link/content/document.odt')
    expect(base.toString() === 'https://dweb.link/ipns/ipns-key/content/document.odt').to.be.true
  })
  it('ipns from ipns', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const { base } = ipfsBundle.getBase('ipns://ipns-key/')
    expect(base.toString() === 'https://dweb.link/ipns/ipns-key/').to.be.true
  })
  it('ipns document from ipns', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const { base } = ipfsBundle.getBase('ipns://ipns-key/content/document.odt')
    expect(base.toString() === 'https://dweb.link/ipns/ipns-key/content/document.odt').to.be.true
  })
})
