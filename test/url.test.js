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

const IpfsBundle = require('../build/plugins/ipfs/ipfs-bundle.js').IpfsBundle
const log = require('loglevel')
const root = require('window-or-global')
const { URL } = require('universal-url')
const text = 'text'
const resourceRelative = '../../import/cleanup/root.json'
beforeAll(() => {
  root.logger = log
  log.setLevel('silent', false)
})
describe('API URL', () => {
  it('Valid Default', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const parsed = ipfsUrl.getIpfsDefaultApiUrl()
    expect(parsed.toString() === 'https://ipfs.infura.io:5001/').toBeTruthy()
  })
  it('Valid Safe', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const parsed = ipfsUrl.getIpfsApiUrl()
    expect(parsed.toString() === 'https://ipfs.infura.io:5001/').toBeTruthy()
  })
  it('Invalid', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    try {
      ipfsUrl.getIpfsApiUrl()
    } catch (error) {
      expect(error.message).toBe('Invalid IPFS API URL...')
    }
  })
})
describe('Document URL', () => {
  it('Valid', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    ipfsUrl.getDocumentUrl = jest.fn()
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(
      new URL('https://ipfs.infura.io/ipfs/cid')
    )
    const parsed = ipfsUrl.getDocumentUrl()
    expect(parsed.toString() === 'https://ipfs.infura.io/ipfs/cid').toBeTruthy()
  })
  it('Invalid', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    try {
      ipfsUrl.getDocumentUrl()
    } catch (error) {
      expect(error.message).toBe('Invalid current HTML Document URL...')
    }
  })
})
describe('Gateway URL', () => {
  it('Valid Default', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const parsed = ipfsUrl.getIpfsDefaultGatewayUrl()
    expect(parsed.toString() === 'https://ipfs.infura.io/').toBeTruthy()
  })
  it('Valid Safe', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const parsed = ipfsUrl.getIpfsGatewayUrl()
    expect(parsed.toString() === 'https://ipfs.infura.io/').toBeTruthy()
  })
  it('Invalid', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    try {
      ipfsUrl.getIpfsGatewayUrl()
    } catch (error) {
      expect(error.message).toBe('Invalid IPFS Gateway URL...')
    }
  })
})
describe('URL', () => {
  it('Valid', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const parsed = ipfsUrl.getUrl('https://ipfs.infura.io:5001/')
    expect(parsed.toString() === 'https://ipfs.infura.io:5001/').toBeTruthy()
  })
  it('Invalid', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    try {
      ipfsUrl.getUrl()
    } catch (error) {
      expect(error.message).toBe('Invalid URL...')
    }
  })
  it('IPFS', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const url = ipfsUrl.getUrl(
      'ipfs://bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy'
    )
    expect(
      (url.hostname ===
        'bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy' ||
        url.pathname ===
          '//bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy') &&
        url.protocol === 'ipfs:'
    ).toBeTruthy()
  })
  it('IPNS', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const url = ipfsUrl.getUrl(
      'ipns://bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy'
    )
    expect(
      (url.hostname ===
        'bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy' ||
        url.pathname ===
          '//bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy') &&
        url.protocol === 'ipns:'
    ).toBeTruthy()
  })
})
describe('Base URL', () => {
  it('Origin', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    ipfsUrl.getDocumentUrl = jest.fn()
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(
      new URL('https://gateway.ipfs.io/ipfs/cid')
    )
    const base = ipfsUrl.getIpfsBaseUrl()
    expect(base.toString() === 'https://ipfs.infura.io/').toBeTruthy()
  })

  it('Fallback to default Gateway', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    ipfsUrl.getDocumentUrl = jest.fn()
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(
      new URL('file:///work/tiddly/tiddlywiki-ipfs/test/import/load/root.json')
    )
    const base = ipfsUrl.getIpfsBaseUrl()
    expect(base.toString() === 'https://ipfs.infura.io/').toBeTruthy()
  })
})
describe('Normalize URL', () => {
  it('Text...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    try {
      ipfsUrl.normalizeUrl(text)
    } catch (error) {
      expect(error.message).toBe('Invalid URL...')
    }
  })
  it('Dot ETH, no protocol...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    const parsed = ipfsUrl.normalizeUrl('bluelightav.eth/ipfs/cid')
    expect(
      parsed.toString() === 'https://bluelightav.eth/ipfs/cid'
    ).toBeTruthy()
  })
  it('Relative. Fallback to Origin...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    ipfsUrl.getDocumentUrl = jest.fn()
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(
      new URL('https://ipfs.infura.io/ipfs/cid')
    )
    const parsed = ipfsUrl.normalizeUrl('/ipfs/cid')
    expect(parsed.toString() === 'https://ipfs.infura.io/ipfs/cid').toBeTruthy()
  })
  it('Relative. Fallback to default Gateway...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    ipfsUrl.getDocumentUrl = jest.fn()
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(
      new URL('file:///work/tiddly/tiddlywiki-ipfs/test/import/load/root.json')
    )
    const parsed = ipfsUrl.normalizeUrl('/ipfs/cid')
    expect(parsed.toString() === 'https://ipfs.infura.io/ipfs/cid').toBeTruthy()
  })
  it('Relative. File system...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    ipfsUrl.getDocumentUrl = jest.fn()
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(
      new URL('file:///work/tiddly/tiddlywiki-ipfs/test/import/load/root.json')
    )
    const parsed = ipfsUrl.normalizeUrl(
      resourceRelative,
      ipfsUrl.getDocumentUrl()
    )
    expect(
      parsed.toString() ===
        'file:///work/tiddly/tiddlywiki-ipfs/test/import/cleanup/root.json'
    ).toBeTruthy()
  })
  it('Relative...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    ipfsUrl.getDocumentUrl = jest.fn()
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(
      new URL('https://ipfs.bluelightav.org/import/analyze/root.json')
    )
    const parsed = ipfsUrl.normalizeUrl(
      './level_4_1.json',
      ipfsUrl.getDocumentUrl()
    )
    expect(
      parsed.toString() ===
        'https://ipfs.bluelightav.org/import/analyze/level_4_1.json'
    ).toBeTruthy()
  })
  it('Remove dot link...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    ipfsUrl.getDocumentUrl = jest.fn()
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(
      new URL('https://ipfs.infura.io/ipfs/cid')
    )
    const parsed = ipfsUrl.normalizeUrl('https://bluelightav.eth.link/ipfs/cid')
    expect(
      parsed.toString() === 'https://bluelightav.eth/ipfs/cid'
    ).toBeTruthy()
  })
  it('Relative IPFS Protocol...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    ipfsUrl.getDocumentUrl = jest.fn()
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(
      new URL('https://ipfs.bluelightav.org/import/analyze/root.json')
    )
    const parsed = ipfsUrl.normalizeUrl(
      'ipfs://bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy',
      ipfsUrl.getDocumentUrl()
    )
    expect(
      parsed.toString() ===
        'https://ipfs.bluelightav.org/ipfs/bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy'
    ).toBeTruthy()
  })
})
