var net = require('net'),
    Transform = require('stream').Transform,
    EventEmitter = require('events').EventEmitter;

var jsonFrame = function(options) {
        var lengthPrefix = options.lengthPrefix,
            writeBytes;
        if (!~ [1, 2, 4].indexOf(lengthPrefix)) throw Error('Length prefix/Frame size must be one of 1, 2, 4');
        lengthPrefix = lengthPrefix || 2;

        writeBytes = {
            1: 'writeUInt8',
            2: 'writeUInt16BE',
            4: 'writeUInt32BE'
        }[lengthPrefix];
        // readBytes = ['writeUInt8BE', 'writeUInt16BE', undefined,
        // 'readUInt32BE'][lengthPrefix];
        //build: throw err if o.length > bytes
        return {
            build: function(o) {
                var str = typeof o === 'object'? JSON.stringify(o) : o,
                len = Buffer.byteLength(str),
                buffer = new Buffer(lengthPrefix + len);
                buffer[writeBytes](len, 0);
                buffer.write(str, lengthPrefix);
                // for(var i = 0; i < buffer.length; i ++)
                // console.log(buffer[i].toString());
                return buffer;
            },
            jsonTransformer: function() {
                return new JsonTransformer({
                    lengthPrefix: lengthPrefix
                });
            }
        };
    };

/**
 * This doesn't have to be a JsonTransformer, it can transform any frame
 * prefixed message TODO: objectMode
 */

function JsonTransformer(options) {
    if (!(this instanceof JsonTransformer)) {
        return new JsonTransformer(options);
    }
    Transform.call(this, {
        objectMode: true
    });
/*Transform.call(this);
    this._readableState.objectMode = false;
    this._writableState.objectMode = true;*/
    this.buffer = new Buffer(0);
    this.lengthPrefix = options.lengthPrefix || 2;
    this._readBytes = {
        1: 'readUInt8',
        2: 'readUInt16BE',
        4: 'readUInt32BE'
    }[this.lengthPrefix];
}

JsonTransformer.prototype = Object.create(Transform.prototype, {
    constructor: {
        value: JsonTransformer,
        enumerable: false,
        writable: false
    }
});

// Object.defineProperty(JsonTransformer, {constructor: JsonTransformer});
JsonTransformer.constructor = JsonTransformer;

function transform() {
    var buffer = this.buffer,
        lengthPrefix = this.lengthPrefix;

    if (buffer.length > lengthPrefix) {
        this.bytes = buffer[this._readBytes](0);
        // console.log('bts', this.bytes);
        if (buffer.length >= this.bytes + lengthPrefix) {
            // console.log('len ', buffer.toString());
            var json = buffer.slice(lengthPrefix, this.bytes + lengthPrefix);
            this.buffer = buffer.slice(this.bytes + lengthPrefix);
            try {
                //console.log(JSON.parse(json.toString()));
                this.push(JSON.parse(json.toString()));
            } catch(err) {
                this.emit('parse error', err);
            }
            
            transform.call(this);
        }
    }
}

JsonTransformer.prototype._transform = function(chunk, encoding, next) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    transform.call(this);
    next();
}

JsonTransformer.prototype._flush = function() {
    console.log('Flushed...');
}

module.exports = jsonFrame;

// module.exports.JsonTransformer = JsonTransformer;