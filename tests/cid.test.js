/*eslint no-unused-expressions:"off"*/
/*eslint no-undef:"off"*/
;('use strict')

const log = require('loglevel')
const chai = require('chai')
const IpfsBundle = require('../core/modules/ipfs-bundle.js').IpfsBundle

const { assert, expect } = chai

// IPFS
const sha256Base58V0 = 'QmcRQfcRTAa4cqCUSiQr9J1QQS3A3gXzkBKrGLmd8WAHTB'
const sha256Base32V1 = 'bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy'
// IPNS Key
const rsa2048Base58V0 = 'Qmbo8QtR4mKpX7zCN8WqTLcbRpifvz83C1ogVV2s1H2uzH'
const ed25519Base58V0 = '12D3KooWSXMEzThypkZHkMt7XnbKHRvMb9gVwGH7UCZyHtoSgJQP'
const ed25519DagPbBase32V1 = 'bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy'
const ed25519Libp2pKeyBase32V1 = 'bafzaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy'
const ed25519Base36V1 = 'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0'

before(() => {
  globalThis.log = log
  const logger = log.getLogger('ipfs')
  logger.setLevel('silent', false)
})

describe('CID', () => {
  it('Undefined', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid()
    expect(ipnsIdentifier == null && protocol == null && cid == null).to.be.true
  })
  it('Empty', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid('')
    expect(ipnsIdentifier == null && protocol == null && cid == null).to.be.true
  })
  it('Incorrect', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid('/')
    expect(ipnsIdentifier == null && protocol == null && cid == null).to.be.true
  })
  it('Malformed', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid('Hello World')
    expect(ipnsIdentifier == null && protocol == null && cid == null).to.be.true
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid('/Hello/World')
    expect(ipnsIdentifier == null && protocol == null && cid == null).to.be.true
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid(ipfsUrl.getUrl('https://ipfs.infura.io'))
    expect(ipnsIdentifier == null && protocol == null && cid == null).to.be.true
  })
  it('Invalid IPFS cid', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid('/ipfs/Hello World')
    expect(ipnsIdentifier == null && protocol === null && cid == null).to.be.true
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid(ipfsUrl.getUrl('https://gateway.ipfs.io'))
    expect(ipnsIdentifier == null && protocol == null && cid == null).to.be.true
  })
  it('Decode IPFS cid', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    var { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid('/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau')
    expect(ipnsIdentifier == null && protocol === 'ipfs' && cid === 'bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau').to.be.true
    var { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid(ipfsUrl.getUrl('https://bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau.ipfs.ipfs.bluelightav.eth'))
    expect(ipnsIdentifier == null && protocol === 'ipfs' && cid === 'bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau').to.be.true
  })
  it('Decode IPNS key', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    var { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid('/ipns/QmVDNdJNsTN2wxHCu75hvAAx659dTUUHDAKV53TJ8q6LzT')
    expect(cid == null && protocol === 'ipns' && ipnsIdentifier === 'QmVDNdJNsTN2wxHCu75hvAAx659dTUUHDAKV53TJ8q6LzT').to.be.true
    var { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid(ipfsUrl.getUrl('https://k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0.ipns.ipfs.bluelightav.eth'))
    expect(cid == null && protocol === 'ipns' && ipnsIdentifier === 'k51qzi5uqu5dmdbdlz9ccv1ze114psij95j5kzqszhy952g6qllvm3x52oava0').to.be.true
  })
  it('Decode IPNS name', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const ipfsUrl = ipfsBundle.ipfsUrl
    var { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid('/ipns/bluelightav.eth')
    expect(cid == null && protocol === 'ipns' && ipnsIdentifier === 'bluelightav.eth').to.be.true
    var { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid(ipfsUrl.getUrl('https://tiddly.ipns.ipfs.bluelightav.eth'))
    expect(cid == null && protocol === 'ipns' && ipnsIdentifier === 'tiddly').to.be.true
  })
  it('rsa2048Base58V0 CID', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    assert(ipfsBundle.getCid(rsa2048Base58V0))
  })
  it('ed25519Base58V0 CID', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    assert(ipfsBundle.getCid(ed25519Base58V0))
  })
  it('ed25519DagPbBase32V1 CID', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    assert(ipfsBundle.getCid(ed25519DagPbBase32V1))
  })
  it('ed25519Libp2pKeyBase32V1 CID', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    assert(ipfsBundle.getCid(ed25519Libp2pKeyBase32V1))
  })
  it('ed25519Base36V1 CID', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    assert(ipfsBundle.getCid(ed25519Base36V1))
  })
  it('convert ed25519Base36V1 to ed25519Base32V1 CID', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const converted = ipfsBundle.cidToLibp2pKeyCidV1(ed25519Base36V1, 'base32', false)
    expect(converted.toString() === ed25519Libp2pKeyBase32V1).to.be.true
  })
  it('convert ed25519Base32V1 to ed25519Base58V0 CID', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const converted = ipfsBundle.cidToBase58CidV0(ed25519DagPbBase32V1)
    expect(converted.toString() === ed25519Base58V0).to.be.true
  })
  it('convert ed25519Base36V1 to ed25519Base58V0 CID', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const converted = ipfsBundle.cidToBase58CidV0(ed25519Base36V1)
    expect(converted.toString() === ed25519Base58V0).to.be.true
  })
  it('convert sha256Base32V1 to sha256Base58V0 CID', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const converted = ipfsBundle.cidToBase58CidV0(sha256Base32V1)
    expect(converted.toString() === sha256Base58V0).to.be.true
  })
  it('IPFS Protocol', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    var { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid('ipfs://bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy')
    expect(cid === 'bafybeigrhoshyutoif6pfy5ion35asrd2ojt5fgip5btenwfsriujw3ryy' && ipnsIdentifier == null && protocol === 'ipfs').to.be.true
  })
  it('IPNS Protocol', () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    var { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid('ipns://bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy')
    expect(cid == null && ipnsIdentifier === 'bafyaajaiaejcb6b2yghnz3fhjxpvopeer4jf5tx4cdyrddke2fl3vh6twkgrblgy' && protocol === 'ipns').to.be.true
  })
})
