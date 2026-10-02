const plugins = {
  tailwindcss: {},
};

try {
  require.resolve('autoprefixer');
  plugins.autoprefixer = {};
} catch (e) {
  // Autoprefixer optional fallback until node_modules is fully populated
}

module.exports = {
  plugins,
};
