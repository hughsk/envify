var envify = require('../custom')
  , browserify = require('browserify')
  , spawn = require('child_process').spawn
  , test = require('tape')

test('Browserify api', function(t) {
  process.env.KITTEN = 'meow'
  browserify(__dirname + '/package/a.js')
    .transform(envify({
      LOREM: 'ipsum'
    }))
    .bundle(function(err, src) {
      if (err) t.fail(err);
      src = String(src)
      t.equal(-1, src.indexOf('process.env.LOREM'))
      t.notEqual(-1, src.indexOf('ipsum'))
      t.equal(-1, src.indexOf('process.env.KITTEN'))
      t.notEqual(-1, src.indexOf('meow'))
      t.equal(-1, src.indexOf('process.env.HELLO'))
      t.notEqual(-1, src.indexOf('hello'))
      t.equal(-1, src.indexOf('process.env.WORLD'))
      t.notEqual(-1, src.indexOf('world'))
      t.end()
    })
})

test('Browserify cli', function(t) {
  process.env.KITTEN = 'meow'
  var ps = spawn(process.execPath, [
    require.resolve('browserify/bin/cmd'),
    __dirname + '/package/a.js',
    '-t', '[', '../', '--LOREM', 'ipsum', ']'
  ], {cwd: __dirname})
  var src = ''
  var err = ''
  ps.stdout.on('data', function(d) { src += d })
  ps.stderr.on('data', function(d) { err += d })
  ps.on('exit', function(code) {
      t.equal(code, 0)
      t.equal(err, '')
      t.equal(-1, src.indexOf('process.env.LOREM'))
      t.notEqual(-1, src.indexOf('ipsum'))
      t.equal(-1, src.indexOf('process.env.KITTEN'))
      t.notEqual(-1, src.indexOf('meow'))
      t.equal(-1, src.indexOf('process.env.HELLO'))
      t.notEqual(-1, src.indexOf('hello'))
      t.equal(-1, src.indexOf('process.env.WORLD'))
      t.notEqual(-1, src.indexOf('world'))
      t.end()
  })
})
