var envify = require('./custom')
  , test = require('tape')
  , fs = require('fs')

test('Replaces environment variables', function(t) {
  var buffer = ''
  var stream = envify({
      LOREM: 'ipsum'
    , HELLO: 'world'
  })

  stream()
    .on('data', function(d) { buffer += d })
    .on('end', function() {
      t.notEqual(-1, buffer.indexOf('ipsum'))
      t.notEqual(-1, buffer.indexOf('world'))
      t.end()
    })
    .end([
        'process.env.LOREM'
      , 'process.env.HELLO'
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
      t.notEqual(-1, buffer.indexOf('process.env["LOREM"]'))
      t.notEqual(-1, buffer.indexOf('process.env["HELLO"]'))
      t.notEqual(-1, buffer.indexOf('down'))
      t.equal(-1, buffer.indexOf('process.env.UP'))
      t.end()
    })
    .end([
        'process.env["LOREM"] += "lorem"'
      , 'process.env["HELLO"]  = process.env["HELLO"] || "world"'
      , 'process.env.UP'
    ].join('\n'))
})
