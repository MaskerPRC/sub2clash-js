// 假设国家数据和相关函数是以这种方式导入的
const { CountryFlag, CountryChineseName, CountryISO, CountryEnglishName } = require('./model');

function getCountryName(countryKey) {
    const countryMaps = [CountryFlag, CountryChineseName, CountryISO, CountryEnglishName];
    let checkForTW = false;

    for (let i = 0; i < countryMaps.length; i++) {
        const countryMap = countryMaps[i];
        if (i === 2) {
            const splitChars = ['-', '_', ' '];
            let key = [];
            splitChars.forEach((splitChar) => {
                const slic = countryKey.split(splitChar);
                slic.forEach((v) => {
                    if (v.length === 2) {
                        key.push(v);
                    }
                });
            });
            for (let v of key) {
                if (countryMap[v.toUpperCase()]) {
                    let country = countryMap[v.toUpperCase()];
                    if (country === '中国(CN)') {
                        checkForTW = true;
                        continue;
                    }
                    if (checkForTW && country === '台湾(TW)') {
                        return country;
                    }
                    return country;
                }
            }
        } else {
            for (let k in countryMap) {
                if (countryKey.includes(k)) {
                    let v = countryMap[k];
                    if (v === '中国(CN)') {
                        checkForTW = true;
                        continue;
                    }
                    if (checkForTW && v === '台湾(TW)') {
                        return v;
                    }
                    return v;
                }
            }
        }
    }
    if (checkForTW) {
        return '中国(CN)';
    }
    return '其他地区';
}
