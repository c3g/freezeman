const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const GitRevisionPlugin = require('git-revision-webpack-plugin');
const gitRevisionPlugin = new GitRevisionPlugin();
const fs = require('fs');
const version = fs.readFileSync('../backend/VERSION', 'utf8');
const child_process = require('child_process')
const lastUpdate = child_process.execSync('git log -1 --format=%cI').toString().trim()

module.exports = (env, argv) => ({
  entry: ["babel-polyfill", path.resolve(__dirname, "./src/index.js")],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ["babel-loader"]
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.scss$/i,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
    ]
  },
  resolve: {
    extensions: ["*", ".js", ".jsx"]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
    filename: "bundle.js",
    chunkFilename: "[name].bundle.js"
  },
  optimization: {
    splitChunks: {
      chunks: "all"
    }
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: "FreezeMan",
      favicon: "./src/static/favicon-16x16.png",
      template: path.resolve(__dirname, "./src/template.html"),
      hash: true,
    }),
    new webpack.NamedModulesPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      COMMITHASH: JSON.stringify(gitRevisionPlugin.commithash()),
      BRANCH: JSON.stringify(gitRevisionPlugin.branch()),
      VERSION: JSON.stringify(version),
      LASTUPDATE: JSON.stringify(lastUpdate),
      ENVTYPE: JSON.stringify(process.env.FMS_ENV || "LOCAL")
    }),
  ],

  devtool: argv.mode === "production" ? "source-map" : "inline-source-map",
  devServer: {
    hot: true,
    contentBase: path.join(__dirname, "dist"),
    compress: true,
    port: 9000,
    historyApiFallback: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
      },
    },
  },
});
