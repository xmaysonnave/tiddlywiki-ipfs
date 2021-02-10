/*eslint no-unused-expressions:"off"*/
/*eslint no-undef:"off"*/
;('use strict')

const log = require('loglevel')
const chai = require('chai')
const sinon = require('sinon')

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle
const IpfsWrapper = require('../core/modules/library/ipfs-wrapper.js').IpfsWrapper

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

const { expect } = chai

const base = new URL('https://ipfs.infura.io/')
const resolvedTiddly = '/ipfs/bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy'
const ipfsIdentifier = {
  protocol: 'ipfs',
  cid: 'bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy',
}
const keys = [
  {
    id: 'QmZLTGyFGnbmYJoitU6cRCb8SwWEkgTz4EQgbKydxWyDsJ',
    name: 'self',
  },
  {
    id: 'QmNQhkAtdGVjK5Ehck8jx7QHQoz9pxUnnc12fGJP8MuqyL',
    name: 'documentation',
  },
  {
    id: '12D3KooWSXMEzThypkZHkMt7XnbKHRvMb9gVwGH7UCZyHtoSgJQP',
    name: 'tiddly',
  },
]

before(() => {
  globalThis.log = log
  const logger = log.getLogger('ipfs')
  logger.setLevel('silent', false)
})

describe('IPNS', () => {
  it('Undefined IPNS identifiers...', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    try {
      await ipfsWrapper.getIpnsIdentifier()
    } catch (error) {
      expect(error.message).to.equal('Undefined IPNS identifiers...')
    }
  })
  it('Unknown IPNS identifier', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.keyList = sinon.fake.returns(null)
    try {
      await ipfsWrapper.getIpnsIdentifier(null, 'dummy')
    } catch (error) {
      expect(error.message).to.equal('Unknown IPNS identifier...')
    }
  })
})
describe('IPNS key and IPNS name', () => {
  it('Unknown IPNS key and IPNS name', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.keyList = sinon.fake.returns(keys)
    try {
      await ipfsWrapper.getIpnsIdentifier(null, 'dummy', 'dummy')
    } catch (error) {
      expect(error.message).to.equal('Unknown IPNS identifier...')
    }
  })
  it('Fetch IPNS key and IPNS name', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.keyList = sinon.fake.returns(keys)
    const { ipnsKey, ipnsName } = await ipfsWrapper.getIpnsIdentifier(null, 'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0', null, null, 'tiddly')
    expect(ipnsName === 'tiddly' && ipnsKey === 'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0').to.be.true
  })
})
describe('IPNS name', () => {
  it('Unknown IPNS name', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.keyList = sinon.fake.returns(keys)
    try {
      await ipfsWrapper.getIpnsIdentifier(null, null, null, null, 'dummy')
    } catch (error) {
      expect(error.message).to.equal('Unknown IPNS identifier...')
    }
  })
  it('Fetch IPNS key and IPNS name', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.keyList = sinon.fake.returns(keys)
    const { ipnsKey, ipnsName } = await ipfsWrapper.getIpnsIdentifier(null, null, null, null, 'tiddly')
    expect(ipnsName === 'tiddly' && ipnsKey === 'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0').to.be.true
  })
})
describe('IPNS identifier', () => {
  it('Unknown IPNS key.', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.keyList = sinon.fake.returns(keys)
    try {
      await ipfsWrapper.getIpnsIdentifier(null, 'dummy')
    } catch (error) {
      expect(error.message).to.equal('Unknown IPNS identifier...')
    }
  })
  it('Fetch IPNS key and IPNS name from an IPNS key', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.keyList = sinon.fake.returns(keys)
    const { ipnsKey, ipnsName } = await ipfsWrapper.getIpnsIdentifier(null, 'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0')
    expect(ipnsName === 'tiddly' && ipnsKey === 'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0').to.be.true
  })
  it('Fetch IPNS key and IPNS name from an IPNS name', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.keyList = sinon.fake.returns(keys)
    const { ipnsKey, ipnsName } = await ipfsWrapper.getIpnsIdentifier(null, 'tiddly')
    expect(ipnsName === 'tiddly' && ipnsKey === 'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0').to.be.true
  })
})
describe('Resolve IPNS', () => {
  it('Resolve IPNS key', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.nameResolve = sinon.fake.returns(resolvedTiddly)
    ipfsWrapper.ipfsBundle.getIpfsIdentifier = sinon.fake.returns(ipfsIdentifier)
    const resolved = await ipfsWrapper.resolveIpnsKey(null, '12D3KooWSXMEzThypkZHkMt7XnbKHRvMb9gVwGH7UCZyHtoSgJQP')
    expect(resolved === 'bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy').to.be.true
  })
  it('Unassigned IPNS key.', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsUrl.getDocumentUrl = sinon.fake.returns(base)
    ipfsWrapper.ipfsLibrary.keyList = sinon.fake.returns(keys)
    try {
      await ipfsWrapper.resolveIpnsKey(null, '12D3KooWSXMEzThypkZHkMt7XnbKHRvMb9gVwGH7UCZyHtoSgJQP')
    } catch (error) {
      expect(error.message).to.equal('Failed to resolve an IPNS key...')
    }
  })
})
