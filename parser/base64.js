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

module.exports = {
    decodeBase64
}