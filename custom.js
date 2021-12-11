var dash = require('dash-ast')
  , meriyah = require('meriyah')
  , through = require('through')

var processEnvPattern = /\bprocess\.env\b/

module.exports = function(rootEnv) {
  rootEnv = rootEnv || process.env || {}

  return function envify(file, argv) {
    if (/\.json$/.test(file)) return through()

    var buffer = []
    argv = argv || {}

    return through(write, flush)

    function write(data) {
      buffer.push(data)
    }

    function transform(source, envs) {
      var args  = [].concat(envs[0]._ || []).concat(envs[1]._ || [])
      var purge = args.indexOf('purge') !== -1
      var replacements = []

      function match(node) {
        return (
          node.type === 'MemberExpression'
          && node.object.type === 'MemberExpression'
          && node.object.computed === false
          && node.object.object.type === 'Identifier'
          && node.object.object.name === 'process'
          && node.object.property.type === 'Identifier'
          && node.object.property.name === 'env'
          && (node.computed ? node.property.type === 'Literal' : node.property.type === 'Identifier')
        )
      }

      var ast = meriyah.parse(source, { tolerant: true, ranges: true })
      dash(ast, { leave: function(node) {
        if (match(node)) {
          var key = node.property.name || node.property.value
          for (var i = 0; i < envs.length; i++) {
            var value = envs[i][key]
            if (value !== undefined) {
              replacements.push({ node: node, value: JSON.stringify(value) })
              return
            }
          }
          if (purge) {
            replacements.push({ node: node, value: undefined })
          }
        } else if (node.type === 'AssignmentExpression') {
          for (var i = 0; i < replacements.length; ++i) {
            if (replacements[i].node === node.left) {
              replacements.splice(i, 1)
            }
          }
        }
      } })

      var result = source
      if (replacements.length > 0) {
        replacements.sort(function (a, b) {
          return b.node.start - a.node.start
        })
        for (var i = 0; i < replacements.length; i++) {
          var r = replacements[i]
          result = result.slice(0, r.node.start) + r.value + result.slice(r.node.end)
        }
      }

      return result
    }

    function flush() {
      var source = buffer.join('')

      if (processEnvPattern.test(source)) {
        try {
          source = transform(source, [argv, rootEnv])
        } catch(err) {
          return this.emit('error', err)
        }
      }

      this.queue(source)
      this.queue(null)
    }
  }
}
