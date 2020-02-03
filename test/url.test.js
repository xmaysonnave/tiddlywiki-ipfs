/* global jest, beforeAll, describe, it, expect */
"use strict";

const log = require("loglevel");
const root = require("window-or-global");
const { URL } = require("whatwg-url");

const IpfsUri = require("../build/plugins/ipfs/ipfs-uri.js").IpfsUri;

const localDocument = new URL("file:///work/tiddly/tiddlywiki-ipfs/wiki/index.html");
const remoteDocument = new URL("https://ipfs.bluelightav.org/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");
const api = new URL("https://api.bluelightav.org");
const gateway = new URL("https://gateway.bluelightav.org");
const eth = new URL("https://bluelightav.eth.link/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");
const ethLink = new URL("https://bluelightav.eth.link/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");

const name = "_canonical_uri";
const relative = "/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau";

jest.mock("../build/plugins/ipfs/ens-library.js");

beforeAll(() => {
  root.log = log;
  log.setLevel("silent", false);
});

describe("API URL", () => {

  it("Valid", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.ensLibrary.getIpfsApiUrl.mockReturnValue(api);
    const parsed = ipfsUri.getIpfsApiUrl(api);
    expect(parsed.href === api.href).toBeTruthy();
  });

  it("Invalid", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.ensLibrary.getIpfsApiUrl.mockImplementation(() => {
      throw new Error("Mocked Error");
    });
    try {
      ipfsUri.getIpfsApiUrl()
    } catch (error) {
      expect(error.message).toBe("Invalid IPFS API URL...");
    }
  });

});

describe("Document URL", () => {

  it("Valid", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.ensLibrary.getDocumentUrl.mockReturnValue(remoteDocument);
    const parsed = ipfsUri.getDocumentUrl(remoteDocument);
    expect(parsed.href === remoteDocument.href).toBeTruthy();
  });

  it("Invalid", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.ensLibrary.getDocumentUrl.mockImplementation(() => {
      throw new Error("Mocked Error");
    });
    try {
      ipfsUri.getDocumentUrl()
    } catch (error) {
      expect(error.message).toBe("Invalid current HTML Document URL...");
    }
  });

});

describe("Gateway URL", () => {

  it("Valid", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.ensLibrary.getIpfsGatewayUrl.mockReturnValue(gateway);
    const parsed = ipfsUri.getIpfsGatewayUrl();
    expect(parsed.href === gateway.href).toBeTruthy();
  });

  it("Invalid", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.ensLibrary.getIpfsGatewayUrl.mockImplementation(() => {
      throw new Error("Mocked Error");
    });
    try {
      ipfsUri.getIpfsGatewayUrl()
    } catch (error) {
      expect(error.message).toBe("Invalid IPFS Gateway URL...");
    }
  });

});

describe("URL", () => {

  it("Valid", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.ensLibrary.getUrl.mockReturnValue(api);
    const parsed = ipfsUri.getUrl(api);
    expect(parsed.href === api.href).toBeTruthy();
  });

  it("Invalid", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.ensLibrary.getUrl.mockImplementation(() => {
      throw new Error("Mocked Error");
    });
    try {
      ipfsUri.getUrl()
    } catch (error) {
      expect(error.message).toBe("Invalid URL...");
    }
  });

});

describe("Normalize URL", () => {

  it("Relative. Fallback to Document URL...", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.ensLibrary.getDocumentUrl.mockReturnValue(remoteDocument);
    ipfsUri.ensLibrary.getIpfsGatewayUrl.mockReturnValue(gateway);
    ipfsUri.ensLibrary.getUrl.mockReturnValue(new URL(relative, remoteDocument.toString()));
    const parsed = ipfsUri.normalizeUrl(name, relative);
    expect(parsed.href === remoteDocument.protocol + "//" + remoteDocument.hostname + relative).toBeTruthy();
  });

  it("Relative. Fallback to Gateway URL...", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.ensLibrary.getDocumentUrl.mockReturnValue(localDocument);
    ipfsUri.ensLibrary.getIpfsGatewayUrl.mockReturnValue(gateway);
    ipfsUri.ensLibrary.getUrl.mockReturnValue(new URL(relative, gateway.toString()));
    const parsed  = ipfsUri.normalizeUrl(name, relative);
    expect(parsed.href === gateway.protocol + "//" + gateway.hostname + relative).toBeTruthy();
  });

  it("Remove dot link...", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.ensLibrary.getUrl.mockReturnValue(ethLink);
    const parsed = ipfsUri.normalizeUrl(name, ethLink.toString());
    expect(parsed.href === eth.href).toBeTruthy();
  });

});
