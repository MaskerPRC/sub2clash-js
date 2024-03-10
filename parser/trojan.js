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
        Type: 'trojan',
        Server: serverAndPort[0].trim(),
        Port: port,
        UDP: true,
        Password: parts[0].trim(),
        Sni: params.get('sni'),
    };

    // 如果有节点名称
    if (serverInfo.length === 2) {
        result.Name = decodeURIComponent(serverInfo[1].trim());
    } else {
        result.Name = serverAndPort[0];
    }

    return result;
}

// 示例用法
try {
    const proxyString = 'trojan://password@server:port?sni=example.com#NodeName';
    const proxy = parseTrojan(proxyString);
    console.log(proxy);
} catch (error) {
    console.error(error.message);
}
