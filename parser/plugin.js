const url = require('url');

class Proxy {
    constructor() {
        this.Plugin = '';
        this.PluginOpts = {};
        this.Tfo = false;
    }
}

function parsePlugin(proxyURL) {
    return new Promise((resolve, reject) => {
        let parsedUrl;
        try {
            parsedUrl = new URL(proxyURL);
        } catch (error) {
            return reject(error);
        }

        const proxy = new Proxy();
        const queryParams = parsedUrl.searchParams;

        if (queryParams.has('plugin')) {
            const plugin = queryParams.get('plugin');
            const pluginParts = plugin.split(';');
            if (pluginParts.length > 0) {
                pluginParts.forEach((part, i) => {
                    if (i === 0) {
                        if (part === 'obfs-local') {
                            proxy.Plugin = 'obfs';
                        }
                    } else {
                        const opt = part.split('=');
                        if (opt.length === 2) {
                            if (opt[0] === 'obfs') {
                                proxy.PluginOpts.mode = opt[1];
                            } else if (opt[0] === 'obfs-host') {
                                proxy.PluginOpts.host = opt[1];
                            } else if (opt[0] === 'tfo' && opt[1] === '1') {
                                proxy.Tfo = true;
                            }
                        }
                    }
                });
            }
        }

        resolve(proxy);
    });
}


module.exports = {
    parsePlugin
}