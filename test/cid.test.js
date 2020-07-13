/*eslint no-unused-vars:"off"*/
/*global jest,beforeAll,describe,it,expect*/
'use strict'

const IpfsBundle = require('../build/plugins/ipfs/ipfs-bundle.js').IpfsBundle
const log = require('loglevel')
const root = require('window-or-global')
const rsa2048V0 = 'Qmbo8QtR4mKpX7zCN8WqTLcbRpifvz83C1ogVV2s1H2uzH'
const ed25519V0 = '12D3KooWSXMEzThypkZHkMt7XnbKHRvMb9gVwGH7UCZyHtoSgJQP'
const ed25519Base32V1 =
  'bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy'
const ed25519Base36V1 =
  'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0'
beforeAll(() => {
  root.logger = log
  log.setLevel('silent', false)
})
describe('CID', () => {
  it('Undefined pathname', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid()
    expect(
      ipnsIdentifier == null && protocol == null && cid == null
    ).toBeTruthy()
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid('')
    expect(
      ipnsIdentifier == null && protocol == null && cid == null
    ).toBeTruthy()
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid('/')
    expect(
      ipnsIdentifier == null && protocol == null && cid == null
    ).toBeTruthy()
  })
  it('Incorrect pathname', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid('Hello World')
    expect(
      ipnsIdentifier == null && protocol == null && cid == null
    ).toBeTruthy()
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid('/Hello/World')
    expect(
      ipnsIdentifier == null && protocol == null && cid == null
    ).toBeTruthy()
  })
  it('Invalid IPFS cid', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid(
      '/ipfs/Hello World'
    )
    expect(
      ipnsIdentifier == null && protocol === 'ipfs' && cid == null
    ).toBeTruthy()
  })
  it('Decode IPFS cid', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid(
      '/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau'
    )
    expect(
      ipnsIdentifier == null &&
        protocol === 'ipfs' &&
        cid === 'bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau'
    ).toBeTruthy()
  })
  it('Decode IPNS key', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid(
      '/ipns/QmVDNdJNsTN2wxHCu75hvAAx659dTUUHDAKV53TJ8q6LzT'
    )
    expect(
      cid == null &&
        protocol === 'ipns' &&
        ipnsIdentifier === 'QmVDNdJNsTN2wxHCu75hvAAx659dTUUHDAKV53TJ8q6LzT'
    ).toBeTruthy()
  })
  it('Decode IPNS name', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid(
      '/ipns/bluelightav.eth'
    )
    expect(
      cid == null && protocol === 'ipns' && ipnsIdentifier === 'bluelightav.eth'
    ).toBeTruthy()
  })
  it('rsa2048V0 CID', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    expect(ipfsBundle.isCid(rsa2048V0)).toBeTruthy()
  })
  it('ed25519V0 CID', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    expect(ipfsBundle.isCid(ed25519V0)).toBeTruthy()
  })
  it('ed25519Base32V1 CID', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    expect(ipfsBundle.isCid(ed25519Base32V1)).toBeTruthy()
  })
  it('ed25519Base36V1 CID', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    expect(ipfsBundle.isCid(ed25519Base36V1)).toBeTruthy()
  })
})
