const path = require('path');
const CopyFilePlugin = require('copy-webpack-plugin');
const WriteFilePlugin = require('write-file-webpack-plugin');
module.exports = {
  entry: {
    bundle: './src/index.ts',
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
    ],
  },
  plugins: [
    new CopyFilePlugin(
      [
        {
          context: 'src',
          from: '**/*.html',
          to: path.resolve(__dirname, 'dist'),
        },
        {
          context: 'src',
          from: '**/*.css',
          to: path.resolve(__dirname, 'dist'),
        },
      ],
      { copyUnmodified: true }
    ),
    new WriteFilePlugin(),
  ],
};
