
/**
 * Protocol version.
 */

var version = 2;
var magic = [65, 88, 79, 78]; // AXON

/**
 * Encode `msg` and `args`.
 *
 * @param {Array} args
 * @return {Buffer}
 * @api public
 */

module.exports = function(args){
  var argc = args.length;
  var len = 1;
  var off = 0;

  // data length
  for (var i = 0; i < argc; i++) {
    len += 4 + args[i].length;
  }

  if (version > 1) {
    len += 4;
  }

  // buffer
  var buf = Buffer.allocUnsafe(len);

  // pack meta
  buf[off++] = version << 4 | argc;

  // pack magic (version > 1)
  buf[off++] = magic[0];
  buf[off++] = magic[1];
  buf[off++] = magic[2];
  buf[off++] = magic[3];

  // pack args
  for (var i = 0; i < argc; i++) {
    var arg = args[i];

    buf.writeUInt32BE(arg.length, off);
    off += 4;

    arg.copy(buf, off);
    off += arg.length;
  }

  return buf;
};
