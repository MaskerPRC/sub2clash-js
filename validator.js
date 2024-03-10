const crypto = require('crypto');
const url = require('url');

class RuleProviderStruct {
    constructor(behavior, url, group, prepend, name) {
        this.Behavior = behavior;
        this.Url = url;
        this.Group = group;
        this.Prepend = prepend;
        this.Name = name;
    }
}

class RuleStruct {
    constructor(rule, prepend) {
        this.Rule = rule;
        this.Prepend = prepend;
    }
}
function validateQuery(query) {
    if ((query.sub === undefined || query.sub === '') && (query.proxy === undefined || query.proxy === '')) {
        throw new Error('参数错误: sub 和 proxy 不能同时为空');
    }
    if (query.sub) {
        query.subs = query.sub.split(',');
        query.subs.forEach(sub => {
            if (!sub.startsWith('http')) {
                throw new Error('参数错误: sub 格式错误');
            }
            new url.URL(sub); // Will throw if invalid
        });
    } else {
        query.subs = null;
    }
    if (query.proxy) {
        query.proxies = query.proxy.split(',');
    } else {
        query.proxies = null;
    }
    // Template URL validation
    if (query.template) {
        new url.URL(query.template); // Will throw if invalid
    }
    // RuleProvider parsing and validation
    if (query.ruleProvider) {
        const reg = /\[(.*?)\]/g;
        let ruleProviders = [...query.ruleProvider.matchAll(reg)];
        query.RuleProviders = ruleProviders.map(rp => {
            const parts = rp[1].split(',');
            if (parts.length < 4) {
                throw new Error('参数错误: ruleProvider 格式错误');
            }
            const uri = new url.URL(parts[1]);
            let name = parts[4];
            if (!name) {
                const hash = crypto.createHash('sha224').update(uri.toString()).digest('hex');
                name = hash;
            }
            return new RuleProviderStruct(parts[0], uri.toString(), parts[2], parts[3] === 'true', name);
        });
    } else {
        query.RuleProviders = null;
    }
    // Rule parsing and validation
    if (query.rule) {
        const reg = /\[(.*?)\]/g;
        let rules = [...query.rule.matchAll(reg)];
        query.Rules = rules.map(r => {
            const parts = r[1].split(',');
            return new RuleStruct(parts[0], parts[1] === 'true');
        });
    } else {
        query.Rules = null;
    }
    // Replace parsing and validation
    if (query.replace && query.replace.trim() !== "") {
        const reg = /\[<(.*?)>,<(.*?)>\]/g;
        let replaces = [...query.replace.matchAll(reg)];
        query.ReplaceKeys = replaces.map(r => r[1]);
        query.ReplaceTo = replaces.map(r => r[2]);
    }

    query.refresh = query.refresh === 'true';
    query.lazy = query.lazy === 'true';
    query.nodeList = query.nodeList === 'true';
    query.autoTest = query.autoTest === 'true';

    return query;
}

module.exports = {
    validateQuery
}