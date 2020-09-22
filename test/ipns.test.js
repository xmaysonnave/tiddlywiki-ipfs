/*eslint no-unused-vars:"off"*/
/*global jest,beforeAll,describe,it,expect*/
'use strict'

const IpfsBundle = require('../src/plugins/ipfs/ipfs-bundle.js').IpfsBundle
const IpfsWrapper = require('../src/plugins/ipfs/ipfs-wrapper.js').IpfsWrapper
const log = require('loglevel')
const base = new URL('https://ipfs.infura.io/')
const resolvedTiddly =
  '/ipfs/bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy'
const decodedCid = {
  protocol: 'ipfs',
  cid: 'bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy'
}
const keys = [
  {
    id: 'QmZLTGyFGnbmYJoitU6cRCb8SwWEkgTz4EQgbKydxWyDsJ',
    name: 'self'
  },
  {
    id: 'QmNQhkAtdGVjK5Ehck8jx7QHQoz9pxUnnc12fGJP8MuqyL',
    name: 'documentation'
  },
  {
    id: '12D3KooWSXMEzThypkZHkMt7XnbKHRvMb9gVwGH7UCZyHtoSgJQP',
    name: 'tiddly'
  }
]
beforeAll(() => {
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
      await ipfsWrapper.getIpnsIdentifiers()
    } catch (error) {
      expect(error.message).toBe('Undefined IPNS identifiers...')
    }
  })
  it('Unknown IPNS identifier', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.getKeys = jest.fn()
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(null)
    try {
      await ipfsWrapper.getIpnsIdentifiers(null, 'dummy')
    } catch (error) {
      expect(error.message).toBe('Unknown IPNS identifier...')
    }
  })
})
describe('IPNS key and IPNS name', () => {
  it('Unknown IPNS key and IPNS name', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.getKeys = jest.fn()
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys)
    try {
      await ipfsWrapper.getIpnsIdentifiers(null, 'dummy', 'dummy')
    } catch (error) {
      expect(error.message).toBe('Unknown IPNS identifier...')
    }
  })
  it('Fetch IPNS key and IPNS name', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.getKeys = jest.fn()
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys)
    const { ipnsKey, ipnsName } = await ipfsWrapper.getIpnsIdentifiers(
      null,
      'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0',
      null,
      'tiddly'
    )
    expect(
      ipnsName === 'tiddly' &&
        ipnsKey ===
          'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0'
    ).toBeTruthy()
  })
})
describe('IPNS name', () => {
  it('Unknown IPNS name', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.getKeys = jest.fn()
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys)
    try {
      await ipfsWrapper.getIpnsIdentifiers(null, null, null, 'dummy')
    } catch (error) {
      expect(error.message).toBe('Unknown IPNS identifier...')
    }
  })
  it('Fetch IPNS key and IPNS name', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.getKeys = jest.fn()
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys)
    const { ipnsKey, ipnsName } = await ipfsWrapper.getIpnsIdentifiers(
      null,
      null,
      null,
      'tiddly'
    )
    expect(
      ipnsName === 'tiddly' &&
        ipnsKey ===
          'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0'
    ).toBeTruthy()
  })
})
describe('IPNS identifier', () => {
  it('Unknown IPNS key.', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.getKeys = jest.fn()
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys)
    try {
      await ipfsWrapper.getIpnsIdentifiers(null, 'dummy')
    } catch (error) {
      expect(error.message).toBe('Unknown IPNS identifier...')
    }
  })
  it('Fetch IPNS key and IPNS name from an IPNS key', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.getKeys = jest.fn()
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys)
    const { ipnsKey, ipnsName } = await ipfsWrapper.getIpnsIdentifiers(
      null,
      'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0'
    )
    expect(
      ipnsName === 'tiddly' &&
        ipnsKey ===
          'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0'
    ).toBeTruthy()
  })
  it('Fetch IPNS key and IPNS name from an IPNS name', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.getKeys = jest.fn()
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys)
    const { ipnsKey, ipnsName } = await ipfsWrapper.getIpnsIdentifiers(
      null,
      'tiddly'
    )
    expect(
      ipnsName === 'tiddly' &&
        ipnsKey ===
          'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0'
    ).toBeTruthy()
  })
})
describe('Resolve IPNS', () => {
  it('Resolve IPNS key', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsLibrary.resolve = jest.fn()
    ipfsWrapper.ipfsLibrary.resolve.mockResolvedValue(resolvedTiddly)
    ipfsWrapper.ipfsBundle.decodeCid = jest.fn()
    ipfsWrapper.ipfsBundle.decodeCid.mockReturnValue(decodedCid)
    const resolved = await ipfsWrapper.resolveIpnsKey(
      null,
      '12D3KooWSXMEzThypkZHkMt7XnbKHRvMb9gVwGH7UCZyHtoSgJQP'
    )
    expect(
      resolved ===
        'bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy'
    ).toBeTruthy()
  })
  it('Unassigned IPNS key.', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsWrapper = new IpfsWrapper(ipfsBundle)
    ipfsWrapper.ipfsUrl.getDocumentUrl = jest.fn()
    ipfsWrapper.ipfsUrl.getDocumentUrl.mockReturnValueOnce(base)
    ipfsWrapper.ipfsLibrary.getKeys = jest.fn()
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys)
    try {
      await ipfsWrapper.resolveIpnsKey(
        null,
        '12D3KooWSXMEzThypkZHkMt7XnbKHRvMb9gVwGH7UCZyHtoSgJQP'
      )
    } catch (error) {
      expect(error.message).toBe('Failed to resolve an IPNS key...')
    }
  })
})
