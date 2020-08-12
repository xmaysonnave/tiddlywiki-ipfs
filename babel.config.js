module.exports = function (api) {
  // Only execute this file once and cache the resulted config object below for the next babel uses.
  // more info about the babel config caching can be found here: https://babeljs.io/docs/en/config-files#apicache
  api.cache.using(() => process.env.NODE_ENV)

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          useBuiltIns: 'entry',
          corejs: 3
        }
      ]
    ],
    plugins: [
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-nullish-coalescing-operator',
      '@babel/plugin-proposal-object-rest-spread',
      '@babel/plugin-proposal-optional-chaining',
      [
        '@babel/plugin-transform-runtime',
        {
          corejs: 3
        }
      ]
    ]
  }
}
