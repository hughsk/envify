var through = require('through')
  , acorn = require('acorn')
  , walk = require('acorn/dist/walk')

var acornOpts = {ecmaVersion: 6, ranges: true, allowHashBang: true}
var jsonFile = /\.json$/
var processEnvPattern = /\bprocess\.env\b/

module.exports = function(rootEnv) {
  rootEnv = rootEnv || process.env || {}

  return function envify(file, argv) {
    if (jsonFile.test(file)) return through()

    var buffer = []

    return through(write, flush)

    function write(data) {
      buffer.push(data)
    }

    function flush() {
      var source = buffer.join('')

      if (processEnvPattern.test(source)) {
        var envs = argv ? [argv, rootEnv] : [rootEnv];
        var purge = envs.some(function(env) {
          return env._ && env._.indexOf('purge') !== -1
        })
        try {
          source = replacer(source, envs, purge);
        } catch(err) {
          return this.emit('error', err)
        }
      }

      this.queue(source)
      this.queue(null)
    }
  }
}

function replacer(source, envs, purge) {
  var ast = acorn.parse(source, acornOpts)

  var buffer = ''
  var position = 0

  walk.ancestor(ast, {
    MemberExpression: function(node, state) {
      var parent = state[state.length - 2]

      if (!(
        node.type === 'MemberExpression'
        && !(parent.type === 'AssignmentExpression' && parent.left === node)
        && node.property.type === (node.computed ? 'Literal' : 'Identifier')
        && node.object.computed === false
        && node.object.type === 'MemberExpression'
        && node.object.object.type === 'Identifier'
        && node.object.object.name === 'process'
        && node.object.property.type === 'Identifier'
        && node.object.property.name === 'env'
      )) return

      var key = node.property.name || node.property.value

      for (var i = 0; i < envs.length; i++) {
        var value = envs[i][key]
        if (value !== undefined) {
          replaceEnv(node, value)
          return
        }
      }

      if (purge) {
        replaceEnv(node, undefined)
      }
    }
  })

  function replaceEnv(node, value) {
    if (position > node.start) {
      throw new Error('envify replacer tried to go backwards')
    }
    buffer += source.substring(position, node.start)
    buffer += JSON.stringify(value)
    position = node.end
  }

  if (position === 0) {
    buffer = source
  } else {
    buffer += source.substring(position)
  }

  return buffer
}
