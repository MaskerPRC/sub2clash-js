const querystring = require('querystring');


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

    const result = {
        name: remarks || parts[0],
        type: 'ssr',
        server: parts[0],
        port,
        protocol: parts[2],
        cipher: parts[3],
        obfs: parts[4],
        password: parts[5],
        "obfs-param": obfsParam,
        protocolParam: protoParam,
    };

    return result;
}


module.exports = {
    parseShadowsocksR
}