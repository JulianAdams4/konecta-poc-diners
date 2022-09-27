function init() {
  global.getLabel = (dirname, filename) => `${dirname.split(process.cwd())[1] || '/'} ${filename.split('/').pop()}`;
}

module.exports = {
  init,
};
