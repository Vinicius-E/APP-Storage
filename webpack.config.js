const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add support for .webp files
  config.module.rules.push({
    test: /\.webp$/i,
    type: 'asset/resource',
  });

  return config;
};
