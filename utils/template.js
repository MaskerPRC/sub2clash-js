const fs = require('fs').promises;
const path = require('path');
const config = require('./config'); // 假设这里是你的配置文件路径

/**
 * 加载模板
 * @param {string} template 模板文件名
 * @returns {Promise<Buffer>} 模板内容
 */
async function loadTemplate(template) {
    const tPath = path.join('templates', template);
    try {
        await fs.promises.access(tPath, fs.constants.F_OK);
        const data = await fs.promises.readFile(tPath);
        return data;
    } catch (err) {
        throw new Error('模板文件不存在');
    }
}

async function writeTemplate(filePath, template) {
    const tPath = path.join('templates', filePath);
    try {
        await fs.access(tPath);
        // 如果文件存在，这里不做任何事情（为了与Go代码行为保持一致）
    } catch (err) {
        // 如果文件不存在，会抛出错误，然后我们创建文件并写入模板
        try {
            await fs.writeFile(tPath, template);
        } catch (writeErr) {
            // 处理写入文件时遇到的错误
            throw writeErr;
        }
    }
}

async function writeDefaultTemplate(templateClash) {
    try {
        await writeTemplate(config.default.clashTemplate, templateClash);
    } catch (err) {
        throw err;
    }
}

// 假设使用的例子
writeDefaultTemplate('这里是模板内容').then(() => {
    console.log('模板已成功写入');
}).catch((err) => {
    console.error('写入模板时发生错误:', err);
});
