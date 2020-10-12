
/**
 * Module dependencies.
 */

var Stream = require('stream').Writable;

var magic = [65, 88, 79, 78]; // AXON

/**
 * Expose parser.
 */

module.exports = Parser;

/**
 * Initialize parser.
 *
 * @param {Options} [opts]
 * @api public
 */

function Parser(opts) {
  Stream.call(this, opts);
  this.state = 'message';
  this._lenbuf = Buffer.allocUnsafe(4);
}

/**
 * Inherit from `Stream.prototype`.
 */

Parser.prototype.__proto__ = Stream.prototype;

/**
 * Write implementation.
 */

Parser.prototype._write = function(chunk, encoding, fn){
  for (var i = 0; i < chunk.length; i++) {
    switch (this.state) {
      case 'message':
        var meta = chunk[i];
        this.version = meta >> 4;
        this.argv = meta & 0xf;
        this.state = this.version == 2 ? 'magic' : 'unsupported';
        this._bufs = [Buffer.from([meta])];
        this._nargs = 0;
        this._leni = 0;
        break;

      case 'magic':
        this._lenbuf[this._leni++] = chunk[i];

        // done
        if (4 == this._leni) {
          if (this._lenbuf[0] != magic[0] ||
              this._lenbuf[1] != magic[1] ||
              this._lenbuf[2] != magic[2] ||
              this._lenbuf[3] != magic[3]) {
            this.state = 'error';
            break;
          }

          var buf = Buffer.allocUnsafe(4);
          buf[0] = this._lenbuf[0];
          buf[1] = this._lenbuf[1];
          buf[2] = this._lenbuf[2];
          buf[3] = this._lenbuf[3];
          this._bufs.push(buf);
          this.state = 'arglen';
          this._leni = 0;
        }
        break;

      case 'arglen':
        this._lenbuf[this._leni++] = chunk[i];

        // done
        if (4 == this._leni) {
          this._arglen = this._lenbuf.readUInt32BE(0);
          var buf = Buffer.allocUnsafe(4);
          buf[0] = this._lenbuf[0];
          buf[1] = this._lenbuf[1];
          buf[2] = this._lenbuf[2];
          buf[3] = this._lenbuf[3];
          this._bufs.push(buf);
          this._argcur = 0;
          this.state = 'arg';
        }
        break;

      case 'arg':
        // bytes remaining in the argument
        var rem = this._arglen - this._argcur;

        // consume the chunk we need to complete
        // the argument, or the remainder of the
        // chunk if it's not mixed-boundary
        var pos = Math.min(rem + i, chunk.length);

        // slice arg chunk
        var part = chunk.slice(i, pos);
        this._bufs.push(part);

        // check if we have the complete arg
        this._argcur += pos - i;
        var done = this._argcur == this._arglen;
        i = pos - 1;

        if (done) this._nargs++;

        // no more args
        if (this._nargs == this.argv) {
          this.state = 'message';
          this.emit('data', Buffer.concat(this._bufs));
          break;
        }

        if (done) {
          this.state = 'arglen';
          this._leni = 0;
        }
        break;

      case 'unsupported':
        fn(`the protocol version ${this.version} is not supported, please ensure to use the version 2`);
        return;

      case 'error':
        fn(`bad magic bytes (${this._lenbuf.toString()}) for protocol version ${this.version}`);
        return;
    }
  }

  fn();
};
