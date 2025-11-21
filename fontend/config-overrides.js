const webpack = require("webpack");

module.exports = function override(config) {
  config.resolve.fallback = {
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    assert: require.resolve("assert/"),
    url: require.resolve("url/"),
    https: require.resolve("https-browserify"),
    http: require.resolve("stream-http"),
    util: require.resolve("util/"),
    zlib: require.resolve("browserify-zlib"),
    process: require.resolve("process/browser.js"),
    buffer: require.resolve("buffer/")
  };

  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: "process/browser.js",
      Buffer: ["buffer", "Buffer"]
    })
  ]);

  // Fix lỗi "fully specified"
  config.module.rules.forEach(rule => {
    if (rule.resolve) {
      rule.resolve.fullySpecified = false;
    }
  });

  return config;
};
