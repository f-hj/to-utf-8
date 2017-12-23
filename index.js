var detect = require('charset-detector')
var iconv = require('iconv-lite')
var peek = require('peek-stream')
var splicer = require('stream-splicer')

function convertFrom (encoding) {
  return splicer([
    iconv.decodeStream(encoding),
    iconv.encodeStream('utf8')
  ])
}

function getSupportedEncoding (encoding) {
  if (encoding === 'ISO-8859-8-I') encoding = 'ISO-8859-8'
  if (iconv.encodingExists(encoding)) return encoding
  return 'utf8' // default
}

function toutf8 (opts) {
  if (!opts) opts = {}
  if (typeof opts === 'string') opts = { encoding: opts }
  var conf = opts.confidence || 0
  var newline = opts.newline !== false
  var detectSize = opts.detectSize || 65535
  var encoding = opts.encoding
  // encoding given
  if (encoding) return convertFrom(encoding)

  // detect encoding first
  return peek({newline: newline, maxBuffer: detectSize}, function (data, swap) {
      if (!Buffer.isBuffer(data)) return swap(new Error('No buffer'))
      var matches = detect(data)
      var encoding = 'UTF-8'
      if (matches.length > 0 && matches[0].confidence > conf) {
        encoding = matches[0].charsetName
      }
      if (opts.noUtf8 && encoding === 'UTF-8' && matches.length > 1 && matches[1].confidence > conf) {
        encoding = matches[1].charsetName
      }
      encoding = getSupportedEncoding(encoding)
      swap(null, convertFrom(encoding))
    })
}

function toutf8sync (buf, opts) {
  if (!opts) opts = {}
  opts.detectSize = buf.length
  opts.newline = false

  var stream = toutf8(opts)
  stream.write(buf)
  stream.end()

  var output = []
  var next = null

  while (next = stream.read()) output.push(next)

  return Buffer.concat(output)
}

toutf8.sync = toutf8sync

module.exports = toutf8
