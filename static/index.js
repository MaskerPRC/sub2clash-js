function clearExistingValues() {
    // 清除简单输入框和复选框的值
    document.getElementById("endpoint").value = "clash";
    document.getElementById("sub").value = "";
    document.getElementById("proxy").value = "";
    document.getElementById("refresh").checked = false;
    document.getElementById("autoTest").checked = false;
    document.getElementById("lazy").checked = false;
    document.getElementById("template").value = "";
    document.getElementById("sort").value = "nameasc";
    document.getElementById("remove").value = "";
    document.getElementById("apiLink").value = "";
    document.getElementById("apiShortLink").value = "";
    document.getElementById("password").value = "";
    document.getElementById("nodeList").checked = false;

    // 清除由 createRuleProvider, createReplace, 和 createRule 创建的所有额外输入组
    clearInputGroup("ruleProviderGroup");
    clearInputGroup("replaceGroup");
    clearInputGroup("ruleGroup");
}

function generateURI() {
    const queryParams = [];

    // 获取 API Endpoint
    const endpoint = document.getElementById("endpoint").value;

    // 获取并组合订阅链接
    let subLines = document
        .getElementById("sub")
        .value.split("\n")
        .filter((line) => line.trim() !== "");
    let noSub = false;
    // 去除 subLines 中空元素
    subLines = subLines.map((item) => {
        if (item !== "") {
            return item;
        }
    });
    if (subLines.length > 0) {
        queryParams.push(`sub=${encodeURIComponent(subLines.join(","))}`);
    } else {
        noSub = true;
    }

    // 获取并组合节点分享链接
    let proxyLines = document
        .getElementById("proxy")
        .value.split("\n")
        .filter((line) => line.trim() !== "");
    let noProxy = false;
    // 去除 proxyLines 中空元素
    proxyLines = proxyLines.map((item) => {
        if (item !== "") {
            return item;
        }
    });
    if (proxyLines.length > 0) {
        queryParams.push(`proxy=${encodeURIComponent(proxyLines.join(","))}`);
    } else {
        noProxy = true;
    }
    if (noSub && noProxy) {
        alert("订阅链接和节点分享链接不能同时为空！");
        return "";
    }
    // 获取复选框的值
    const refresh = document.getElementById("refresh").checked;
    queryParams.push(`refresh=${refresh ? "true" : "false"}`);
    const autoTest = document.getElementById("autoTest").checked;
    queryParams.push(`autoTest=${autoTest ? "true" : "false"}`);
    const lazy = document.getElementById("lazy").checked;
    queryParams.push(`lazy=${lazy ? "true" : "false"}`);
    const nodeList = document.getElementById("nodeList").checked;
    queryParams.push(`nodeList=${nodeList ? "true" : "false"}`);

    // 获取模板链接或名称（如果存在）
    const template = document.getElementById("template").value;
    if (template.trim() !== "") {
        queryParams.push(`template=${encodeURIComponent(template)}`);
    }

    // 获取Rule Provider和规则
    const ruleProviders = document.getElementsByName("ruleProvider");
    const rules = document.getElementsByName("rule");
    let providers = [];
    for (let i = 0; i < ruleProviders.length / 5; i++) {
        let baseIndex = i * 5;
        let behavior = ruleProviders[baseIndex].value;
        let url = ruleProviders[baseIndex + 1].value;
        let group = ruleProviders[baseIndex + 2].value;
        let prepend = ruleProviders[baseIndex + 3].value;
        let name = ruleProviders[baseIndex + 4].value;
        // 是否存在空值
        if (
            behavior.trim() === "" ||
            url.trim() === "" ||
            group.trim() === "" ||
            prepend.trim() === "" ||
            name.trim() === ""
        ) {
            alert("Rule Provider 中存在空值，请检查后重试！");
            return "";
        }
        providers.push(`[${behavior},${url},${group},${prepend},${name}]`);
    }
    queryParams.push(`ruleProvider=${encodeURIComponent(providers.join(","))}`);

    let ruleList = [];
    for (let i = 0; i < rules.length / 3; i++) {
        if (rules[i * 3].value.trim() !== "") {
            let rule = rules[i * 3].value;
            let prepend = rules[i * 3 + 1].value;
            let group = rules[i * 3 + 2].value;
            // 是否存在空值
            if (
                rule.trim() === "" ||
                prepend.trim() === "" ||
                group.trim() === ""
            ) {
                alert("Rule 中存在空值，请检查后重试！");
                return "";
            }
            ruleList.push(`[${rule},${prepend},${group}]`);
        }
    }
    queryParams.push(`rule=${encodeURIComponent(ruleList.join(","))}`);

    // 获取排序策略
    const sort = document.getElementById("sort").value;
    queryParams.push(`sort=${sort}`);

    // 获取删除节点的正则表达式
    const remove = document.getElementById("remove").value;
    if (remove.trim() !== "") {
        queryParams.push(`remove=${encodeURIComponent(remove)}`);
    }

    // 获取替换节点名称的正则表达式
    let replaceList = [];
    const replaces = document.getElementsByName("replace");
    for (let i = 0; i < replaces.length / 2; i++) {
        let replaceStr = `<${replaces[i * 2].value}>`;
        let replaceTo = `<${replaces[i * 2 + 1].value}>`;
        if (replaceStr.trim() === "") {
            alert("重命名设置中存在空值，请检查后重试！");
            return "";
        }
        replaceList.push(`[${replaceStr},${replaceTo}]`);
    }
    queryParams.push(`replace=${encodeURIComponent(replaceList.join(","))}`);

    return `${endpoint}?${queryParams.join("&")}`;
}

// 将输入框中的 URL 解析为参数
function parseInputURL() {
    // 获取输入框中的 URL
    const inputURL = document.getElementById("urlInput").value;

    if (!inputURL) {
        alert("请输入有效的链接！");
        return;
    }

    let url;
    try {
        url = new URL(inputURL);
    } catch (_) {
        alert("无效的链接！");
        return;
    }

    // 清除现有的输入框值
    clearExistingValues();

    // 获取查询参数
    const params = new URLSearchParams(url.search);

    // 分配值到对应的输入框
    const pathSections = url.pathname.split("/");
    const lastSection = pathSections[pathSections.length - 1];
    const clientTypeSelect = document.getElementById("endpoint");
    switch (lastSection.toLowerCase()) {
        case "meta":
            clientTypeSelect.value = "meta";
            break;
        case "clash":
        default:
            clientTypeSelect.value = "clash";
            break;
    }

    if (params.has("sub")) {
        document.getElementById("sub").value = decodeURIComponent(
            params.get("sub")
        )
            .split(",")
            .join("\n");
    }

    if (params.has("proxy")) {
        document.getElementById("proxy").value = decodeURIComponent(
            params.get("proxy")
        )
            .split(",")
            .join("\n");
    }

    if (params.has("refresh")) {
        document.getElementById("refresh").checked =
            params.get("refresh") === "true";
    }

    if (params.has("autoTest")) {
        document.getElementById("autoTest").checked =
            params.get("autoTest") === "true";
    }

    if (params.has("lazy")) {
        document.getElementById("lazy").checked = params.get("lazy") === "true";
    }

    if (params.has("template")) {
        document.getElementById("template").value = decodeURIComponent(
            params.get("template")
        );
    }

    if (params.has("sort")) {
        document.getElementById("sort").value = params.get("sort");
    }

    if (params.has("remove")) {
        document.getElementById("remove").value = decodeURIComponent(
            params.get("remove")
        );
    }

    if (params.has("replace")) {
        parseAndFillReplaceParams(decodeURIComponent(params.get("replace")));
    }

    if (params.has("ruleProvider")) {
        parseAndFillRuleProviderParams(
            decodeURIComponent(params.get("ruleProvider"))
        );
    }

    if (params.has("rule")) {
        parseAndFillRuleParams(decodeURIComponent(params.get("rule")));
    }

    if (params.has("nodeList")) {
        document.getElementById("nodeList").checked =
            params.get("nodeList") === "true";
    }
}

function clearInputGroup(groupId) {
    // 清空第二个之后的child
    const group = document.getElementById(groupId);
    while (group.children.length > 2) {
        group.removeChild(group.lastChild);
    }
}

function parseAndFillReplaceParams(replaceParams) {
    const replaceGroup = document.getElementById("replaceGroup");
    let matches;
    const regex = /\[(<.*?>),(<.*?>)\]/g;
    const str = decodeURIComponent(replaceParams);
    while ((matches = regex.exec(str)) !== null) {
        const div = createReplace();
        const original = matches[1].slice(1, -1); // Remove < and >
        const replacement = matches[2].slice(1, -1); // Remove < and >

        div.children[0].value = original;
        div.children[1].value = replacement;
        replaceGroup.appendChild(div);
    }
}

function parseAndFillRuleProviderParams(ruleProviderParams) {
    const ruleProviderGroup = document.getElementById("ruleProviderGroup");
    let matches;
    const regex = /\[(.*?),(.*?),(.*?),(.*?),(.*?)\]/g;
    const str = decodeURIComponent(ruleProviderParams);
    while ((matches = regex.exec(str)) !== null) {
        const div = createRuleProvider();
        div.children[0].value = matches[1];
        div.children[1].value = matches[2];
        div.children[2].value = matches[3];
        div.children[3].value = matches[4];
        div.children[4].value = matches[5];
        ruleProviderGroup.appendChild(div);
    }
}

function parseAndFillRuleParams(ruleParams) {
    const ruleGroup = document.getElementById("ruleGroup");
    let matches;
    const regex = /\[(.*?),(.*?),(.*?)\]/g;
    const str = decodeURIComponent(ruleParams);
    while ((matches = regex.exec(str)) !== null) {
        const div = createRule();
        div.children[0].value = matches[1];
        div.children[1].value = matches[2];
        div.children[2].value = matches[3];
        ruleGroup.appendChild(div);
    }
}

async function copyToClipboard(elem, e) {
    const apiLinkInput = document.querySelector(`#${elem}`).value;
    try {
        await navigator.clipboard.writeText(apiLinkInput);
        let text = e.textContent;
        e.addEventListener("mouseout", function () {
            e.textContent = text;
        });
        e.textContent = "复制成功";
    } catch (err) {
        console.error("复制到剪贴板失败:", err);
    }
}

function createRuleProvider() {
    const div = document.createElement("div");
    div.classList.add("input-group", "mb-2");
    div.innerHTML = `
            <input type="text" class="form-control" name="ruleProvider" placeholder="Behavior">
            <input type="text" class="form-control" name="ruleProvider" placeholder="Url">
            <input type="text" class="form-control" name="ruleProvider" placeholder="Group">
            <input type="text" class="form-control" name="ruleProvider" placeholder="Prepend">
            <input type="text" class="form-control" name="ruleProvider" placeholder="Name">
            <button type="button" class="btn btn-danger" onclick="removeElement(this)">删除</button>
        `;
    return div;
}

function createReplace() {
    const div = document.createElement("div");
    div.classList.add("input-group", "mb-2");
    div.innerHTML = `
            <input type="text" class="form-control" name="replace" placeholder="原字符串（正则表达式）">
            <input type="text" class="form-control" name="replace" placeholder="替换为（可为空）">
            <button type="button" class="btn btn-danger" onclick="removeElement(this)">删除</button>
        `;
    return div;
}

function createRule() {
    const div = document.createElement("div");
    div.classList.add("input-group", "mb-2");
    div.innerHTML = `
            <input type="text" class="form-control" name="rule" placeholder="Rule">
            <input type="text" class="form-control" name="rule" placeholder="Prepend">
            <input type="text" class="form-control" name="rule" placeholder="Group">
            <button type="button" class="btn btn-danger" onclick="removeElement(this)">删除</button>
        `;
    return div;
}

function addRuleProvider() {
    const div = createRuleProvider();
    document.getElementById("ruleProviderGroup").appendChild(div);
}

function addRule() {
    const div = createRule();
    document.getElementById("ruleGroup").appendChild(div);
}

function addReplace() {
    const div = createReplace();
    document.getElementById("replaceGroup").appendChild(div);
}

function removeElement(button) {
    button.parentElement.remove();
}

function generateURL() {
    const apiLink = document.getElementById("apiLink");
    let uri = generateURI();
    if (uri === "") {
        return;
    }
    apiLink.value = `${window.location.origin}${window.location.pathname}${uri}`;
}

function generateShortLink() {
    const apiShortLink = document.getElementById("apiShortLink");
    const password = document.getElementById("password");
    let uri = generateURI();
    if (uri === "") {
        return;
    }
    axios
        .post(
            "./short",
            {
                url: uri,
                password: password.value.trim(),
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        )
        .then((response) => {
            apiShortLink.value = `${window.location.origin}${window.location.pathname}s/${response.data}`;
        })
        .catch((error) => {
            console.log(error);
            alert("生成短链失败，请重试！");
        });
}
