var Syntax = require('esprima-fb').Syntax
var utils = require('jstransform/src/utils')

function create(env) {

  function visitProcessEnv(traverse, node, path, state) {
    var key = node.property.name
    if (env[key] !== undefined) {
      utils.catchup(node.range[0], state)
      utils.append(JSON.stringify(env[key]), state)
      utils.move(node.range[1], state)
    }
    return false
  }

  visitProcessEnv.test = function(node, path, state) {
    return (
      node.type === Syntax.MemberExpression
      && !node.computed
      && node.property.type === Syntax.Identifier
      && node.object.type === Syntax.MemberExpression
      && node.object.object.type === Syntax.Identifier
      && node.object.object.name === 'process'
      && node.object.property.type === Syntax.Identifier
      && node.object.property.name === 'env'
    )
  }

  return [visitProcessEnv]
}

module.exports = create
