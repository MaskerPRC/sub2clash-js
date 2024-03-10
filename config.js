// 使用dotenv库来加载.env文件中的环境变量
require('dotenv').config();

class Config {
    constructor() {
        this.port = parseInt(process.env.PORT, 10) || 8011;
        this.metaTemplate = process.env.META_TEMPLATE || '';
        this.clashTemplate = process.env.CLASH_TEMPLATE || 'template_clash.yaml';
        this.requestRetryTimes = parseInt(process.env.REQUEST_RETRY_TIMES, 10) || 3;
        this.requestMaxFileSize = parseInt(process.env.REQUEST_MAX_FILE_SIZE, 10) || 1024 * 1024 * 1; // 默认1MB
        this.cacheExpire = parseInt(process.env.CACHE_EXPIRE, 10) || 60 * 5; // 默认5分钟
        this.logLevel = process.env.LOG_LEVEL || 'info';
        // this.basePath = process.env.BASE_PATH || '/'; // 如果需要，取消注释并处理路径结尾的/
        this.shortLinkLength = parseInt(process.env.SHORT_LINK_LENGTH, 10) || 6;
    }

    validate() {
        // 可以在这里添加一些验证逻辑，例如确保某些数值或字符串格式正确
        if (isNaN(this.port)) {
            throw new Error('PORT invalid');
        }
        if (isNaN(this.requestRetryTimes)) {
            throw new Error('REQUEST_RETRY_TIMES invalid');
        }
        if (isNaN(this.requestMaxFileSize)) {
            throw new Error('REQUEST_MAX_FILE_SIZE invalid');
        }
        if (isNaN(this.cacheExpire)) {
            throw new Error('CACHE_EXPIRE invalid');
        }
        if (isNaN(this.shortLinkLength)) {
            throw new Error('SHORT_LINK_LENGTH invalid');
        }
        // 如果使用basePath，还可以添加一些路径的验证逻辑
    }
}

// 创建config实例并导出
const config = new Config();
config.validate(); // 校验环境变量

// 导出配置对象和任何其他需要导出的变量
module.exports = {
    config,
    // 这里也可以导出Version和Dev变量，根据需要添加
    // version: '1.0.0',
    // dev: 'development',
};
