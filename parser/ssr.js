const querystring = require('querystring');

class Proxy {
    constructor(name, type, server, port, protocol, cipher, obfs, password, obfsParam, protocolParam) {
        this.name = name;
        this.type = type;
        this.server = server;
        this.port = port;
        this.protocol = protocol;
        this.cipher = cipher;
        this.obfs = obfs;
        this.password = password;
        this.obfsParam = obfsParam;
        this.protocolParam = protocolParam;
    }
}

function decodeBase64(str) {
    return Buffer.from(str, 'base64').toString('utf8');
}

function parseShadowsocksR(proxy) {
    if (!proxy.startsWith('ssr://')) {
        throw new Error('invalid ssr Url');
    }

    proxy = proxy.slice(6); // Remove 'ssr://' prefix

    if (!proxy.includes(':')) {
        try {
            proxy = decodeBase64(proxy);
        } catch (err) {
            throw err;
        }
    }

    const [details, paramsString] = proxy.split('/?');
    const parts = details.split(':');
    const params = querystring.parse(paramsString);

    let port;
    try {
        port = parseInt(parts[1], 10);
    } catch (err) {
        throw err;
    }

    let obfsParam = '';
    let protoParam = '';
    let remarks = '';

    if (params['obfsparam']) {
        obfsParam = decodeBase64(params['obfsparam']);
    }
    if (params['protoparam']) {
        protoParam = decodeBase64(params['protoparam']);
    }
    if (params['remarks']) {
        remarks = decodeBase64(params['remarks']);
    }

    const result = new Proxy(
        remarks || parts[0],
        'ssr',
        parts[0],
        port,
        parts[2],
        parts[3],
        parts[4],
        parts[5],
        obfsParam,
        protoParam,
    );

    return result;
}


module.exports = {
    parseShadowsocksR
}