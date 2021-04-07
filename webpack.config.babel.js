import { join } from "path";
const ESLintPlugin = require('eslint-webpack-plugin');

export default {
  entry: "./src/index",
  mode: "development",
  output: {
    path: join(__dirname, "dist"),
    libraryTarget: "umd",
    library: "WebRTCMetrics",
  },
  devtool: "source-map",
  stats: {
    colors: true,
  },
  module: {
    rules: [
      {
        test: /\.js/,
        exclude: /(node_modules|bower_components)/,
        use: [
          {
            loader: "babel-loader",
          },
        ],
      },
    ],
  },
  plugins: [new ESLintPlugin()],
};
