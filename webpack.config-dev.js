const path = require('path');

const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  mode: "development",
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'WebRTCMetrics.js',
    library: {
      type: 'umd',
      name: "WebRTCMetrics",
      export: 'default',
    },
  },
  plugins: [new ESLintPlugin()],
};
