/*eslint no-unused-expressions:"off"*/
/*eslint no-undef:"off"*/
;('use strict')

const log = require('loglevel')
const chai = require('chai')
const sinon = require('sinon')
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

const text = 'text'

before(() => {
  globalThis.log = log
  const logger = log.getLogger('ipfs')
  logger.setLevel('silent', false)
})

describe('API URL', () => {
  it('Valid Default', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const parsed = ipfsBundle.getIpfsDefaultApiUrl()
    expect(parsed.toString() === 'https://ipfs.infura.io:5001/').to.be.true
  })
  it('Valid Safe', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const parsed = ipfsBundle.getIpfsApiUrl()
    expect(parsed.toString() === 'https://ipfs.infura.io:5001/').to.be.true
  })
  it('Invalid', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    try {
      ipfsBundle.getIpfsApiUrl()
    } catch (error) {
      expect(error.message).to.equal('Invalid IPFS API URL...')
    }
  })
})
describe('Document URL', () => {
  it('Valid', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    ipfsBundle.getDocumentUrl = sinon.fake.returns(new URL('https://ipfs.infura.io/ipfs/cid'))
    const parsed = ipfsBundle.getDocumentUrl()
    expect(parsed.toString() === 'https://ipfs.infura.io/ipfs/cid').to.be.true
  })
  it('Invalid', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    try {
      ipfsBundle.getDocumentUrl()
    } catch (error) {
      expect(error.message).to.equal('Invalid current HTML Document URL...')
    }
  })
})
describe('Gateway URL', () => {
  it('Valid Default', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const parsed = ipfsBundle.getIpfsDefaultGatewayUrl()
    expect(parsed.toString() === 'https://dweb.link/').to.be.true
  })
  it('Valid Safe', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const parsed = ipfsBundle.getIpfsGatewayUrl()
    expect(parsed.toString() === 'https://dweb.link/').to.be.true
  })
  it('Invalid', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    try {
      ipfsBundle.getIpfsGatewayUrl()
    } catch (error) {
      expect(error.message).to.equal('Invalid IPFS Gateway URL...')
    }
  })
})
describe('URL', () => {
  it('Valid', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const parsed = ipfsBundle.getUrl('https://ipfs.infura.io:5001/')
    expect(parsed.toString() === 'https://ipfs.infura.io:5001/').to.be.true
  })
  it('Invalid', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    try {
      ipfsBundle.getUrl()
    } catch (error) {
      expect(error.message).to.equal('Undefined URL...')
    }
  })
  it('IPFS', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const url = ipfsBundle.getUrl('ipfs://bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy')
    expect(url.hostname === 'bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy' && url.protocol === 'ipfs:').to.be.true
  })
  it('IPNS', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const url = ipfsBundle.getUrl('ipns://bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy')
    expect(url.hostname === 'bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy' && url.protocol === 'ipns:').to.be.true
  })
})
describe('Base URL', () => {
  it('Origin', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    ipfsBundle.getDocumentUrl = sinon.fake.returns(new URL('https://ipfs.infura.io/ipfs/cid'))
    const base = ipfsBundle.getIpfsBaseUrl()
    expect(base.toString() === 'https://dweb.link/').to.be.true
  })

  it('Fallback to default Gateway', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    ipfsBundle.getDocumentUrl = sinon.fake.returns(new URL('file:///work/tiddly/tiddlywiki-ipfs/test/import/load/root.json'))
    const base = ipfsBundle.getIpfsBaseUrl()
    expect(base.toString() === 'https://dweb.link/').to.be.true
  })
})
describe('Normalize URL', () => {
  it('Text...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    try {
      ipfsBundle.normalizeUrl(text)
    } catch (error) {
      expect(error.message).to.equal('Invalid URL...')
    }
  })
  it('Dot ETH, no protocol...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const parsed = ipfsBundle.normalizeUrl('bluelightav.eth/ipfs/cid')
    expect(parsed.toString() === 'https://bluelightav.eth/ipfs/cid').to.be.true
  })
  it('Relative. Fallback to Origin...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    ipfsBundle.getDocumentUrl = sinon.fake.returns(new URL('https://ipfs.infura.io/ipfs/cid'))
    const parsed = ipfsBundle.normalizeUrl('/ipfs/cid')
    expect(parsed.toString() === 'https://dweb.link/ipfs/cid').to.be.true
  })
  it('Relative. Fallback to default Gateway...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    ipfsBundle.getDocumentUrl = sinon.fake.returns(new URL('file:///work/tiddly/tiddlywiki-ipfs/test/import/load/root.json'))
    const parsed = ipfsBundle.normalizeUrl('/ipfs/cid')
    expect(parsed.toString() === 'https://dweb.link/ipfs/cid').to.be.true
  })
  it('Relative. File system...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    ipfsBundle.getDocumentUrl = sinon.fake.returns(new URL('file:///work/tiddly/tiddlywiki-ipfs/test/import/load/root.json'))
    const parsed = ipfsBundle.normalizeUrl('../../import/cleanup/root.json', new URL('file:///work/tiddly/tiddlywiki-ipfs/test/import/load/root.json'))
    expect(parsed.toString() === 'file:///work/tiddly/tiddlywiki-ipfs/test/import/cleanup/root.json').to.be.true
  })
  it('Relative...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    ipfsBundle.getDocumentUrl = sinon.fake.returns(new URL('https://ipfs.bluelightav.org/import/analyze/root.json'))
    const parsed = ipfsBundle.normalizeUrl('./level_4_1.json', new URL('https://ipfs.bluelightav.org/import/analyze/root.json'))
    expect(parsed.toString() === 'https://ipfs.bluelightav.org/import/analyze/level_4_1.json').to.be.true
  })
  it('Remove dot link...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    ipfsBundle.getDocumentUrl = sinon.fake.returns(new URL('https://ipfs.infura.io/ipfs/cid'))
    const parsed = ipfsBundle.normalizeUrl('https://bluelightav.eth.link/ipfs/cid')
    expect(parsed.toString() === 'https://bluelightav.eth/ipfs/cid').to.be.true
  })
  it('Relative IPFS Protocol...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    ipfsBundle.getDocumentUrl = sinon.fake.returns(new URL('https://ipfs.bluelightav.org/import/analyze/root.json'))
    const parsed = ipfsBundle.normalizeUrl('ipfs://bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy', new URL('https://ipfs.bluelightav.org/import/analyze/root.json'))
    expect(parsed.toString() === 'https://ipfs.bluelightav.org/ipfs/bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy').to.be.true
  })
  it('Base Relative IPFS Protocol...', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    ipfsBundle.getDocumentUrl = sinon.fake.returns('http://bafybeighpwr5cnqu2lbu6h5rx6mgeunl56drhg7yz3crxbli3rzewql44u.ipfs.localhost:8080/')
    const parsed = ipfsBundle.normalizeUrl(
      'ipfs://bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy',
      new URL('http://bafybeighpwr5cnqu2lbu6h5rx6mgeunl56drhg7yz3crxbli3rzewql44u.ipfs.localhost:8080/')
    )
    expect(parsed.toString() === 'http://localhost:8080/ipfs/bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy').to.be.true
  })
})
