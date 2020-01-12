/* global jest, describe, it, expect, beforeAll */
"use strict";

const IpfsWrapper = require("../build/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

const unknown = "QmQQWAWNBZqiB9u8ykiT2Jjf5mg8vKiQoVaUoJNC7QRBS8";

const resolvedTiddly = "/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau";

const decodedCid = {
  protocol: "ipfs",
  cid: "bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau"
};

const keys = [
  {
    id: "QmZLTGyFGnbmYJoitU6cRCb8SwWEkgTz4EQgbKydxWyDsJ",
    name: "self"
  },
  {
    id: "QmNQhkAtdGVjK5Ehck8jx7QHQoz9pxUnnc12fGJP8MuqyL",
    name: "documentation"
  },
  {
    id: "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf",
    name: "tiddly"
  }
];

jest.mock("../build/plugins/ipfs/ipfs-library.js");

describe("IPNS", () => {

  it("Undefined IPNS key and IPNS Name. ipnsName and ipnsKey are undefined.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    const { error, ipnsName, ipnsKey, resolved } = await ipfsWrapper.resolveIpns();
    expect(
      error !== null
      && error.message === "Undefined IPNS key and IPNS Name..."
      && ipnsName == null
      && ipnsKey == null
      && resolved == null
    ).toBeTruthy()
  });

  it("Unknown IPNS key. ipnsName is undefined, ipnsKey is defined, ipnsKey is unknown.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    const { error, ipnsName, ipnsKey, resolved } = await ipfsWrapper.resolveIpns(null, unknown, null);
    expect(
      error !== null
      && error.message === "Unknown IPNS key..."
      && ipnsName == null
      && ipnsKey == null
      && resolved == null
    ).toBeTruthy()
  });

  it("Resolve an IPNS key. ipnsKey is defined and known.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.resolve.mockResolvedValue(resolvedTiddly);
    const { error, resolved } = await ipfsWrapper.resolveIpnsKey(null, "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf");
    expect(
      error == null
      && resolved === resolvedTiddly
    ).toBeTruthy()
  });

  it("Resolve IPNS key. ipnsName is undefined, ipnsKey is defined and known.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    ipfsWrapper.ipfsLibrary.resolve.mockResolvedValue(resolvedTiddly);
    ipfsWrapper.ipfsLibrary.decodeCid.mockResolvedValue(decodedCid);
    const { error, ipnsName, ipnsKey, resolved } = await ipfsWrapper.resolveIpns(null, "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf", null);
    expect(
      error == null
      && ipnsName === "tiddly"
      && ipnsKey === "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf"
      && resolved === "bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau"
    ).toBeTruthy()
  });

});
