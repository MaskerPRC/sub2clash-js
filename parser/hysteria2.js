const url = require('url');

function parseHysteria2(proxy) {
    return new Promise((resolve, reject) => {
        // 判断是否以 hysteria2:// 开头
        if (!proxy.startsWith('hysteria2://')) {
            reject(new Error('invalid hysteria2 Url'));
            return;
        }

        // 分割
        const parts = proxy.slice('hysteria2://'.length).split('@', 2);
        if (parts.length !== 2) {
            reject(new Error('invalid hysteria2 Url'));
            return;
        }

        // 分割服务器信息
        const serverInfo = parts[1].split('/?', 2);
        const serverAndPort = serverInfo[0].split(':', 2);
        if (serverAndPort.length === 1) {
            serverAndPort.push('443'); // 默认端口
        } else if (serverAndPort.length !== 2) {
            reject(new Error('invalid hysteria2 Url'));
            return;
        }

        // 解析URL参数
        const params = new url.URLSearchParams(serverInfo[1]);

        // 获取端口
        const port = parseInt(serverAndPort[1], 10);
        if (isNaN(port)) {
            reject(new Error('invalid hysteria2 Url'));
            return;
        }

        // 构建结果对象
        const result = {
            type: 'hysteria2',
            name: params.get('name'),
            server: serverAndPort[0],
            port: port,
            password: parts[0],
            obfs: params.get('obfs'),
            "obfs-param": params.get('obfs-password'),
            sni: params.get('sni'),
            "skip-cert-verify": params.get('insecure') === '1',
        };

        resolve(result);
    });
}

module.exports = {
    parseHysteria2
}