// ==UserScript==
// @name         控制台静默自动点击 (循环+自动停止版)
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  循环监听控制台输出，静默后自动点击。优先检查弹窗，处理加载状态和结束弹窗。
// @author       YourName
// @match        *://*/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. 样式定义 ---
    GM_addStyle(`
        #consoleAutoClicker {
            position: fixed;
            top: 15px;
            right: 15px;
            width: 320px;
            background-color: #2d3748;
            color: #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            z-index: 99999999;
            border: 1px solid #4a5568;
            transition: height 0.3s ease;
            overflow: hidden;
        }
        #consoleAutoClicker .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background-color: #1a202c;
            border-bottom: 1px solid #4a5568;
            cursor: move;
            user-select: none;
        }
        #consoleAutoClicker .header .title {
            font-size: 16px;
            font-weight: bold;
            color: #f7fafc;
        }
        #consoleAutoClicker .header .collapse-btn {
            background: none;
            border: none;
            color: #cbd5e0;
            font-size: 20px;
            line-height: 1;
            cursor: pointer;
            padding: 0 5px;
        }
        #consoleAutoClicker .header .collapse-btn:hover { color: #ffffff; }
        #consoleAutoClicker .status {
            font-size: 12px;
            padding: 3px 8px;
            border-radius: 12px;
            background-color: #4a5568;
            color: #cbd5e0;
            margin-left: 10px;
        }
        #consoleAutoClicker .status.running { background-color: #38a169; color: white; }
        #consoleAutoClicker .status.stopped { background-color: #718096; color: white; }
        #consoleAutoClicker .content { padding: 15px; transition: all 0.3s ease; }
        #consoleAutoClicker.collapsed .content { display: none; }

        #consoleAutoClicker .controls-wrapper {
            margin-bottom: 10px;
        }
        #consoleAutoClicker .controls {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }
        #consoleAutoClicker button {
            flex: 1;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        #consoleAutoClicker #startBtn { background-color: #48bb78; color: white; }
        #consoleAutoClicker #startBtn:hover { background-color: #38a169; }
        #consoleAutoClicker #stopBtn { background-color: #e53e3e; color: white; }
        #consoleAutoClicker #stopBtn:hover { background-color: #c53030; }

        #consoleAutoClicker .auto-stop-option {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: #cbd5e0;
        }
        #consoleAutoClicker .auto-stop-option input[type="checkbox"] {
            width: 14px;
            height: 14px;
            accent-color: #48bb78;
            cursor: pointer;
        }

        #consoleAutoClicker .logs {
            height: 180px;
            overflow-y: auto;
            background-color: #1a202c;
            border-radius: 4px;
            padding: 10px;
            font-size: 12px;
            line-height: 1.4;
        }
        #consoleAutoClicker .log-entry { margin-bottom: 4px; padding-left: 20px; position: relative; }
        #consoleAutoClicker .log-entry:before { content: "•"; position: absolute; left: 5px; color: #718096; }
        #consoleAutoClicker .log-entry.info { color: #a0aec0; }
        #consoleAutoClicker .log-entry.success { color: #48bb78; }
        #consoleAutoClicker .log-entry.warning { color: #ed8936; }
        #consoleAutoClicker .log-entry.error { color: #e53e3e; }
    `);

    // --- 2. 全局变量 ---
    let lastConsoleTime = Date.now();
    let checkTimer = null;
    let isRunning = false;
    let isProcessing = false; // 防止重复处理
    const consoleMethods = ['log', 'info', 'warn', 'error', 'debug', 'dir', 'table'];
    const originalMethods = {};

    // --- 3. UI 元素创建和管理 ---
    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'consoleAutoClicker';
        panel.innerHTML = `
            <div class="header" id="panelHeader">
                <div style="display: flex; align-items: center;">
                    <div class="title">控制台静默点击器</div>
                    <div id="statusDisplay" class="status stopped">已停止</div>
                </div>
                <button class="collapse-btn" id="collapseBtn">-</button>
            </div>
            <div class="content">
                <div class="controls-wrapper">
                    <div class="controls">
                        <button id="startBtn">开始监听</button>
                        <button id="stopBtn" disabled>停止监听</button>
                    </div>
                    <div class="auto-stop-option">
                        <input type="checkbox" id="autoStopCheckbox" checked>
                        <label for="autoStopCheckbox">检测到"没有更多数据"弹窗时自动停止</label>
                    </div>
                </div>
                <div id="logContainer" class="logs"></div>
            </div>
        `;
        document.body.appendChild(panel);

        document.getElementById('startBtn').addEventListener('click', startListening);
        document.getElementById('stopBtn').addEventListener('click', stopListening);
        document.getElementById('collapseBtn').addEventListener('click', toggleCollapse);
        initDragAndDrop();
    }

    function initDragAndDrop() {
        const panel = document.getElementById('consoleAutoClicker');
        const header = document.getElementById('panelHeader');
        let isDragging = false;
        let dragStartX, dragStartY, panelStartX, panelStartY;

        header.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            panelStartX = panel.offsetLeft;
            panelStartY = panel.offsetTop;
            document.body.style.cursor = 'move';
            panel.style.transition = 'none';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            const newLeft = panelStartX + dx;
            const newTop = panelStartY + dy;
            if (newLeft >= 0 && newTop >= 0 && newLeft + panel.offsetWidth <= window.innerWidth && newTop + panel.offsetHeight <= window.innerHeight) {
                panel.style.left = `${newLeft}px`;
                panel.style.top = `${newTop}px`;
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';
            }
        }

        function onMouseUp() {
            isDragging = false;
            document.body.style.cursor = '';
            panel.style.transition = 'height 0.3s ease';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }

    function toggleCollapse() {
        const panel = document.getElementById('consoleAutoClicker');
        const collapseBtn = document.getElementById('collapseBtn');
        panel.classList.toggle('collapsed');
        collapseBtn.textContent = panel.classList.contains('collapsed') ? '+' : '-';
    }

    function updateStatus(newStatus) {
        const statusEl = document.getElementById('statusDisplay');
        statusEl.textContent = newStatus;
        statusEl.className = 'status';
        statusEl.classList.add(newStatus === '运行中' ? 'running' : 'stopped');
    }

    function addLog(message, type = 'info') {
        const logContainer = document.getElementById('logContainer');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // --- 4. 弹窗和状态检测逻辑 ---

    // 检查"没有更多数据"弹窗
    function checkNoMoreDataPopup() {
        const popupContainer = document.querySelector('.n-modal.pop-container');
        if (!popupContainer) return false;

        const contentDiv = popupContainer.querySelector('.pop-content');
        if (contentDiv && contentDiv.textContent.includes('没有更多数据，是否退出?')) {
            return true;
        }

        return false;
    }

    // 检查加载弹窗是否可见
    function isLoadingPopupVisible() {
        const loadingPopup = document.querySelector('.workspace-loading.show-header');
        return loadingPopup && loadingPopup.style.display !== 'none';
    }

    // 处理"没有更多数据"弹窗
    function handleNoMoreDataPopup() {
        const popupContainer = document.querySelector('.n-modal.pop-container');
        if (popupContainer) {
            const confirmBtn = popupContainer.querySelector('.button.info');
            if (confirmBtn) {
                addLog('检测到"没有更多数据"弹窗，等待2秒后点击确认...', 'warning');
                setTimeout(() => {
                    confirmBtn.click();
                    addLog('已点击确认按钮退出页面', 'success');

                    // 如果启用了自动停止，则停止监听
                    const isAutoStopEnabled = document.getElementById('autoStopCheckbox').checked;
                    if (isAutoStopEnabled) {
                        addLog('弹窗已处理，自动停止监听', 'info');
                        stopListening();
                    }
                }, 2000);
                return true;
            }
        }
        return false;
    }

    // 处理加载状态
    function handleLoadingState() {
        if (isLoadingPopupVisible()) {
            addLog('检测到页面加载中，等待加载完成...', 'info');
            // 重置控制台时间，因为加载期间可能有控制台输出
            lastConsoleTime = Date.now();
            return true;
        }
        return false;
    }

    // --- 5. 核心逻辑 ---
    function startListening() {
        if (isRunning) return;

        // 重写 console 方法
        consoleMethods.forEach(method => {
            originalMethods[method] = console[method];
            console[method] = function(...args) {
                lastConsoleTime = Date.now();
                originalMethods[method].apply(console, args);
            };
        });

        lastConsoleTime = Date.now();
        isRunning = true;
        isProcessing = false;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        updateStatus('运行中');
        addLog('开始循环监听控制台输出...', 'info');

        // 启动循环定时器
        checkTimer = setInterval(() => {
            if (isProcessing) return; // 防止重复处理

            const now = Date.now();

            // 情况1: 优先检查"没有更多数据"弹窗
            if (checkNoMoreDataPopup()) {
                isProcessing = true;
                addLog('检测到结束弹窗，处理中...', 'warning');
                handleNoMoreDataPopup();
                return;
            }

            // 情况2: 检查加载弹窗
            if (handleLoadingState()) {
                return; // 页面正在加载，等待完成
            }

            // 情况3: 没有弹窗、没有加载、控制台静默 - 执行点击
            if (now - lastConsoleTime > silenceThreshold) {
                isProcessing = true;
                addLog('控制台静默且无弹窗/加载，执行点击...', 'success');
                const submitBtn = document.querySelector('.head-submit-button');
                if (submitBtn) {
                    submitBtn.click();
                    addLog('成功触发 .head-submit-button 点击！', 'success');

                    // 点击后重置状态，准备下一轮检查
                    setTimeout(() => {
                        lastConsoleTime = Date.now();
                        isProcessing = false;
                    }, 1000);
                } else {
                    addLog('未找到 .head-submit-button 元素！', 'error');
                    isProcessing = false;
                }
            }
        }, checkInterval);
    }

    function stopListening() {
        if (!isRunning) return;

        // 恢复原生 console 方法
        consoleMethods.forEach(method => {
            if (originalMethods[method]) {
                console[method] = originalMethods[method];
            }
        });

        // 清除定时器
        if (checkTimer) {
            clearInterval(checkTimer);
            checkTimer = null;
        }

        isRunning = false;
        isProcessing = false;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        updateStatus('已停止');
        addLog('循环监听已停止。', 'info');
    }

    // --- 6. 配置参数 ---
    const checkInterval = 1000;    // 检查频率（毫秒）
    const silenceThreshold = 2000; // 静默阈值（毫秒）

    // --- 7. 初始化 ---
    createPanel();
    addLog('脚本已加载。优先检查弹窗和加载状态，无干扰且控制台静默时才点击按钮。', 'info');

})();