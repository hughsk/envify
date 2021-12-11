var envify = require('./custom')
  , test = require('tape')
  , fs = require('fs')

test('Replaces environment variables', function(t) {
  var buffer = ''
  var stream = envify({
      LOREM: 'ipsum'
    , HELLO: 'world'
    , ZALGO: 'it comes'
  })

  stream()
    .on('data', function(d) { buffer += d })
    .on('end', function() {
      t.notEqual(-1, buffer.indexOf('ipsum'))
      t.notEqual(-1, buffer.indexOf('world'))
      t.notEqual(-1, buffer.indexOf('it comes'))
      t.notEqual(-1, buffer.indexOf('process.env[ZALGO]'))
      t.end()
    })
    .end([
        'process.env.LOREM'
      , 'process.env.HELLO'
      , 'process.env["ZALGO"]'
      , 'process.env[ZALGO]'
    ].join('\n'))
})

test('Ignores assignments', function(t) {
  var buffer = ''
  var stream = envify({
      LOREM: 'ipsum'
    , HELLO: 'world'
    , UP: 'down'
  })

  stream()
    .on('data', function(d) { buffer += d })
    .on('end', function() {
      t.notEqual(-1, buffer.indexOf('world'))
      t.notEqual(-1, buffer.indexOf('lorem'))
      t.notEqual(-1, buffer.indexOf('process.env.LOREM'))
      t.notEqual(-1, buffer.indexOf('process.env["LOREM"]'))
      t.notEqual(-1, buffer.indexOf('process.env.HELLO'))
      t.notEqual(-1, buffer.indexOf('process.env["HELLO"]'))
      t.equal(-1, buffer.indexOf('process.env.UP'))
      t.notEqual(-1, buffer.indexOf('down'))
      t.end()
    })
    .end([
        'process.env["LOREM"] += "lorem"'
      , 'process.env.LOREM += "lorem"'
      , 'process.env["HELLO"] = process.env["HELLO"] || "world"'
      , 'process.env.HELLO = process.env.HELLO || "world"'
      , 'process.env.UP'
    ].join('\n'))
})

test('Ignores computed object', function(t) {
  var buffer = ''
  var stream = envify({
      LOREM: 'ipsum'
    , HELLO: 'world'
  })
  stream()
    .on('data', function(d) { buffer += d })
    .on('end', function() {
      t.notEqual(-1, buffer.indexOf('process[env].LOREM'))
      t.notEqual(-1, buffer.indexOf('process["env"].LOREM'))
      t.equal(-1, buffer.indexOf('process.env.HELLO'))
      t.end()
    })
    .end([
        'process[env].LOREM'
      , 'process["env"].LOREM'
      , 'process.env.HELLO'
    ].join('\n'))
})

test('Doesn\'t ignore assigning to a variable', function(t) {
  var buffer = ''
  var stream = envify({
      LOREM: 'ipsum'
    , HELLO: 'world'
  })

  stream()
    .on('data', function(d) { buffer += d })
    .on('end', function() {
      t.notEqual(-1, buffer.indexOf('foo = "ipsum"'))
      t.notEqual(-1, buffer.indexOf('oof = "ipsum"'))
      t.notEqual(-1, buffer.indexOf('oof.bar = "ipsum"'))
      t.notEqual(-1, buffer.indexOf('bar = "world"'))
      t.notEqual(-1, buffer.indexOf('rab = "world"'))
      t.notEqual(-1, buffer.indexOf('process.env.NOTTHERE'))
      t.notEqual(-1, buffer.indexOf('process.env.UNDEFINED'))
      t.end()
    })
    .end([
        'var foo = process.env.LOREM'
      , 'oof = process.env.LOREM'
      , 'oof.bar = process.env.LOREM'
      , 'var bar = process.env.HELLO || null'
      , 'rab = process.env.HELLO || null'
      , 'a = process.env.UNDEFINED'
      , 'b = process.env.NOTTHERE || null'
    ].join('\n'))
})

test('subarg syntax', function(t) {
  var buffer = ''
  var stream = envify({
      OVERRIDES: 'development'
    , UNTOUCHED: 'staging'
  })

  stream(__filename, {
      _: ['bogus', 'arguments']
    , OVERRIDES: 'production'
  }).on('data', function(d) { buffer += d })
    .on('end', function() {
      t.notEqual(-1, buffer.indexOf('foo = "production"'))
      t.notEqual(-1, buffer.indexOf('bar = "staging"'))
      t.end()
    })
    .end([
        'var foo = process.env.OVERRIDES'
      , 'var bar = process.env.UNTOUCHED'
    ].join('\n'))
})

test('Handles getter properties', function(t) {
  var env    = {}
  var buffer = ''
  var stream = envify(env)
  var counter = 0

  Object.defineProperty(env, 'DYNAMIC', {
    // please don't actually do this:
    get: function() { return counter++ ? 'really!' : 'dynamic!' }
  })

  stream().on('data', function(d) { buffer += d })
    .on('end', function() {
      t.notEqual(-1, buffer.indexOf('foo = "dynamic!"'))
      t.notEqual(-1, buffer.indexOf('bar = "really!"'))
      t.end()
    })
    .end([
        'var foo = process.env.DYNAMIC'
      , 'var bar = process.env.DYNAMIC'
    ].join('\n'))
})

test('-t [ envify purge ]', function(t) {
  var stream = envify()
  var buffer = ''

  stream(__filename, { _: ['purge'] })
    .on('data', function(d) { buffer += d })
    .on('end', function() {
      t.notEqual(-1, buffer.indexOf('var x = undefined'))
      t.equal(-1, buffer.indexOf('process.env.PURGED'))
      t.end()
    })
    .end('var x = process.env.PURGED')
})

test('-t [ envify purge --argument ]', function(t) {
  var stream = envify({ argument: 'not purged' })
  var buffer = ''

  stream(__filename, { _: ['purge'] })
    .on('data', function(d) { buffer += d })
    .on('end', function() {
      t.notEqual(-1, buffer.indexOf('var x = undefined'), 'purges undefined variables')
      t.notEqual(-1, buffer.indexOf('var y = "not purged"'), 'still inlines defined ones')
      t.end()
    })
    .end([
        'var x = process.env.PURGED'
      , 'var y = process.env.argument'
    ].join('\n'))
})

test('Supports modern JS syntax', function(t) {
  var env    = { ES6: 'es2015', ES2015: 'es6' }
  var buffer = ''
  var stream = envify(env)

  stream().on('data', function(d) { buffer += d })
    .on('end', function() {
      t.notEqual(-1, buffer.indexOf('foo = "es2015"'))
      t.notEqual(-1, buffer.indexOf('b: "es6"'))
      t.end()
    })
    .end([
        'async function lol (foo = process.env.ES6) { console.log(foo) }'
      , ';({ b, ...xyz }) => ({ ...xyz, b: process.env.ES2015, c: b })'
    ].join('\n'))
})
