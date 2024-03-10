const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const subsDir = 'subs';
const cacheExpire = 86400; // 假设默认缓存时间为24小时，应从配置读取

async function loadSubscription(url, refresh = false) {
    if (refresh) {
        return fetchSubscriptionFromAPI(url);
    }

    const hash = crypto.createHash('sha256').update(url).digest('hex');
    const fileName = path.join(subsDir, hash);

    try {
        const stat = await fs.stat(fileName);
        const lastGetTime = Math.floor(stat.mtime.getTime() / 1000);

        if (lastGetTime + cacheExpire > Math.floor(Date.now() / 1000)) {
            const subContent = await fs.readFile(fileName);
            return subContent;
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
        // 文件不存在，从API获取
        return fetchSubscriptionFromAPI(url);
    }
    // 缓存过期，重新从API获取
    return fetchSubscriptionFromAPI(url);
}

async function fetchSubscriptionFromAPI(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const data = response.data;

        const hash = crypto.createHash('sha256').update(url).digest('hex');
        const fileName = path.join(subsDir, hash);

        await fs.writeFile(fileName, data);
        return data;
    } catch (err) {
        throw new Error(`Failed to fetch subscription: ${err.message}`);
    }
}

module.exports = {
    loadSubscription,
    fetchSubscriptionFromAPI
}