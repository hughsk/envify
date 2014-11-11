var Syntax = require('jstransform').Syntax
var utils = require('jstransform/src/utils')

function create(envs) {

  function visitProcessEnv(traverse, node, path, state) {
    var key = node.property.name
    var value

    for (var i = 0; i < envs.length; i++)
      if ((value = envs[i][key]) !== undefined)
        break

    utils.catchup(node.range[0], state)
    utils.append(JSON.stringify(value), state)
    utils.move(node.range[1], state)
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
