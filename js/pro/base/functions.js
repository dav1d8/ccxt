'use strict';

const { inflateRawSync, gunzipSync } = require ('zlib')

function inflate (data) {
    if (!isDeflate(data)) {
        return data;
    }
    return inflateRawSync (data).toString ()
}

function inflate64 (data) {
    return inflate (Buffer.from (data, 'base64'))
}

function gunzip (data) {
    if (!isGzip(data)) {
        return data;
    }
    return gunzipSync (data).toString ()
}

function isGzip (data) {
    return data[0] === 0x1f && data[1] === 0x8b;
}

function isDeflate (data) {
    return data[0] === 0x78 && data[1] === 0x9c;
}

module.exports = {
    inflate,
    inflate64,
    gunzip,
}
