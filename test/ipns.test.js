/* global jest, describe, it, expect, beforeAll */
"use strict";

const IpfsWrapper = require("../build/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

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

  it("Undefined IPNS key and IPNS name.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    const { error, ipnsName, ipnsKey, resolved } = await ipfsWrapper.resolveIpns();
    expect(
      error !== null
      && error.message === "Undefined IPNS key and IPNS name..."
      && ipnsName == null
      && ipnsKey == null
      && resolved == null
    ).toBeTruthy()
  });

  it("Unknown IPNS keys.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(null);
    const { error, ipnsName, ipnsKey, resolved } = await ipfsWrapper.resolveIpns(null, "dummy", null);
    expect(
      error !== null
      && error.message === "Failed to fetch IPNS keys..."
      && ipnsName == null
      && ipnsKey == null
      && resolved == null
    ).toBeTruthy()
  });

});

describe("IPNS key and IPNS name", () => {

  it("Unknown IPNS key and IPNS name.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    const { error, ipnsName, ipnsKey, resolved } = await ipfsWrapper.resolveIpns(null, "dummy", "dummy");
    expect(
      error !== null
      && error.message === "Unknown IPNS key and IPNS name..."
      && ipnsName == null
      && ipnsKey == null
      && resolved == null
    ).toBeTruthy()
  });

  it("Resolve unassigned IPNS key and IPNS name.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    const { error, ipnsName, ipnsKey, resolved } = await ipfsWrapper.resolveIpns(null, "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf", "tiddly");
    expect(
      error !== null
      && error.message === "Failed to resolve IPNS key..."
      && ipnsName === "tiddly"
      && ipnsKey === "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf"
      && resolved === null
    ).toBeTruthy()
  });

  it("Resolve IPNS key and IPNS name.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    ipfsWrapper.ipfsLibrary.resolve.mockResolvedValue(resolvedTiddly);
    ipfsWrapper.ipfsLibrary.decodeCid.mockResolvedValue(decodedCid);
    const { error, ipnsName, ipnsKey, resolved } = await ipfsWrapper.resolveIpns(null, "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf", "tiddly");
    expect(
      error == null
      && ipnsName === "tiddly"
      && ipnsKey === "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf"
      && resolved === "bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau"
    ).toBeTruthy()
  });

});

describe("IPNS name", () => {

  it("Unknown IPNS name.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    const { error, ipnsName, ipnsKey, resolved } = await ipfsWrapper.resolveIpns(null, null, "dummy");
    expect(
      error !== null
      && error.message === "Unknown IPNS name..."
      && ipnsName == null
      && ipnsKey == null
      && resolved == null
    ).toBeTruthy()
  });

  it("Resolve Unassigned IPNS name.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    const { error, ipnsName, ipnsKey, resolved } = await ipfsWrapper.resolveIpns(null, null, "tiddly");
    expect(
      error !== null
      && error.message === "Failed to resolve IPNS key..."
      && ipnsName === "tiddly"
      && ipnsKey === "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf"
      && resolved === null
    ).toBeTruthy()
  });

  it("Resolve IPNS name.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    ipfsWrapper.ipfsLibrary.resolve.mockResolvedValue(resolvedTiddly);
    ipfsWrapper.ipfsLibrary.decodeCid.mockResolvedValue(decodedCid);
    const { error, ipnsName, ipnsKey, resolved } = await ipfsWrapper.resolveIpns(null, null, "tiddly");
    expect(
      error == null
      && ipnsName === "tiddly"
      && ipnsKey === "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf"
      && resolved === "bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau"
    ).toBeTruthy()
  });

});

describe("IPNS key", () => {

  it("Unknown IPNS key.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    const { error, ipnsName, ipnsKey, resolved } = await ipfsWrapper.resolveIpns(null, "dummy", null);
    expect(
      error !== null
      && error.message === "Unknown IPNS key..."
      && ipnsName == null
      && ipnsKey == null
      && resolved == null
    ).toBeTruthy()
  });

  it("Resolve one IPNS key.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.resolve.mockResolvedValue(resolvedTiddly);
    const { error, resolved } = await ipfsWrapper.resolveIpnsKey(null, "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf");
    expect(
      error == null
      && resolved === resolvedTiddly
    ).toBeTruthy()
  });

  it("Resolve unassigned IPNS key.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    const { error, ipnsName, ipnsKey, resolved } = await ipfsWrapper.resolveIpns(null, "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf", null);
    expect(
      error !== null
      && error.message === "Failed to resolve IPNS key..."
      && ipnsName === "tiddly"
      && ipnsKey === "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf"
      && resolved === null
    ).toBeTruthy()
  });

  it("Resolve IPNS key.", async () => {
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
