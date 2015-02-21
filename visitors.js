var Syntax = require('jstransform').Syntax
var utils = require('jstransform/src/utils')
var util = require('util')

function create(envs) {
  var args  = [].concat(envs[0]._ || []).concat(envs[1]._ || [])
  var purge = args.indexOf('purge') !== -1
  var error = args.indexOf('error') !== -1
  var warn = args.indexOf('warn') !== -1

  function visitProcessEnv(traverse, node, path, state) {
    var key = node.property.name

    for (var i = 0; i < envs.length; i++) {
      var value = envs[i][key]
      if (value !== undefined) {
        replaceEnv(node, state, value)
        return false
      }
    }

    if (purge) {
      replaceEnv(node, state, undefined)
    } else if (error || warn) {
      var msg = util.format('envify did not find value for "%s" variable', node.property.name);
      if(error) throw new Error(msg);
      else console.log('WARN: ', msg);
    }

    return false
  }

  function replaceEnv(node, state, value) {
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
