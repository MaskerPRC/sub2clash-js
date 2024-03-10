// 假设国家数据和相关函数是以这种方式导入的
const { CountryFlag, CountryChineseName, CountryISO, CountryEnglishName } = require('../enums/country_code_map');

function getCountryName(countryKey) {
    const countryMaps = [CountryFlag, CountryChineseName, CountryISO, CountryEnglishName];
    let checkForTW = false;

    for (let i = 0; i < countryMaps.length; i++) {
        const countryMap = countryMaps[i];
        if (i === 2) {
            const splitChars = ['-', '_', ' '];
            let key = [];
            splitChars.forEach((splitChar) => {
                const slic = countryKey.split(splitChar);
                slic.forEach((v) => {
                    if (v.length === 2) {
                        key.push(v);
                    }
                });
            });
            for (let v of key) {
                if (countryMap[v.toUpperCase()]) {
                    let country = countryMap[v.toUpperCase()];
                    if (country === '中国(CN)') {
                        checkForTW = true;
                        continue;
                    }
                    if (checkForTW && country === '台湾(TW)') {
                        return country;
                    }
                    return country;
                }
            }
        } else {
            for (let k in countryMap) {
                if (countryKey.includes(k)) {
                    let v = countryMap[k];
                    if (v === '中国(CN)') {
                        checkForTW = true;
                        continue;
                    }
                    if (checkForTW && v === '台湾(TW)') {
                        return v;
                    }
                    return v;
                }
            }
        }
    }
    if (checkForTW) {
        return '中国(CN)';
    }
    return '其他地区';
}


async function parseProxy(proxies) {
    let result = [];

    for (const proxy of proxies) {
        if (proxy !== "") {
            let proxyItem = {};
            let err = null;

            // 根据代理类型调用相应的解析方法
            if (proxy.startsWith("ss://")) {
                ({ proxyItem, err } = await ProxyParser.parseSS(proxy));
            } else if (proxy.startsWith("trojan://")) {
                ({ proxyItem, err } = await ProxyParser.parseTrojan(proxy));
            } else if (proxy.startsWith("vmess://")) {
                ({ proxyItem, err } = await ProxyParser.parseVmess(proxy));
            } else if (proxy.startsWith("vless://")) {
                ({ proxyItem, err } = await ProxyParser.parseVless(proxy));
            } else if (proxy.startsWith("ssr://")) {
                ({ proxyItem, err } = await ProxyParser.parseShadowsocksR(proxy));
            } else if (proxy.startsWith("hysteria2://")) {
                ({ proxyItem, err } = await ProxyParser.parseHysteria2(proxy));
            }

            if (err === null) {
                // 解析plugin字段
                let pluginProxyItem = {};
                try {
                    pluginProxyItem = await ProxyParser.parsePlugin(proxy);
                    proxyItem.Plugin = pluginProxyItem.Plugin;
                    proxyItem.PluginOpts = pluginProxyItem.PluginOpts;
                } catch (pluginErr) {
                    console.debug("parse plugin failed", proxy, pluginErr);
                }
                result.push(proxyItem);
            } else {
                console.debug("parse proxy failed", proxy, err);
            }
        }
    }

    return result;
}

async function parseSS(proxy) {
    // 解析SS代理，需要根据实际逻辑实现
    return { proxyItem: {}, err: null };
}

function addAllNewProxies(lazy, clashType, proxies) {
    const proxyTypes = Subscription.getSupportProxyTypes(clashType);

    // 遍历每个代理节点，添加节点
    proxies.forEach(proxy => {
        // 跳过无效类型
        if (!proxyTypes[proxy.Type]) {
            return;
        }
        this.Proxies.push(proxy);
    });
}

function getSupportProxyTypes(clashType) {
    // 假设这是获取支持的代理类型的方法，具体实现根据实际需要添加
    // 返回一个对象，键是代理类型，值是布尔值，表示是否支持该类型
    return {
        ss: true,
        trojan: true,
        vmess: true,
        vless: true,
        ssr: true,
        hysteria2: true
        // 其他代理类型...
    };
}