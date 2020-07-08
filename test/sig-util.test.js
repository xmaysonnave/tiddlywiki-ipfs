/*eslint no-unused-vars:"off"*/
/*global jest,beforeAll,describe,it,expect*/
'use strict'

const sigUtil = require('eth-sig-util')
const publicKey = '0x526883Cff4F761343181999f47b76B9271Aa73Dc'
const derivedPublicKey = '6yzMxyMBxlKRxZSGaLuN3GEZkOaFjuejFGhYfKIRXWI='
const privateKey =
  '63c350a479ced6783e76c68668d7b639f8dd38bdf3d83f68d1a77a41feab26e7'
const message = 'Hello, world!'
beforeAll(() => {})
describe('Encrypt', () => {
  it('encrypt', async () => {
    const outputText = sigUtil.encrypt(
      derivedPublicKey,
      { data: message },
      'x25519-xsalsa20-poly1305'
    )
    const result = sigUtil.decrypt(outputText, privateKey)
    expect(message === result).toBeTruthy()
  })
  it('encrypt Safely', async () => {
    const outputText = sigUtil.encryptSafely(
      derivedPublicKey,
      { data: message },
      'x25519-xsalsa20-poly1305'
    )
    const result = sigUtil.decryptSafely(outputText, privateKey)
    expect(message === result).toBeTruthy()
  })
})
describe('EncryptionPublicKey', () => {
  it('getEncryptionPublicKey', async () => {
    const encryptionPublicKey = sigUtil.getEncryptionPublicKey(privateKey)
    expect(encryptionPublicKey === derivedPublicKey).toBeTruthy()
  })
})
