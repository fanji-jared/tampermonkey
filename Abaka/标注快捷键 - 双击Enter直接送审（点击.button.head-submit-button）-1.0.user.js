// ==UserScript==
// @name         标注快捷键 - 双击Enter直接送审（点击.button.head-submit-button）
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  双击Enter键执行点击.button.head-submit-button元素
// @author       YourName
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 记录上一次Enter键按下的时间
    let lastEnterTime = 0;
    // 双击间隔时间（毫秒），可根据需要调整
    const doubleClickInterval = 300;

    // 监听键盘按下事件
    document.addEventListener('keydown', function(event) {
        // 检查是否按下的是Enter键
        if (event.key === 'Enter' || event.keyCode === 13) {
            const currentTime = Date.now();
            // 计算两次Enter键按下的时间差
            const timeDiff = currentTime - lastEnterTime;

            // 如果时间差在双击间隔内，则执行点击操作
            if (timeDiff > 0 && timeDiff <= doubleClickInterval) {
                // 查找页面上class为.right的元素
                const rightElement = document.querySelector('.button.head-submit-button');
                if (rightElement) {
                    // 触发元素的点击事件
                    rightElement.click();
                    console.log('已通过双击Enter点击.right元素');
                } else {
                    console.log('未找到class为.right的元素');
                }
                // 重置时间，防止连续触发
                lastEnterTime = 0;
            } else {
                // 第一次按下Enter键，记录时间
                lastEnterTime = currentTime;
            }

            // 可选：阻止Enter键的默认行为（如表单提交），根据需要开启
            // event.preventDefault();
        }
    });
})();