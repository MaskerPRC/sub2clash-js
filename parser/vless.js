const url = require('url');

class Proxy {
    constructor({type, server, port, uuid, udp, sni, network, tls, flow, fingerprint, servername, realityOpts, alpn, wsOpts, grpcOpts, name}) {
        this.type = type;
        this.server = server;
        this.port = port;
        this.uuid = uuid;
        this.udp = udp;
        this.sni = sni;
        this.network = network;
        this.tls = tls;
        this.flow = flow;
        this.fingerprint = fingerprint;
        this.servername = servername;
        this.realityOpts = realityOpts;
        this.alpn = alpn;
        this.wsOpts = wsOpts;
        this.grpcOpts = grpcOpts;
        this.name = name;
    }
}

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

    const result = new Proxy({
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
        realityOpts: {
            publicKey: params.get('pbk'),
        },
        name: name,
    });

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

// 示例使用
try {
    const proxyStr = 'vless://...'; // 你的VLESS字符串
    const proxyObj = parseVless(proxyStr);
    console.log(proxyObj);
} catch (error) {
    console.error(error.message);
}
