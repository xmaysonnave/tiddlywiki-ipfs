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
 * https://url.spec.whatwg.org/
 */

const log = require("loglevel");
const root = require("window-or-global");

const EnsLibrary = require("../build/plugins/ipfs/ens-library.js").EnsLibrary;

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
    const ensLibrary = new EnsLibrary();
    expect(() => {
      ensLibrary.getUrl();
    }).toThrow();
  });

  it("Invalid URL", () => {
    const ensLibrary = new EnsLibrary();
    expect(() => {
      ensLibrary.getUrl(invalid);
    }).toThrow();
  });

  it("File protocol URL", () => {
    const ensLibrary = new EnsLibrary();
    const parsed = ensLibrary.getUrl(baseHttp);
    expect(
      parsed.protocol === "https:"
      && parsed.origin === baseHttp
      && parsed.pathname === "/"
      && parsed.search === ""
      && parsed.hash === ""
      && parsed.href === baseHttp + "/"
    ).toBeTruthy();
  });

  it("File protocol URL", () => {
    const ensLibrary = new EnsLibrary();
    const parsed = ensLibrary.getUrl(baseFile);
    expect(
      parsed.protocol === "file:"
      && parsed.origin === "null"
      && parsed.pathname === "/work/tiddly/tiddlywiki-ipfs/wiki/index.html"
      && parsed.href === baseFile
    ).toBeTruthy();
  });

  it("Useless base HTTP URL", () => {
    const ensLibrary = new EnsLibrary();
    const parsed = ensLibrary.getUrl(absolute, baseHttp);
    expect(
      parsed.protocol === "https:"
      && parsed.hostname === "bluelightav.eth"
      && parsed.href == absolute + "/"
    ).toBeTruthy();
  });

  it("Relative URL", () => {
    const ensLibrary = new EnsLibrary();
    const parsed = ensLibrary.getUrl(relative, baseHttp);
    expect(
      parsed.href === baseHttp + relative
    ).toBeTruthy();
  });

});
