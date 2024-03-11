const url = require('url');

function parseTrojan(proxy) {
    // 判断是否以 trojan:// 开头
    if (!proxy.startsWith('trojan://')) {
        throw new Error('Invalid trojan URL');
    }

    // 分割
    const parts = proxy.replace('trojan://', '').split('@', 2);
    if (parts.length !== 2) {
        throw new Error('Invalid trojan URL');
    }

    // 分割服务器信息
    const serverInfo = parts[1].split('#', 2);
    const serverAndPortAndParams = serverInfo[0].split('?', 2);
    const serverAndPort = serverAndPortAndParams[0].split(':', 2);

    // 处理查询参数
    const params = new url.URLSearchParams(serverAndPortAndParams[1]);

    if (serverAndPort.length !== 2) {
        throw new Error('Invalid trojan');
    }

    // 处理端口
    const port = parseInt(serverAndPort[1].trim(), 10);
    if (isNaN(port)) {
        throw new Error('Invalid port');
    }

    // 返回结果
    const result = {
        type: 'trojan',
        server: serverAndPort[0].trim(),
        port: port,
        udp: true,
        password: parts[0].trim(),
        sni: params.get('sni'),
        "skip-cert-verify": true,
    };

    // 如果有节点名称
    if (serverInfo.length === 2) {
        result.name = decodeURIComponent(serverInfo[1].trim());
    } else {
        result.name = serverAndPort[0];
    }

    return Promise.resolve(result);
}

module.exports = {
    parseTrojan
}