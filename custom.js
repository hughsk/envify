var through = require('through')
  , falafel = require('falafel')

module.exports = function(env) {
  env = env || process.env || {}
  return envify

  function envify(file) {
    var buffer = ''

    return through(function(data) {
      buffer += data
    }, function processFile() {
      var output = falafel(buffer, function(node) {
        if (!(
          node.type === 'Identifier' &&
          node.name === 'process' &&
          node.parent &&
          node.parent.property &&
          node.parent.property.type === 'Identifier' &&
          node.parent.property.name === 'env' &&
          node.parent.parent &&
          node.parent.parent.property &&
        ( node.parent.parent.property.name ||
          node.parent.parent.property.value ) &&
        ( node.parent.parent.parent
        ? node.parent.parent.parent.type !== 'AssignmentExpression'
        : true )
        )) return

        var key = node.parent.parent.property.name ||
                  node.parent.parent.property.value

        if (!(key in env)) return

        node.parent.parent.update(
          env[key] ? JSON.stringify(env[key]) :
          env[key] === false ? 'false'        :
          env[key] === null ? 'null'          :
          env[key] === '' ? '""'              :
          env[key] === 0 ? '0'                :
          'undefined'
        )
      })

      this.queue(String(output))
      this.queue(null)
    })
  }
}
