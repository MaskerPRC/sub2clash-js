const express = require('express');
const path = require('path');
const app = express();
const port = 3000; // 你可以根据需要更改端口号

// 引入自定义的中间件和控制器
const { zapLogger } = require('./middleware/zapLogger');
const { submodHandler } = require('./controller/submodHandler');
const config = require('./config');

// 配置静态文件服务
app.use(express.static('static'));
app.use(zapLogger());

// 设置模板引擎，如果你的模板不是html格式，需要更改
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'static'));
app.engine('html', require('ejs').renderFile);

// 配置路由
app.get('/static/*', (req, res) => {
    res.sendFile(path.join(__dirname, req.path));
});

app.get('/', (req, res) => {
    let version = config.Version;
    if (config.Version.length > 7) {
        version = config.Version.substring(0, 7);
    }
    res.render('index', {
        Version: version,
    });
});

app.get('/clash', (req, res) => {
    submodHandler(req, res);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
