function decodeBase64(str) {
    // Node.js 自带的 Buffer 可以用来处理 Base64 编码和解码
    // 如果你在浏览器环境中使用 atob() 函数，那么在 Node.js 中应该使用 Buffer
    return Buffer.from(str, 'base64').toString('utf-8');
}

async function parseVmess(proxy) {
    if (!proxy.startsWith('vmess://')) {
        throw new Error('invalid vmess url');
    }

    let base64Decoded;
    try {
        base64Decoded = decodeBase64(proxy.slice(8)); // 移除 'vmess://' 前缀
    } catch (err) {
        throw new Error('invalid vmess url - ' + err.message);
    }

    let vmess;
    try {
        vmess = JSON.parse(base64Decoded);
    } catch (err) {
        throw new Error('invalid vmess url - ' + err.message);
    }

    const port = typeof vmess.port === 'string' ? parseInt(vmess.port, 10) : vmess.port;
    const aid = typeof vmess.aid === 'string' ? parseInt(vmess.aid, 10) : vmess.aid;

    // 设置默认值
    vmess.scy = vmess.scy || 'auto';
    if (vmess.net === 'ws' && !vmess.path) vmess.path = '/';
    if (vmess.net === 'ws' && !vmess.host) vmess.host = vmess.add;

    const result = {
        name: vmess.ps,
        type: 'vmess',
        server: vmess.add,
        port,
        uuid: vmess.id,
        alterId: aid,
        cipher: vmess.scy,
        udp: true,
        tls: vmess.tls === 'tls',
        fingerprint: vmess.fp,
        clientFingerprint: 'chrome',
        skipCertVerify: true,
        servername: vmess.add,
        network: vmess.net,
    };

    if (vmess.net === 'ws') {
        result.wsopts = {
            path: vmess.path,
            headers: {
                Host: vmess.host,
            },
        };
    }

    return result;
}

module.exports = { parseVmess };
