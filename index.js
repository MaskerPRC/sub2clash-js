const url = require('url');
const yaml = require('js-yaml');
const axios = require('axios'); // 假设用axios加载订阅内容
const { decodeBase64 } = require('./parser/base64'); // 假设存在对应的解析模块
const { getCountryName, parseProxy } = require('./utils/proxy'); // 同样，假设有相应的实用功能
const fs = require('fs').promises;
const { addAllNewProxies, prependRules, appendRules, prependRuleProvider, appendRuleProvider } = require('./utils/proxy'); // 假设这些函数已经实现
const crypto = require('crypto');


async function parseGroupTags(subURL, newProxies) {
    const parsedURL = new url.URL(subURL);
    const groupsParam = parsedURL.searchParams.get("SubTags");

    if (groupsParam) {
        const subTags = groupsParam.split(",");
        newProxies.forEach(proxy => {
            proxy.SubTags = subTags;
        });
    }
}

function parseCountries(newProxies) {
    newProxies.forEach(proxy => {
        proxy.Country = getCountryName(proxy.Name);
    });
}

async function walkSubsForProxyList(sub, query) {
    try {
        for (let subURL of query.Subs) {
            const data = await loadSubscription(subURL, query.Refresh);
            let subName = "";
            if (subURL.includes("#")) {
                subName = subURL.substring(subURL.lastIndexOf("#") + 1);
            }

            let newProxies = [];
            try {
                const parsedData = yaml.load(data);
                Object.assign(sub, parsedData); // Assuming sub is an object that should be filled with the parsed data
                newProxies = sub.Proxies || [];
            } catch (err) {
                // Assuming regex and proxy parsing utilities are implemented
                const reg = new RegExp("(ssr|ss|vmess|trojan|vless)://");
                if (reg.test(data)) {
                    newProxies = parseProxy(data.split("\n"));
                } else {
                    // If the data doesn't match, try Base64 decoding
                    try {
                        const base64Decoded = decodeBase64(data);
                        newProxies = parseProxy(base64Decoded.split("\n"));
                    } catch (err) {
                        console.log("Parse subscription failed", { url: subURL, data, error: err });
                        return [false, new Error("加载订阅失败: " + err.message)];
                    }
                }
            }

            if (subName) {
                newProxies.forEach(proxy => {
                    proxy.SubName = subName;
                });
            }

            // Further parsing and adjustments
            await parseGroupTags(subURL, newProxies);
            parseCountries(newProxies);

            // Assuming proxyList is an array that new proxies should be added to
            if (!Array.isArray(sub.Proxies)) sub.Proxies = [];
            sub.Proxies.push(...newProxies);
        }

        return [true, null];
    } catch (err) {
        console.log("Error processing subscriptions", err);
        return [false, err];
    }
}

// 这里假设loadSubscription是一个异步函数，用于加载并返回订阅内容
async function loadSubscription(subURL, refresh) {
    // 实现具体的订阅加载逻辑，可能需要调用外部API或进行HTTP请求
    const response = await axios.get(subURL); // 示例请求
    return response.data; // 假设直接返回响应体作为数据
}

async function buildSub(clashType, query, templatePath) {
    let template = templatePath;
    if (query.Template !== "") {
        template = query.Template;
    }

    let templateBytes;
    try {
        const parsedURL = new URL(template);
        if (parsedURL.protocol === 'http:' || parsedURL.protocol === 'https:') {
            // Assuming it's an online HTTP configuration
            const response = await axios.get(template);
            templateBytes = response.data;
        } else {
            // Assuming it's a file path
            templateBytes = await fs.readFile(template, 'utf8');
        }
    } catch (err) {
        console.log("Load template failed", { template, error: err.message });
        return [null, new Error("加载模板失败: " + err.message)];
    }

    let temp;
    try {
        temp = yaml.load(templateBytes);
    } catch (err) {
        console.log("Parse template failed", { error: err.message });
        return [null, new Error("解析模板失败: " + err.message)];
    }

    let sub = {};
    let proxyList = [];

    // Walking subscriptions for proxy list might require some adjustments
    const [success, error] = await walkSubsForProxyList(sub, query, proxyList);
    if (!success) {
        return [null, error];
    }

    if (query.Proxies && query.Proxies.length !== 0) {
        proxyList.push(...parseProxy(query.Proxies));
    }

    // Add subscription name to the proxy names
    proxyList.forEach(proxy => {
        if (proxy.SubName) {
            proxy.Name = `${proxy.SubName.trim()} ${proxy.Name.trim()}`;
        }
    });

    // Remove duplicates
    const proxiesMap = {};
    const newProxies = [];
    proxyList.forEach(proxy => {
        const key = `${proxy.Server}:${proxy.Port}:${proxy.Type}`;
        if (!proxiesMap[key]) {
            proxiesMap[key] = proxy;
            newProxies.push(proxy);
        }
    });
    proxyList = newProxies;

    // Remove proxies based on regex pattern
    if (query.Remove.trim() !== "") {
        try {
            const removeReg = new RegExp(query.Remove);
            proxyList = proxyList.filter(proxy => !removeReg.test(proxy.Name));
        } catch (err) {
            console.log("Remove regexp compile failed", { error: err.message });
            return [null, new Error("remove 参数非法: " + err.message)];
        }
    }

    // Here you should merge your proxies with the template
    // Assuming `temp` is your subscription object to be returned
    // and it has a field `Proxies` or similar to hold the proxy list
    temp.Proxies = proxyList;

    return [temp, null];
}


async function continueBuildSub(proxyList, query, temp) {
    // 重命名
    if (query.ReplaceKeys && query.ReplaceKeys.length > 0) {
        const replaceRegs = query.ReplaceKeys.map(v => new RegExp(v));
        proxyList.forEach((proxy, i) => {
            replaceRegs.forEach((reg, j) => {
                if (reg.test(proxy.Name)) {
                    proxy.Name = proxy.Name.replace(reg, query.ReplaceTo[j]);
                }
            });
        });
    }

    // 重名检测
    const names = {};
    proxyList.forEach(proxy => {
        if (names[proxy.Name]) {
            names[proxy.Name]++;
            proxy.Name = `${proxy.Name} ${names[proxy.Name]}`;
        } else {
            names[proxy.Name] = 1;
        }
    });

    // Trim proxy names
    proxyList.forEach(proxy => {
        proxy.Name = proxy.Name.trim();
    });

    // Assuming proxyList is ready and temp is the template to be filled
    let t = { Proxies: proxyList }; // Simplified version, adjust according to your structure

    // Sort proxy groups (placeholder, implement sorting logic as needed)
    // Assuming temp has a ProxyGroups field to be sorted
    switch (query.Sort) {
        case 'sizeasc':
            // Implement sorting by size ascending
            break;
        case 'sizedesc':
            // Implement sorting by size descending
            break;
        case 'nameasc':
            // Implement sorting by name ascending
            break;
        case 'namedesc':
            // Implement sorting by name descending
            break;
        default:
        // Default sorting, possibly by name ascending
    }

    // Merge proxies and template, placeholder for the merge logic
    // Assuming function to merge subscription data with template
    mergeSubAndTemplate(temp, t, query.Lazy);

    // Custom rules handling
    query.Rules.forEach(rule => {
        if (rule.Prepend) {
            prependRules(temp, rule.Rule);
        } else {
            appendRules(temp, rule.Rule);
        }
    });

    // Custom ruleProvider handling
    query.RuleProviders.forEach(provider => {
        const hash = crypto.createHash('sha256').update(provider.Url).digest('hex');
        const name = hash.substring(0, 56); // Equivalent to Sum224 in Go
        const ruleProvider = {
            Type: "http",
            Behavior: provider.Behavior,
            Url: provider.Url,
            Path: `./${name}.yaml`,
            Interval: 3600,
        };
        if (provider.Prepend) {
            prependRuleProvider(temp, provider.Name, provider.Group, ruleProvider);
        } else {
            appendRuleProvider(temp, provider.Name, provider.Group, ruleProvider);
        }
    });

    return temp;
}

// 解析查询条件，转换为适用于JavaScript的格式
function parseQuery(syntax) {
    if (syntax === "{}") {
        return "{}";
    }
    try {
        const condition = JSON.parse(syntax);
        return condition;
    } catch (err) {
        throw new Error(`Error parsing query: ${err}`);
    }
}

// 匹配代理
function matchProxy(proxy, condition) {
    if (condition === "{}") {
        return true;
    }

    if (typeof condition === 'object' && condition !== null) {
        return matchMapCondition(proxy, condition);
    }

    return false;
}

function getProxyFieldArray(proxy, field) {
    switch (field) {
        case "SubTags":
            return proxy.SubTags;
        default:
            return [];
    }
}

function matchMapCondition(proxy, condition) {
    if (condition.$and) {
        return condition.$and.every(andCond => matchProxy(proxy, andCond));
    }

    if (condition.$or) {
        return condition.$or.some(orCond => matchProxy(proxy, orCond));
    }

    if (condition.$not) {
        return condition.$not.every(notCond => !matchProxy(proxy, notCond));
    }

    for (const [field, compCond] of Object.entries(condition)) {
        if (compCond.$eq && proxy[field] !== compCond.$eq) {
            return false;
        }
        if (compCond.$regex && !new RegExp(compCond.$regex).test(proxy[field])) {
            return false;
        }
        if (compCond.$elemMatch) {
            const fieldValues = getProxyFieldArray(proxy, field);
            if (!fieldValues.some(fieldValue => matchProxyFieldValue(fieldValue, compCond.$elemMatch))) {
                return false;
            }
        }
    }

    return true;
}

// 这里我们需要一个新函数来匹配特定字段值
function matchProxyFieldValue(value, condition) {
    if (condition.$eq && value !== condition.$eq) {
        return false;
    }
    if (condition.$regex && !new RegExp(condition.$regex).test(value)) {
        return false;
    }
    return true;
}
// 假设proxyList是一个包含代理的数组，temp是一个订阅对象

// 重命名
if (query.ReplaceKeys && query.ReplaceKeys.length > 0) {
    const replaceRegs = query.ReplaceKeys.map(key => new RegExp(key));
    proxyList.forEach(proxy => {
        replaceRegs.forEach((reg, index) => {
            proxy.Name = proxy.Name.replace(reg, query.ReplaceTo[index]);
        });
    });
}

// 重名检测
const names = {};
proxyList.forEach(proxy => {
    if (names[proxy.Name]) {
        names[proxy.Name] += 1;
        proxy.Name += ` ${names[proxy.Name]}`;
    } else {
        names[proxy.Name] = 1;
    }
});

// 添加所有新节点
addAllNewProxies(temp, query.Lazy, clashType, ...proxyList);

// 排序策略组（示例假设存在相应的排序函数）

// 合并新节点和模板
mergeSubAndTemplate(temp, t, query.Lazy);

// 处理自定义规则
query.Rules.forEach(rule => {
    if (rule.Prepend) {
        prependRules(temp, rule.Rule);
    } else {
        appendRules(temp, rule.Rule);
    }
});

// 处理自定义ruleProvider
query.RuleProviders.forEach(provider => {
    const hash = crypto.createHash('sha224').update(provider.Url).digest('hex');
    const providerObj = {
        Type: "http",
        Behavior: provider.Behavior,

    }
});

function matchProxyFieldValue(fieldValue, condition) {
    for (const [key, value] of Object.entries(condition)) {
        switch (key) {
            case '$eq':
                if (fieldValue !== value) {
                    return false;
                }
                break;
            case '$regex':
                const regex = new RegExp(value);
                if (!regex.test(fieldValue)) {
                    return false;
                }
                break;
            default:
                // 如果存在不支持的条件类型，可以在这里处理
                break;
        }
    }
    return true;
}

function getProxyFieldValue(proxy, field) {
    // 直接访问对象的属性以获取字段值
    return proxy[field] || ''; // 返回空字符串作为默认值，如果字段不存在
}

function parseSyntaxA(syntax, sub) {
    const query = parseQuery(syntax); // 假设parseQuery已经实现
    const matchedProxyNames = [];
    const matchedProxies = [];

    sub.proxies.forEach(proxy => {
        if (matchProxy(proxy, query)) { // 假设matchProxy已经实现
            matchedProxyNames.push(proxy.name);
            matchedProxies.push(proxy);
        }
    });

    return [matchedProxyNames, matchedProxies];
}

function addNewGroup(sub, insertGroup, autotest, lazy) {
    const newGroup = {
        name: insertGroup,
        type: autotest ? 'url-test' : 'select',
        proxies: [],
        isCountryGroup: true,
        size: 1,
        ...(autotest && { // 条件性地添加额外的属性
            url: "https://www.gstatic.com/generate_204",
            interval: 300,
            tolerance: 50,
            lazy,
        }),
    };

    sub.proxyGroups.push(newGroup);
}

function addToGroup(sub, proxy, insertGroup) {
    const group = sub.proxyGroups.find(g => g.name === insertGroup);
    if (group) {
        group.proxies.push(proxy.name);
        group.size++;
        return true;
    }
    return false;
}

function parseAlias(input) {
    const parts = input.split(':', 2);
    return {
        alias: parts.length === 2 ? parts[0] : '',
        syntax: parts.length === 2 ? parts[1] : input
    };
}

function mergeSubAndTemplate(temp, sub, lazy) {
    // 统计所有国家策略组名称
    const countryGroupNames = sub.proxyGroups
        .filter(group => group.isCountryGroup)
        .map(group => group.name);

    // 获取所有代理的名称
    const proxyNames = sub.proxies.map(proxy => proxy.name);

    // 将订阅中的代理添加到模板中
    temp.proxies.push(...sub.proxies);

    const existProxyName = new Set(); // 使用Set来检查存在性

    // 将订阅中的策略组添加到模板中
    temp.proxyGroups.forEach(group => {
        if (group.isCountryGroup) {
            return;
        }

        const newProxies = [];
        const countryGroupMap = sub.proxyGroups.reduce((acc, group) => {
            if (group.isCountryGroup) {
                acc[group.name] = group;
            }
            return acc;
        }, {});

        group.proxies.forEach(proxyName => {
            if (proxyName.startsWith("<") && proxyName.endsWith(">")) {
                let [alias, value] = parseAlias(proxyName.slice(1, -1)); // 移除尖括号并解析别名

                if (alias) {
                    proxyName = alias;
                }

                if (proxyName === "<>") {
                    const [parsedProxyNames] = parseSyntaxA("{}", sub);
                    newProxies.push(...parsedProxyNames);
                } else {
                    const syntax = value;
                    const [parsedProxyNames, proxies] = parseSyntaxA(syntax, sub);

                    if (!existProxyName.has(proxyName)) {
                        existProxyName.add(proxyName);
                        proxies.forEach(proxy => {
                            let insertSuccess = addToGroup(sub, proxy, proxyName);

                            if (!insertSuccess) {
                                addNewGroup(sub, proxyName, true, lazy);
                                addToGroup(sub, proxy, proxyName);
                            }
                        });
                    }

                    if (parsedProxyNames.length > 0) {
                        newProxies.push(proxyName);
                    }
                }
            } else {
                newProxies.push(proxyName);
            }
        });

        group.proxies = newProxies;
    });

    temp.proxyGroups.push(...sub.proxyGroups);
}

// 注意: 需要确保parseSyntaxA, addToGroup, 和 addNewGroup等函数已经按照之前的指示重写并可用。
