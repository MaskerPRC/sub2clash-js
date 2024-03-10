const url = require('url');

// 定义模型，类似于Go中的model.Proxy
class Proxy {
    constructor(type, cipher, password, server, port, udp = true, name = '') {
        this.type = type;
        this.cipher = cipher;
        this.password = password;
        this.server = server;
        this.port = port;
        this.udp = udp;
        this.name = name;
    }
}

// 解析Shadowsocks URL的函数
function parseSS(proxy) {
    // 检查是否以ss://开头
    if (!proxy.startsWith('ss://')) {
        return Promise.reject(new Error('invalid ss Url'));
    }

    // 分割并处理
    const parts = proxy.substring(5).split('@', 2);
    if (parts.length !== 2) {
        return Promise.reject(new Error('invalid ss Url'));
    }

    let [credentials, serverInfo] = parts;
    if (!credentials.includes(':')) {
        // 尝试Base64解码
        try {
            credentials = Buffer.from(credentials, 'base64').toString('utf-8');
        } catch (err) {
            return Promise.reject(new Error('invalid ss Url' + err.message));
        }
    }

    const credentialParts = credentials.split(':', 2);
    if (credentialParts.length !== 2) {
        return Promise.reject(new Error('invalid ss Url'));
    }

    const serverAndPort = serverInfo.split(':', 2);
    if (serverAndPort.length !== 2) {
        return Promise.reject(new Error('invalid ss Url'));
    }

    const portString = serverAndPort[1].split('/', 2)[0];
    const port = parseInt(portString.trim(), 10);
    if (isNaN(port)) {
        return Promise.reject(new Error('invalid ss Url: invalid port'));
    }

    // 构造结果
    const result = new Proxy('ss', credentialParts[0].trim(), credentialParts[1].trim(), serverAndPort[0].trim(), port);

    // 如果有节点名称
    if (serverInfo.includes('#')) {
        const namePart = serverInfo.split('#', 2)[1];
        try {
            result.name = decodeURIComponent(namePart.trim());
        } catch (err) {
            return Promise.reject(new Error('invalid ss Url' + err.message));
        }
    } else {
        result.name = serverAndPort[0].trim();
    }

    return Promise.resolve(result);
}

// 使用示例
parseSS('你的ss://URL').then(proxy => {
    console.log(proxy);
}).catch(error => {
    console.error(error);
});
