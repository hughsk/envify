var through = require('through')
  , recast = require('recast')
  , xtend = require('xtend')

var types = recast.types.namedTypes
  , build = recast.types.builders
  , traverse = recast.types.traverse
  , processEnvPattern = /\bprocess\.env\b/

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
        var ast = recast.parse(source)

        traverse(ast, function(node) {
          if (
               types.MemberExpression.check(node)
            && !node.computed
            && types.Identifier.check(node.property)
            && types.MemberExpression.check(node.object)
            && types.Identifier.check(node.object.object)
            && node.object.object.name === 'process'
            && types.Identifier.check(node.object.property)
            && node.object.property.name === 'env'
          ) {
            var key = node.property.name
            if (key in env) {
              this.replace(build.literal(env[key]))
              return false
            }
          }
        });

        source = recast.print(ast).code
      }

      this.queue(source)
      this.queue(null)
    }
  }
}
