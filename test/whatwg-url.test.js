/*eslint no-unused-vars:"off"*/
/*global jest,beforeAll,describe,it,expect*/
'use strict'

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

const IpfsBundle = require('../core/modules/ipfs-bundle.js').IpfsBundle
const log = require('loglevel')
const invalid = 'Wrong URL...'
const baseFile = new URL(
  'file:///work/tiddly/tiddlywiki-ipfs/production/index.html'
)
const baseHttp = new URL('https://ipfs.bluelightav.org')
const baseHttpPort = new URL('https://ipfs.bluelightav.org:443')
const baseHttpNonDefaultPort = new URL('https://ipfs.bluelightav.org:4443')
const absolute = new URL('https://bluelightav.eth')
const ipfs = new URL(
  'ipfs://bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy'
)
const relative =
  '/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau'

beforeAll(() => {
  globalThis.log = log
  const logger = log.getLogger('ipfs')
  logger.setLevel('silent', false)
})
describe('WHATWG-URL', () => {
  it('Undefined URL', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    expect(() => {
      ipfsUrl.getUrl()
    }).toThrow()
  })
  it('Invalid URL', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    expect(() => {
      ipfsUrl.getUrl(invalid)
    }).toThrow()
  })
  it('HTTPS no port', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const parsed = ipfsUrl.getUrl(baseHttp)
    expect(
      parsed.protocol === 'https:' &&
        parsed.origin === baseHttp.origin &&
        parsed.host === 'ipfs.bluelightav.org' &&
        parsed.hostname === 'ipfs.bluelightav.org' &&
        parsed.port === '' &&
        parsed.pathname === '/' &&
        parsed.search === '' &&
        parsed.hash === '' &&
        parsed.href === baseHttp.href &&
        parsed.toString() === baseHttp.toString()
    ).toBeTruthy()
  })
  it('HTTPS with default port', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const parsed = ipfsUrl.getUrl(baseHttpPort)
    expect(
      parsed.protocol === 'https:' &&
        parsed.origin === baseHttpPort.origin &&
        parsed.host === 'ipfs.bluelightav.org' &&
        parsed.hostname === 'ipfs.bluelightav.org' &&
        parsed.port === '' &&
        parsed.pathname === '/' &&
        parsed.search === '' &&
        parsed.hash === '' &&
        parsed.href === baseHttpPort.href &&
        parsed.toString() === baseHttpPort.toString()
    ).toBeTruthy()
  })
  it('HTTPS with non default port', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const parsed = ipfsUrl.getUrl(baseHttpNonDefaultPort)
    expect(
      parsed.protocol === 'https:' &&
        parsed.origin === baseHttpNonDefaultPort.origin &&
        parsed.host === 'ipfs.bluelightav.org:4443' &&
        parsed.hostname === 'ipfs.bluelightav.org' &&
        parsed.port === '4443' &&
        parsed.pathname === '/' &&
        parsed.search === '' &&
        parsed.hash === '' &&
        parsed.href === baseHttpNonDefaultPort.href &&
        parsed.toString() === baseHttpNonDefaultPort.toString()
    ).toBeTruthy()
  })
  it('File protocol URL', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const parsed = ipfsUrl.getUrl(baseFile)
    expect(
      parsed.protocol === 'file:' &&
        parsed.origin === 'null' &&
        parsed.host === '' &&
        parsed.pathname ===
          '/work/tiddly/tiddlywiki-ipfs/production/index.html' &&
        parsed.href === baseFile.href &&
        parsed.toString() === baseFile.toString()
    ).toBeTruthy()
  })
  it('Useless base HTTP URL', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const parsed = ipfsUrl.getUrl(absolute, baseHttp)
    expect(
      parsed.protocol === 'https:' &&
        parsed.protocol === baseHttp.protocol &&
        parsed.hostname === 'bluelightav.eth' &&
        parsed !== absolute &&
        parsed.href === absolute.href &&
        parsed.toString() === absolute.toString()
    ).toBeTruthy()
  })
  it('Relative URL', () => {
    const base = new URL(baseHttp)
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const parsed = ipfsUrl.getUrl(relative, base)
    base.pathname = relative
    expect((parsed.pathname = base.pathname)).toBeTruthy()
  })
  it('Updating IPFS scheme', () => {
    const base = new URL('https://ipfs.bluelightav.org')
    const parsed = new URL(
      'ipfs://bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy'
    )
    parsed.pathname = `/ipfs/${parsed.hostname}`
    parsed.protocol = base.protocol
    parsed.host = base.host
    expect(
      parsed.protocol === 'ipfs:' &&
        parsed.hostname === 'ipfs.bluelightav.org' &&
        parsed.pathname ===
          '/ipfs/bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy'
    ).toBeTruthy()
  })
  /*
   * This test shows that whatwg-url is unable to set an URL protocol
   * The statement 'parsed.protocol = base.protocol' do not work
   * This test will crash if the behaviour is updated
   */
  it('Modifying IPFS scheme', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const base = ipfsUrl.getUrl(baseHttp)
    const parsed = ipfsUrl.getUrl(ipfs)
    parsed.pathname = `/ipfs/${parsed.hostname}`
    parsed.protocol = base.protocol
    parsed.host = base.host
    expect(
      parsed.protocol === 'ipfs:' &&
        parsed.host === 'ipfs.bluelightav.org' &&
        parsed.port === '' &&
        parsed.pathname ===
          '/ipfs/bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy'
    ).toBeTruthy()
  })
})
