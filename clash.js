const yaml = require('js-yaml');
const { validateQuery } = require('./validator'); // 假设你已经有了对应的JavaScript实现
const { buildSub } = require('./index'); // 假设你已经有了BuildSub的JavaScript实现
const config = require('./config'); // 假设你已经有了对应的配置文件的JavaScript版本

async function submodHandler(req, res) {
    try {
        const query = validateQuery(req.query); // 假设这个函数可以处理类似的解析逻辑
        const sub = await buildSub('Clash', query, config.default.clashTemplate); // 假设这是一个异步函数

        if (query.nodeListMode) {
            const nodeList = {
                proxies: sub.proxies
            };
            const marshal = yaml.dump(nodeList);
            res.type('text/yaml').status(200).send(marshal);
        } else {
            const marshal = yaml.dump(sub);
            res.type('text/yaml').status(200).send(marshal);
        }
    } catch (err) {
        if (err.message === 'Bad Request') {
            res.status(400).send(err.message);
        } else if (err.message === 'Internal Server Error') {
            res.status(500).send(err.message);
        } else {
            res.status(500).send("YAML序列化失败: " + err.message);
        }
    }
}

module.exports = {
    submodHandler
}