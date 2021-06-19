module.exports = function (api) {
  api.cache(false)
  return {
    presets: [
      [
        '@babel/preset-env',
        {
          useBuiltIns: 'usage',
          corejs: { version: 3, proposals: true },
          debug: false,
        },
      ],
    ],
    plugins: [
      [
        '@babel/plugin-transform-runtime',
        {
          version: '^7.14.6', // @babel/runtime-corejs3
        },
      ],
    ],
  }
}
