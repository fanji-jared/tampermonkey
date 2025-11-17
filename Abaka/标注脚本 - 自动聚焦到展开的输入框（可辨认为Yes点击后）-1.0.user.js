// ==UserScript==
// @name         标注脚本 - 自动聚焦到展开的输入框（可辨认为Yes点击后）
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  点击Yes按钮后自动聚焦到展开的输入框
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 监听点击事件
    document.addEventListener('click', function(event) {
        // 检查点击的是否是"Yes"按钮
        const target = event.target;
        if (target.classList.contains('option-answer') &&
            target.textContent.includes('Yes') &&
            !target.classList.contains('selected')) {

            console.log('Yes按钮被点击，等待输入框展开...');

            // 等待一段时间让DOM更新（展开动画完成）
            setTimeout(() => {
                focusOnTextarea();
            }, 500); // 根据实际动画时间调整，通常500ms足够
        }
    });

    function focusOnTextarea() {
        // 查找展开的textarea输入框
        const textarea = document.querySelector('.n-input__textarea-el');

        if (textarea) {
            textarea.focus();
            console.log('焦点已设置到输入框');

            // 可选：选中输入框中的所有文本
            textarea.select();
        } else {
            console.log('未找到输入框，重试中...');
            // 如果没找到，再等待一下重试（有些情况下展开可能较慢）
            setTimeout(() => {
                const retryTextarea = document.querySelector('.n-input__textarea-el');
                if (retryTextarea) {
                    retryTextarea.focus();
                    retryTextarea.select();
                    console.log('重试成功：焦点已设置到输入框');
                }
            }, 300);
        }
    }

    // 备选方案：使用MutationObserver监听DOM变化
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    // 检查新添加的节点是否包含textarea
                    if (node.nodeType === 1 && node.querySelector) {
                        const textarea = node.querySelector('.n-input__textarea-el');
                        if (textarea && document.activeElement !== textarea) {
                            setTimeout(() => {
                                textarea.focus();
                                textarea.select();
                                console.log('通过MutationObserver设置焦点');
                            }, 100);
                        }
                    }
                });
            }
        });
    });

    // 开始观察
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('自动聚焦脚本已加载');
})();