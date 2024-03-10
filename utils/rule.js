class Subscription {
    constructor() {
        this.RuleProviders = {};
        this.Rules = [];
    }

    prependRuleProvider(providerName, group, provider) {
        this.RuleProviders[providerName] = provider;
        this.prependRules(`RULE-SET,${providerName},${group}`);
    }

    appendRuleProvider(providerName, group, provider) {
        this.RuleProviders[providerName] = provider;
        this.appendRules(`RULE-SET,${providerName},${group}`);
    }

    prependRules(...rules) {
        this.Rules = [...rules, ...this.Rules];
    }

    appendRules(...rules) {
        const matchRuleIndex = this.Rules.findIndex(rule => rule.includes('MATCH'));
        if (matchRuleIndex !== -1) {
            // 如果在规则列表中找到了'MATCH'规则，就在它之前添加新的规则
            const matchRule = this.Rules.splice(matchRuleIndex, 1)[0];
            this.Rules = [...this.Rules, ...rules, matchRule];
        } else {
            this.Rules = [...this.Rules, ...rules];
        }
    }
}
