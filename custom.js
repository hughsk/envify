var through = require('through')
  , xtend = require('xtend')
  , jstransform = require('jstransform')
  , createVisitors = require('./visitors')

var processEnvPattern = /\bprocess\.env\b/

module.exports = function(rootEnv) {
  rootEnv = rootEnv || process.env || {}

  return function envify(file, argv) {
    if (/\.json$/.test(file)) return through()

    var buffer = []
    var env = argv
      ? xtend(rootEnv, argv)
      : rootEnv

    return through(write, flush)

    function write(data) {
      buffer.push(data)
    }

    function flush() {
      var source = buffer.join('')

      if (processEnvPattern.test(source)) {
        try {
          source = jstransform.transform(createVisitors(env), source).code
        } catch(err) {
          return this.emit('error', err)
        }
      }

      this.queue(source)
      this.queue(null)
    }
  }
}
