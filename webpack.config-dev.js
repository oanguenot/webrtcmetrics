const path = require('path');

const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  mode: "development",
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'JSONgle.js',
    library: {
      name: 'JSONgle',
      type: 'umd',
    },
  },
  plugins: [new ESLintPlugin()],
};
