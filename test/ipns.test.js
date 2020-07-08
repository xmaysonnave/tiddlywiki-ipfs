/*eslint no-unused-vars:"off"*/
/*global jest,beforeAll,describe,it,expect*/
'use strict'

const IpfsBundle = require('../build/plugins/ipfs/ipfs-bundle.js').IpfsBundle
const IpfsWrapper = require('../build/plugins/ipfs/ipfs-wrapper.js').IpfsWrapper
const log = require('loglevel')
const root = require('window-or-global')
const { URL } = require('universal-url')
const base = new URL('https://ipfs.infura.io/')
const resolvedTiddly =
  '/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau'
const decodedCid = {
  protocol: 'ipfs',
  cid: 'bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau'
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
    id: 'QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf',
    name: 'tiddly'
  }
]
beforeAll(() => {
  root.logger = log
  log.setLevel('silent', false)
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
      'QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf',
      'tiddly'
    )
    expect(
      ipnsName === 'tiddly' &&
        ipnsKey === 'QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf'
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
      await ipfsWrapper.getIpnsIdentifiers(null, null, 'dummy')
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
      'tiddly'
    )
    expect(
      ipnsName === 'tiddly' &&
        ipnsKey === 'QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf'
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
      'QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf'
    )
    expect(
      ipnsName === 'tiddly' &&
        ipnsKey === 'QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf'
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
        ipnsKey === 'QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf'
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
      'QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf'
    )
    expect(
      resolved === 'bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau'
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
        'QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf'
      )
    } catch (error) {
      expect(error.message).toBe('Failed to resolve an IPNS key...')
    }
  })
})
