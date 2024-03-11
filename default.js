const url = require('url');
const yaml = require('js-yaml');
const axios = require('axios'); // 假设用axios加载订阅内容
const { decodeBase64 } = require('./parser/base64'); // 假设存在对应的解析模块
const { getCountryName, parseProxy } = require('./utils/proxy'); // 同样，假设有相应的实用功能
const fs = require('fs').promises;
const { addAllNewProxies, prependRules, appendRules, prependRuleProvider, appendRuleProvider } = require('./utils/proxy'); // 假设这些函数已经实现
const crypto = require('crypto');
const {loadSubscription} = require("./utils/sub");
const {loadTemplate} = require("./utils/template");
const Query = require("query");



async function parseGroupTags(subURL, newProxies) {
    const parsedURL = new url.URL(subURL);
    const groupsParam = parsedURL.searchParams.get("subTags");

    if (groupsParam) {
        const subTags = groupsParam.split(",");
        newProxies.forEach(proxy => {
            proxy.subTags = subTags;
        });
    }
}

function parseCountries(newProxies) {
    newProxies.forEach(proxy => {
        if (!proxy.name) {
            proxy.name = ""
        }
        proxy.country = getCountryName(proxy.name);
    });
}

async function walkSubsForProxyList(sub, query, proxyList) {
    try {
        for (let subURL of query.subs) {
            let data;
            try {
                data = await loadSubscription(subURL, query.refresh);
            } catch (err) {
                console.error("链接无法获取: " + subURL);
                continue;
            }
            let subName = "";
            if (subURL.includes("#")) {
                subName = subURL.substring(subURL.lastIndexOf("#") + 1);
            }

            let newProxies = [];
            try {
                const parsedData = yaml.load(data);
                Object.assign(sub, parsedData); // Assuming sub is an object that should be filled with the parsed data
                newProxies = sub.proxies || [];
            } catch (err) {

            }

            // Assuming regex and proxy parsing utilities are implemented
            const reg = new RegExp("(ssr|ss|vmess|trojan|vless)://");
            if (reg.test(data)) {
                newProxies = parseProxy(data.split("\n"));
            } else {
                // If the data doesn't match, try Base64 decoding
                try {
                    const [base64Decoded, err] = decodeBase64(data.toString());
                    newProxies = await parseProxy(base64Decoded.split("\n"));
                } catch (err) {
                    console.log("Parse subscription failed", { url: subURL, data, error: err });
                    return [false, new Error("加载订阅失败: " + err.message)];
                }
            }

            // Further parsing and adjustments
            await parseGroupTags(subURL, newProxies);
            parseCountries(newProxies);

            proxyList.push(...newProxies);
        }

        return [true, null];
    } catch (err) {
        console.log("Error processing subscriptions", err);
        return [false, err];
    }
}

async function buildSub(clashType, query, templatePath) {
    let template = templatePath;
    if (query.Template) {
        template = query.Template;
    }

    let templateBytes;
    try {
        const parsedURL = new URL(template);
        if (parsedURL.protocol === 'http:' || parsedURL.protocol === 'https:') {
            // Assuming it's an online HTTP configuration
            const response = await loadSubscription(template, query.refresh)
            templateBytes = response.data;
        } else {
            templateBytes = await loadTemplate(template)
        }
    } catch (err) {
        templateBytes = await loadTemplate(template)
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

    // 遍历订阅链接 获取 proxyList
    const [success, error] = await walkSubsForProxyList(sub, query, proxyList);
    if (!success) {
        return [null, error];
    }

    // 添加自定义节点
    if (query.proxies && query.proxies.length !== 0) {
        proxyList.push(...await parseProxy(query.proxies));
    }

    // 去掉配置相同的节点
    const proxiesMap = {};
    const newProxies = [];
    proxyList.forEach(proxy => {
        const key = `${proxy.server}:${proxy.port}:${proxy.type}`;
        if (!proxiesMap[key]) {
            proxiesMap[key] = proxy;
            newProxies.push(proxy);
        }
    });
    proxyList = newProxies;

    // 删除节点
    if (query.remove && query.remove.trim() !== "") {
        try {
            const removeReg = new RegExp(query.Remove);
            proxyList = proxyList.filter(proxy => !removeReg.test(proxy.name));
        } catch (err) {
            console.log("Remove regexp compile failed", { error: err.message });
            return [null, new Error("remove 参数非法: " + err.message)];
        }
    }

    return continueBuildSub(clashType, proxyList, query, temp);
}

async function continueBuildSub(clashType, proxyList, query, temp) {
    // 重命名
    if (query.ReplaceKeys && query.ReplaceKeys.length > 0) {
        const replaceRegs = query.ReplaceKeys.map(v => new RegExp(v));
        proxyList.forEach((proxy, i) => {
            replaceRegs.forEach((reg, j) => {
                if (reg.test(proxy.name)) {
                    proxy.name = proxy.name.replace(reg, query.ReplaceTo[j]);
                }
            });
        });
    }

    // 重名检测
    const names = {};
    proxyList.forEach(proxy => {
        if (names[proxy.name]) {
            names[proxy.name]++;
            proxy.name = `${proxy.name} ${names[proxy.name]}`;
        } else {
            names[proxy.name] = 1;
        }
    });

    // trim
    proxyList.forEach(proxy => {
        proxy.name = proxy.name.trim();
    });

    // 将新增节点都添加到临时变量 t 中，防止策略组排序错乱
    let t = { proxies: [] };

    // 过滤不支持的协议
    addAllNewProxies(t, query.lazy, clashType, proxyList)

    // todo: 关闭排序策略组，后续看要不要开
    // switch (query.sort) {
    //     case 'nameasc':
    //         t.proxies = t.proxies.sort((a, b) => a.name - b.name);
    //         break;
    //     case 'namedesc':
    //         t.proxies = t.proxies.sort((a, b) => b.name - a.name);
    //         break;
    //     default:
    // }

    await mergeSubAndTemplate(temp, t, query.lazy);

    // 处理自定义规则
    query.Rules = query.Rules || [];
    query.Rules.forEach(rule => {
        if (rule.Prepend) {
            prependRules(temp, rule.Rule);
        } else {
            appendRules(temp, rule.Rule);
        }
    });

    // 处理自定义 ruleProvider
    query.RuleProviders = query.RuleProviders || [];
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
            prependRuleProvider(temp, provider.name, provider.Group, ruleProvider);
        } else {
            appendRuleProvider(temp, provider.name, provider.Group, ruleProvider);
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
        case "subTags":
            return proxy.subTags;
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

function addNewGroup(proxyGroups, insertGroup, autotest, lazy) {
    const newGroup = {
        name: insertGroup,
        type: autotest ? 'url-test' : 'select',
        proxies: [],
        size: 1,
        ...(autotest && { // 条件性地添加额外的属性
            url: "https://www.gstatic.com/generate_204",
            interval: 300,
            tolerance: 50,
            lazy,
        }),
    };

    proxyGroups.push(newGroup);
}

function addToGroup(proxyGroups, proxy, insertGroup) {
    const group = proxyGroups.find(g => g.name === insertGroup);
    if (group) {
        group.proxies.push(proxy.name);
        group.size++;
        return true;
    }
    return false;
}

function parseAlias(input) {
    // 使用正则表达式匹配输入字符串
    // 正则表达式解释：寻找字符串中的第一个冒号，并捕获冒号前的所有内容作为第一部分
    // 冒号后的所有内容作为第二部分
    const match = input.match(/^(.*?):(.*)$/);
    if (match) {
        // 如果匹配成功，返回捕获的两部分
        // match[0] 是整个匹配的字符串，match[1] 是第一个捕获组（冒号前的内容）
        // match[2] 是第二个捕获组（冒号后的所有内容）
        return [match[1], match[2].trim()]; // 使用 trim() 清理第二部分的前导和尾随空格
    } else {
        // 如果没有匹配到（即字符串中没有冒号），按照指定的格式返回
        return ["", input];
    }
}

async function mergeSubAndTemplate(temp, sub, lazy) {
    // 统计所有国家策略组名称
    sub.proxyGroups = sub.proxyGroups || []

    // 将订阅中的代理添加到模板中
    temp.proxies = temp.proxies || [];
    temp.proxies.push(...sub.proxies);

    const existProxyName = new Map(); // 使用Set来检查存在性

    // 将订阅中的策略组添加到模板中
    for (const group of temp['proxy-groups']) {
        const newProxies = [];

        // 遍历每一个mongodb过滤器，获取所有的过滤器，将当前组的过滤器先行添加到当前组，并最后合并到一个全部的过滤器组，最后一次性附加到每个组的最后
        for (let proxyName of group.proxies) {

            // 保留语法处理
            if (proxyName.startsWith("<") && proxyName.endsWith(">")) {
                let [alias, value] = parseAlias(proxyName.slice(1, -1)); // 移除尖括号并解析别名

                if (alias) {
                    proxyName = alias;
                }

                if (proxyName === "<>") {
                    // 为空表示全部节点附加到最后，而不是作为一个查询组
                    newProxies.push(...sub.proxies);
                } else {
                    // 解析一个过滤器，获取节点列表，
                    const mongoSql = JSON.parse(value);
                    const proxies = sub.proxies;
                    let proxiesFiltered = await Query.query(proxies, mongoSql);

                    // 将策略组名称加入到模板策略组中
                    if (proxiesFiltered.length > 0) {
                        newProxies.push(proxyName);
                    }

                    // 并生成一个自动生成的url-test策略组，需要检测此策略组是否存在，需要将所有的查询结果插入到此策略组
                    if (!existProxyName.has(proxyName)) {
                        // 临时存储所有需要生成的url-test策略组
                        existProxyName.set(proxyName, proxiesFiltered);
                    }

                }
            } else {
                // 普通节点名
                newProxies.push(proxyName);
            }
        }

        // 模板的策略组
        group.proxies = newProxies;
    }

    // 对每个模板策略组进行遍历，将所有的自动测速策略组附加到模板策略组最后
    for (const group of temp['proxy-groups']) {
        const name = group.name;
        // 获取当前组的所有模板策略组
        const proxiesSet = new Set();
        proxiesSet.add(name)
        for (let proxyName of group.proxies) {
            proxiesSet.add(proxyName);
        }
        // 遍历自动测试策略组，添加到每个模板策略组的最后
        existProxyName.forEach((value, key) => {
            const proxyName = key;
            if (!proxiesSet.has(proxyName) && value.length) {
                group.proxies.push(proxyName);
            }
        });
    }

    // 生成所有的自动url-test策略组
    existProxyName.forEach((value, key) => {
        const proxyName = key;
        const proxies = value;
        proxies.forEach(proxy => {
            let insertSuccess = addToGroup(temp['proxy-groups'], proxy, proxyName);

            if (!insertSuccess) {
                addNewGroup(temp['proxy-groups'], proxyName, true, lazy);
                addToGroup(temp['proxy-groups'], proxy, proxyName);
            }
        });
    });

    temp['proxy-groups'].push(...sub.proxyGroups);
}

// 注意: 需要确保parseSyntaxA, addToGroup, 和 addNewGroup等函数已经按照之前的指示重写并可用。

module.exports = {
    buildSub,
    loadSubscription
}