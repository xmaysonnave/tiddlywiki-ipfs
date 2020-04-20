/* global jest, beforeAll, describe, it, expect */
"use strict";

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

const log = require("loglevel");
const root = require("window-or-global");

const IpfsUri = require("../build/plugins/ipfs/ipfs-bundle.js").IpfsUri;

const invalid = "Wrong URL...";
const baseFile = "file:///work/tiddly/tiddlywiki-ipfs/wiki/index.html";
const baseHttp = "https://ipfs.bluelightav.org";
const absolute = "https://bluelightav.eth";
const relative = "/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau";

beforeAll(() => {
  root.log = log;
  log.setLevel("silent", false);
});

describe("WHATWG-URL", () => {
  it("Undefined URL", () => {
    const ipfsUri = new IpfsUri.IpfsUri();
    expect(() => {
      ipfsUri.getUrl();
    }).toThrow();
  });

  it("Invalid URL", () => {
    const ipfsUri = new IpfsUri.IpfsUri();
    expect(() => {
      ipfsUri.getUrl(invalid);
    }).toThrow();
  });

  it("File protocol URL", () => {
    const ipfsUri = new IpfsUri.IpfsUri();
    const parsed = ipfsUri.getUrl(baseHttp);
    expect(
      parsed.protocol === "https:" &&
        parsed.origin === baseHttp &&
        parsed.pathname === "/" &&
        parsed.search === "" &&
        parsed.hash === "" &&
        parsed.href === baseHttp + "/"
    ).toBeTruthy();
  });

  it("File protocol URL", () => {
    const ipfsUri = new IpfsUri.IpfsUri();
    const parsed = ipfsUri.getUrl(baseFile);
    expect(
      parsed.protocol === "file:" &&
        parsed.origin === "file://" &&
        parsed.pathname === "/work/tiddly/tiddlywiki-ipfs/wiki/index.html" &&
        parsed.href === baseFile
    ).toBeTruthy();
  });

  it("Useless base HTTP URL", () => {
    const ipfsUri = new IpfsUri.IpfsUri();
    const parsed = ipfsUri.getUrl(absolute, baseHttp);
    expect(
      parsed.protocol === "https:" && parsed.hostname === "bluelightav.eth" && parsed.href == absolute + "/"
    ).toBeTruthy();
  });

  it("Relative URL", () => {
    const ipfsUri = new IpfsUri.IpfsUri();
    const parsed = ipfsUri.getUrl(relative, baseHttp);
    expect(parsed.href === baseHttp + relative).toBeTruthy();
  });
});
