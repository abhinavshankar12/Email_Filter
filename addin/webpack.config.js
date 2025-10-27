const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  return {
    entry: {
      taskpane: './src/taskpane/index.tsx',
      commands: './src/commands/commands.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/taskpane/taskpane.html',
        filename: 'taskpane.html',
        chunks: ['taskpane'],
      }),
      new HtmlWebpackPlugin({
        template: './src/commands/commands.html',
        filename: 'commands.html',
        chunks: ['commands'],
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: './manifest.xml', to: 'manifest.xml' },
          { from: './assets', to: 'assets', noErrorOnMissing: true },
        ],
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      port: 3001,
      hot: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      https: true,
    },
    devtool: isDevelopment ? 'source-map' : false,
  };
};

