var through = require('through')
  , recast = require('recast')
  , n = recast.types.namedTypes
  , b = recast.types.builders
  , traverse = recast.types.traverse
  , processEnvPattern = /\bprocess\.env\b/

module.exports = function(env) {
  env = env || process.env || {}

  return function envify(file) {
    if (/\.json$/.test(file)) return through()

    var buffer = []

    return through(function(data) {
      buffer.push(data)
    }, function processFile() {
      var source = buffer.join('')

      if (processEnvPattern.test(source)) {
        var ast = recast.parse(source)

        traverse(ast, function(node) {
          if (
               n.MemberExpression.check(node)
            && !node.computed
            && n.Identifier.check(node.property)
            && n.MemberExpression.check(node.object)
            && n.Identifier.check(node.object.object)
            && node.object.object.name === 'process'
            && n.Identifier.check(node.object.property)
            && node.object.property.name === 'env'
          ) {
            var key = node.property.name
            if (key in env) {
              this.replace(b.literal(env[key]))
              return false
            }
          }
        });

        source = recast.print(ast).code
      }

      this.queue(source)
      this.queue(null)
    })
  }
}
