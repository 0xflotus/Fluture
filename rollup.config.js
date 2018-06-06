var pkg = require('./package.json');

var dependencies = {
  'concurrify': 'concurrify',
  'denque': 'Denque',
  'sanctuary-show': 'sanctuaryShow',
  'sanctuary-type-classes': 'sanctuaryTypeClasses',
  'sanctuary-type-identifiers': 'sanctuaryTypeIdentifiers'
};

export default {
  input: 'index.cjs.js',
  external: Object.keys(dependencies),
  output: {
    format: 'umd',
    file: pkg.main,
    name: 'Fluture',
    globals: dependencies
  }
};
