const url = require('url');

function parseVless(proxy) {
    if (!proxy.startsWith('vless://')) {
        throw new Error('invalid vless Url');
    }

    const parts = proxy.slice('vless://'.length).split('@');
    if (parts.length !== 2) {
        throw new Error('invalid vless Url');
    }

    const [uuid, serverInfo] = parts;
    const [serverAndPortStr, fragment] = serverInfo.split('#');
    const [serverAndPort, paramsStr] = serverAndPortStr.split('?');
    const [server, portStr] = serverAndPort.split(':');
    const params = new url.URLSearchParams(paramsStr);

    if (!portStr) {
        throw new Error('invalid vless');
    }

    const port = parseInt(portStr.trim(), 10);
    if (isNaN(port)) {
        throw new Error('invalid vless port');
    }

    let name = server;
    if (fragment) {
        const nameParts = fragment.split('|');
        name = nameParts.length === 2 ? nameParts[1] : fragment;
    }

    const result = {
        type: 'vless',
        server: server.trim(),
        port: port,
        uuid: uuid.trim(),
        udp: true,
        sni: params.get('sni'),
        network: params.get('type'),
        tls: params.get('security') === 'tls',
        flow: params.get('flow'),
        fingerprint: params.get('fp'),
        servername: params.get('sni'),
        "reality-opts": {
            "public-key": params.get('pbk'),
        },
        name: name,
    };

    if (params.get('alpn')) {
        result.alpn = params.get('alpn').split(',');
    }

    if (params.get('type') === 'ws') {
        result.wsOpts = {
            path: params.get('path'),
            headers: {
                Host: params.get('host'),
            },
        };
    }

    if (params.get('type') === 'grpc') {
        result.grpcOpts = {
            grpcServiceName: params.get('serviceName'),
        };
    }

    return result;
}

module.exports = {
    parseVless
}