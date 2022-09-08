const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const GitRevisionPlugin = require('git-revision-webpack-plugin');
const gitRevisionPlugin = new GitRevisionPlugin();
const fs = require('fs');
const child_process = require('child_process')
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, "./.env") });

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
      {
        test: /\.m?js/,
        resolve: {
            fullySpecified: false
        }
      },
    ]
  },
  resolve: {
    extensions: ["*", ".js", ".jsx"]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
    filename: "[name].js",
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
    new webpack.DefinePlugin({
      GIT_COMMITHASH: JSON.stringify(gitRevisionPlugin.commithash()),
      GIT_BRANCH: JSON.stringify(gitRevisionPlugin.branch()),
      GIT_LASTUPDATE: JSON.stringify(child_process.execSync('git log -1 --format=%cI').toString().trim()),
      FMS_VERSION: JSON.stringify(fs.readFileSync('../backend/VERSION', 'utf8')),
      FMS_ENV: JSON.stringify(process.env.FMS_ENV || "LOCAL")
    }),
  ],

  devtool: argv.mode === "production" ? "source-map" : "inline-source-map",
  devServer: {
    static: path.join(__dirname, "dist"),
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
