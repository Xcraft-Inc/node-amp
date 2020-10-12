
var magic = [65, 88, 79, 78]; // AXON

/**
 * Decode the given `buf`.
 *
 * @param {Buffer} buf
 * @return {Object}
 * @api public
 */

module.exports = function(buf){
  var off = 0;

  // unpack meta
  var meta = buf[off++];
  var version = meta >> 4;
  var argv = meta & 0xf;
  var args = new Array(argv);

  // unpack magic
  if (version > 1) {
    if (buf.readUInt8(off++) != magic[0] ||
        buf.readUInt8(off++) != magic[1] ||
        buf.readUInt8(off++) != magic[2] ||
        buf.readUInt8(off++) != magic[3]) {
      throw new Error(`bad magic bytes for protocol version ${version}`)
    }
  }

  // unpack args
  for (var i = 0; i < argv; i++) {
    var len = buf.readUInt32BE(off);
    off += 4;

    var arg = buf.slice(off, off += len);
    args[i] = arg;
  }

  return args;
};