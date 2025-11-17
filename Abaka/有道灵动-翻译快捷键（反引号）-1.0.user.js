// ==UserScript==
// @name         有道灵动-翻译快捷键（反引号）
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  按下 ` 键来点击 yd-mg-icon 内部的 #logo
// @author       YourName
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 监听整个文档的键盘按下事件
    document.addEventListener('keydown', function(event) {
        // 判断是否按下的是反引号键（`）
        // key 属性在大多数浏览器中是 'Backquote'
        // code 属性是 'Backquote'，更标准
        if (event.key === '`' || event.code === 'Backquote') {
            // 阻止默认行为，比如在输入框中输入反引号
            event.preventDefault();

            console.log('检测到反引号快捷键，尝试触发点击...');

            // --- 你提供的核心逻辑开始 ---
            const iconHost = document.querySelector('yd-mg-icon');
            if (iconHost) {
                const shadowRoot = iconHost.shadowRoot;
                if (shadowRoot) {
                    // 注意：这里的选择器 #logo 需要根据实际情况确认
                    const targetButton = shadowRoot.querySelector('#logo');
                    if (targetButton) {
                        targetButton.click();
                        console.log('成功点击了 Shadow DOM 内的 #logo 元素。');
                    } else {
                        console.error('在 Shadow DOM 内未找到 id 为 "logo" 的元素。');
                    }
                } else {
                    console.error('无法访问 yd-mg-icon 的 Shadow DOM，它可能是封闭模式 (closed)。');
                }
            } else {
                console.error('未在页面上找到 <yd-mg-icon> 元素。');
            }
            // --- 核心逻辑结束 ---

        }
    });

})();