const decodeBase64 = (s) => {
    s = s.trim();
    while (s.length % 4 !== 0) {
        s += "=";
    }
    try {
        const decodedStr = Buffer.from(s, 'base64').toString('utf-8');
        return [decodedStr, null];
    } catch (err) {
        return [null, err];
    }
};

// 使用示例
const [result, error] = decodeBase64('您的Base64编码字符串');
if (error) {
    console.error('解码错误:', error);
} else {
    console.log('解码结果:', result);
}
