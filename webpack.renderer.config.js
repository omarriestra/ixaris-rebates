const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  return {
    entry: './src/renderer/index.tsx',
    target: 'electron-renderer',
    output: {
      path: path.resolve(__dirname, 'dist/renderer'),
      filename: '[name].js',
      publicPath: isDevelopment ? '/' : './',
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.renderer.json',
              transpileOnly: true
            }
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            'postcss-loader',
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@/components': path.resolve(__dirname, 'src/renderer/components'),
        '@/hooks': path.resolve(__dirname, 'src/renderer/hooks'),
        '@/utils': path.resolve(__dirname, 'src/shared/utils'),
        '@/types': path.resolve(__dirname, 'src/shared/types'),
        '@/database': path.resolve(__dirname, 'src/database'),
      },
      fallback: {
        "path": require.resolve("path-browserify"),
        "fs": false,
        "os": require.resolve("os-browserify/browser"),
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "util": require.resolve("util/"),
        "buffer": require.resolve("buffer/"),
        "process": require.resolve("process/browser"),
      },
    },
    externals: {
      'events': 'commonjs events',
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
      }),
      new (require('webpack').ProvidePlugin)({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      }),
      new (require('webpack').DefinePlugin)({
        global: 'globalThis',
        'process.env.NODE_ENV': JSON.stringify(isDevelopment ? 'development' : 'production'),
      }),
    ],
    devServer: {
      host: '0.0.0.0',
      port: 3001,
      hot: true,
      static: [
        {
          directory: path.join(__dirname, 'dist/renderer'),
        },
        {
          directory: path.join(__dirname, 'assets'),
          publicPath: '/assets',
        },
      ],
      historyApiFallback: true,
      headers: {
        'Content-Security-Policy': "script-src 'self' 'unsafe-inline' 'unsafe-eval' ws: data: blob:; object-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: file:; connect-src 'self' ws: wss:;",
      },
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
        webSocketURL: 'ws://localhost:3001/ws',
      },
      // Fixes for Electron renderer process
      allowedHosts: 'all',
      webSocketServer: 'ws',
      // Add explicit compression and other settings
      compress: true,
      open: false,
    },
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
          },
        },
      },
    },
  };
};