// ==UserScript==
// @name         RZLowCode开发工具箱
// @namespace    http://tampermonkey.net/
// @version      0.5.0
// @description  为RZ低代码平台添加一个开发工具箱，首个功能为"字段列宽计算"。
// @author       FanJi
// @match        *://*.ronzhi.cn/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @downloadURL  https://github.com/fanji-jared/tampermonkey/RZLowCode/RZLowCode开发工具箱-0.5.0.user.js
// @updateURL    https://github.com/fanji-jared/tampermonkey/RZLowCode/RZLowCode开发工具箱-0.5.0.user.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // --- 样式注入 ---
    GM_addStyle(`
        .dev-toolbox-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647; /* 确保在最顶层 */
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            cursor: move;
        }

        .dev-toolbox-toggle-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #1e7ba7;
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .dev-toolbox-toggle-btn:hover {
            background: #13445b;
            transform: scale(1.1);
        }

        .dev-toolbox-panel {
            position: absolute;
            top: 60px;
            right: 0;
            width: 500px;
            max-height: 80vh;
            background: #fff;
            border: 1px solid #e4e7ed;
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            display: none;
            flex-direction: column;
            overflow: hidden;
        }

        .dev-toolbox-panel.is-active {
            display: flex;
        }

        .dev-toolbox-header {
            padding: 15px 20px;
            background: #f5f7fa;
            border-bottom: 1px solid #e4e7ed;
            cursor: move;
            user-select: none;
            font-weight: bold;
            color: #303133;
        }

        .dev-toolbox-body {
            padding: 20px;
            overflow-y: auto;
            flex-grow: 1;
        }

        .dev-toolbox-footer {
            padding: 10px 20px;
            border-top: 1px solid #e4e7ed;
            text-align: right;
        }

        .field-width-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
        }

        .field-width-item .field-name {
            flex: 0 0 100px;
            font-size: 14px;
            color: #606266;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .field-width-item .width-control {
            display: flex;
            align-items: center;
            flex-grow: 1;
        }

        .field-width-item .width-btn {
            width: 28px;
            height: 28px;
            border: 1px solid #dcdfe6;
            background: #fff;
            color: #606266;
            cursor: pointer;
            font-size: 16px;
            line-height: 26px;
            text-align: center;
            transition: all 0.2s;
        }

        .field-width-item .width-btn:hover {
            color: #409EFF;
            border-color: #c6e2ff;
            background: #ecf5ff;
        }

        .field-width-item .width-input {
            margin: 0 8px;
            width: 80px;
            padding: 5px 8px;
            border: 1px solid #dcdfe6;
            border-radius: 4px;
            text-align: center;
            font-size: 14px;
        }

        .action-button {
            padding: 8px 20px;
            border: 1px solid #dcdfe6;
            border-radius: 4px;
            background: #fff;
            color: #606266;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }

        .action-button.primary {
            background: #409EFF;
            color: white;
            border-color: #409EFF;
        }

        .action-button.primary:hover {
            background: #66b1ff;
        }

        .action-button.success {
            background: #67c23a;
            color: white;
            border-color: #67c23a;
        }

        .action-button.success:hover {
            background: #85ce61;
        }

        .divider {
            margin: 20px 0;
            border-top: 1px dashed #e4e7ed;
        }

        .result-group {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
        }

        .result-group label {
            flex: 0 0 80px;
            font-size: 14px;
            color: #606266;
        }

        .result-group input {
            flex-grow: 1;
            padding: 8px 10px;
            border: 1px solid #dcdfe6;
            border-radius: 4px;
            font-size: 14px;
            background-color: #f5f7fa;
        }

        .button-group {
            display: flex;
            gap: 10px;
        }

        .table-selection-item {
            padding: 12px;
            margin: 8px 0;
            border: 1px solid #e4e7ed;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .table-selection-item:hover {
            border-color: #409EFF;
            background-color: #f0f7ff;
        }

        .table-selection-item.selected {
            border-color: #409EFF;
            background-color: #ecf5ff;
        }

        .table-info {
            font-size: 12px;
            color: #909399;
            margin-top: 4px;
        }

        .back-button {
            margin-bottom: 15px;
            background: #909399;
            color: white;
        }

        .back-button:hover {
            background: #a6a9ad;
        }

        .table-highlight {
            border: 3px solid #f56c6c !important;
            transition: border-color 0.3s ease;
        }

        .cell-highlight {
            border: 2px solid #f56c6c !important;
            transition: border-color 0.3s ease;
        }

        .scan-section {
            margin-bottom: 20px;
        }

        .tables-list {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #e4e7ed;
            border-radius: 4px;
            padding: 10px;
        }

        .no-tables {
            text-align: center;
            color: #909399;
            padding: 20px;
        }

        .select-table-btn {
            margin-top: 8px;
            padding: 4px 12px;
            font-size: 12px;
        }

        .status-message {
            padding: 8px 12px;
            margin: 10px 0;
            border-radius: 4px;
            font-size: 14px;
            text-align: center;
        }

        .status-success {
            background-color: #f0f9ff;
            color: #409EFF;
            border: 1px solid #c6e2ff;
        }
    `);

    // --- 工具箱核心逻辑 ---
    class DevToolbox {
        constructor() {
            this.fields = [];
            this.actionColumnWidth = 260; // 操作列默认宽度
            this.selectedTable = null;
            this.highlightedTable = null; // 当前高亮的表格
            this.init();
        }

        init() {
            this.createUI();
            this.bindEvents();
            this.showInitialUI();

            // 从localStorage恢复位置
            this.restorePosition();
        }

        createUI() {
            // 主容器
            this.container = document.createElement('div');
            this.container.className = 'dev-toolbox-container';

            // 切换按钮
            this.toggleBtn = document.createElement('button');
            this.toggleBtn.className = 'dev-toolbox-toggle-btn';
            this.toggleBtn.innerHTML = '🔧';
            this.toggleBtn.title = '开发工具箱 - 拖动移动位置';

            // 面板
            this.panel = document.createElement('div');
            this.panel.className = 'dev-toolbox-panel';

            // 面板头部
            this.header = document.createElement('div');
            this.header.className = 'dev-toolbox-header';
            this.header.innerHTML = '字段列宽计算';

            // 面板主体
            this.body = document.createElement('div');
            this.body.className = 'dev-toolbox-body';

            // 面板底部
            this.footer = document.createElement('div');
            this.footer.className = 'dev-toolbox-footer';

            this.panel.appendChild(this.header);
            this.panel.appendChild(this.body);
            this.panel.appendChild(this.footer);
            this.container.appendChild(this.toggleBtn);
            this.container.appendChild(this.panel);

            document.body.appendChild(this.container);
        }

        bindEvents() {
            // 切换面板显示/隐藏
            this.toggleBtn.addEventListener('click', (e) => {
                // 防止拖动时触发点击事件
                if (!this.isDragging) {
                    this.panel.classList.toggle('is-active');
                }
            });

            // 拖拽功能 - 整个容器可拖动
            this.isDragging = false;
            this.currentX;
            this.currentY;
            this.initialX;
            this.initialY;
            this.xOffset = 0;
            this.yOffset = 0;

            // 圆形按钮和面板头部都可以触发拖拽
            this.toggleBtn.addEventListener('mousedown', (e) => this.dragStart(e));
            this.header.addEventListener('mousedown', (e) => this.dragStart(e));
            document.addEventListener('mousemove', (e) => this.drag(e));
            document.addEventListener('mouseup', () => this.dragEnd());
        }

        dragStart(e) {
            this.initialX = e.clientX - this.xOffset;
            this.initialY = e.clientY - this.yOffset;

            if (e.target === this.toggleBtn || e.target === this.header ||
                e.target.parentElement === this.header) {
                this.isDragging = true;

                // 添加拖动时的视觉反馈
                this.container.style.opacity = '0.8';
                this.toggleBtn.style.transform = 'scale(1.1)';
            }
        }

        drag(e) {
            if (this.isDragging) {
                e.preventDefault();
                this.currentX = e.clientX - this.initialX;
                this.currentY = e.clientY - this.initialY;

                this.xOffset = this.currentX;
                this.yOffset = this.currentY;

                // 移动整个容器
                this.container.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
            }
        }

        dragEnd() {
            if (this.isDragging) {
                this.initialX = this.currentX;
                this.initialY = this.currentY;
                this.isDragging = false;

                // 恢复视觉样式
                this.container.style.opacity = '1';
                this.toggleBtn.style.transform = '';

                // 保存位置到localStorage
                this.savePosition();
            }
        }

        // 保存位置到localStorage
        savePosition() {
            const rect = this.container.getBoundingClientRect();
            const position = {
                x: rect.left,
                y: rect.top
            };
            localStorage.setItem('devToolboxPosition', JSON.stringify(position));
        }

        // 从localStorage恢复位置
        restorePosition() {
            const savedPosition = localStorage.getItem('devToolboxPosition');
            if (savedPosition) {
                try {
                    const position = JSON.parse(savedPosition);
                    this.container.style.left = `${position.x}px`;
                    this.container.style.top = `${position.y}px`;
                    this.container.style.right = 'auto'; // 取消right定位
                } catch (e) {
                    console.error('恢复工具箱位置失败:', e);
                }
            }
        }

        // --- 初始界面 ---
        showInitialUI() {
            this.body.innerHTML = `
                <div class="scan-section">
                    <h4 style="margin-bottom: 15px;">表格扫描</h4>
                    <p style="color: #606266; margin-bottom: 15px;">点击下方按钮扫描页面中的表格</p>
                    <button class="action-button primary" id="scan-tables-btn" style="width: 100%;">扫描表格</button>
                </div>
                <div class="tables-list" id="tables-list">
                    <div class="no-tables">请先点击扫描表格按钮</div>
                </div>
            `;

            this.footer.innerHTML = '';

            // 绑定扫描按钮事件
            document.getElementById('scan-tables-btn').addEventListener('click', () => {
                this.scanTables();
            });
        }

        // --- 表格扫描功能 ---
        scanTables() {
            const tablesList = document.getElementById('tables-list');
            tablesList.innerHTML = '<div style="text-align: center; padding: 20px; color: #909399;">扫描中...</div>';

            // 使用 setTimeout 确保 DOM 已经完全加载
            setTimeout(() => {
                const tables = this.findAllTables();

                if (tables.length === 0) {
                    tablesList.innerHTML = '<div class="no-tables">未找到任何表格元素</div>';
                    return;
                }

                let tablesHtml = '<h5 style="margin-bottom: 10px;">找到的表格：</h5>';

                tables.forEach((table, index) => {
                    const tableInfo = this.getTableInfo(table);
                    tablesHtml += `
                        <div class="table-selection-item" data-index="${index}">
                            <div><strong>表格 ${index + 1}</strong></div>
                            <div class="table-info">
                                ${tableInfo}
                            </div>
                            <button class="action-button select-table-btn" data-index="${index}">选择此表格</button>
                        </div>
                    `;
                });

                tablesList.innerHTML = tablesHtml;

                // 绑定表格选择事件
                tablesList.querySelectorAll('.select-table-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const index = parseInt(btn.dataset.index);
                        this.selectTable(tables[index]);
                    });
                });

                // 绑定整个表格项的点击事件
                tablesList.querySelectorAll('.table-selection-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        // 防止重复触发
                        if (e.target.classList.contains('select-table-btn')) return;
                        const index = parseInt(item.dataset.index);
                        this.selectTable(tables[index]);
                    });

                    // 添加hover高亮效果
                    item.addEventListener('mouseenter', (e) => {
                        const index = parseInt(item.dataset.index);
                        this.highlightTable(tables[index]);
                    });

                    item.addEventListener('mouseleave', (e) => {
                        this.removeTableHighlight();
                    });
                });
            }, 100);
        }

        // 高亮表格
        highlightTable(table) {
            // 移除之前的高亮
            this.removeTableHighlight();

            // 添加新高亮
            table.classList.add('table-highlight');
            this.highlightedTable = table;
        }

        // 移除表格高亮
        removeTableHighlight() {
            if (this.highlightedTable) {
                this.highlightedTable.classList.remove('table-highlight');
                this.highlightedTable = null;
            }
        }

        findAllTables() {
            // 查找页面中的所有table元素
            return Array.from(document.querySelectorAll('table')).filter(table => {
                // 过滤掉隐藏的表格
                const style = window.getComputedStyle(table);
                return style.display !== 'none' &&
                       table.offsetWidth > 0 &&
                       table.offsetHeight > 0;
            });
        }

        getTableInfo(table) {
            let info = [];

            // 获取表格的类名
            if (table.className) {
                info.push(`类: ${table.className.split(' ')[0]}`);
            }

            // 获取表格的ID
            if (table.id) {
                info.push(`ID: ${table.id}`);
            }

            // 获取表格行列信息
            const rows = table.querySelectorAll('tr');
            const ths = table.querySelectorAll('th');
            const tds = table.querySelectorAll('td');

            if (rows.length > 0) {
                info.push(`行: ${rows.length}`);
            }

            if (ths.length > 0) {
                info.push(`表头: ${ths.length}`);
            }

            return info.join(' | ');
        }

        selectTable(table) {
            this.selectedTable = table;

            // 移除hover高亮
            this.removeTableHighlight();

            // 高亮显示选中的表格5秒
            table.classList.add('table-highlight');
            setTimeout(() => {
                table.classList.remove('table-highlight');
            }, 5000);

            // 扫描选中的表格
            this.scanSelectedTable();
        }

        // --- 扫描选中的表格 ---
        scanSelectedTable() {
            if (!this.selectedTable) {
                alert('错误：未选择表格');
                return;
            }

            // 显示扫描中状态
            this.body.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div>正在扫描表格...</div>
                </div>
            `;

            // 使用 setTimeout 确保表格完全加载
            setTimeout(() => {
                if (this.scanTable()) {
                    this.renderColumnWidthUI();
                } else {
                    this.body.innerHTML = `
                        <button class="action-button back-button">← 返回扫描页面</button>
                        <p style="color: red; text-align: center;">扫描失败，请确认选中的表格结构正确。</p>
                    `;
                    this.bindBackButton();
                }
            }, 200);
        }

        // --- 核心功能函数 ---

        /**
         * 计算操作列宽度 - 计算最小宽度以避免文本换行
         */
        calculateActionColumnWidth() {
            if (!this.selectedTable) return 260;

            try {
                // 查找操作列的第一个td
                const actionTd = this.selectedTable.querySelector('tbody td:last-child');
                if (!actionTd) return 260;

                // 获取操作列td内的所有按钮
                const buttons = actionTd.querySelectorAll('button');
                if (buttons.length === 0) return 260;

                let totalWidth = 0;

                // 计算所有按钮的最小宽度
                buttons.forEach(button => {
                    // 创建一个临时span来测量按钮文本的最小宽度
                    const tempSpan = document.createElement('span');
                    tempSpan.style.position = 'absolute';
                    tempSpan.style.left = '-9999px';
                    tempSpan.style.top = '-9999px';
                    tempSpan.style.whiteSpace = 'nowrap';
                    tempSpan.style.fontSize = window.getComputedStyle(button).fontSize;
                    tempSpan.style.fontFamily = window.getComputedStyle(button).fontFamily;
                    tempSpan.style.fontWeight = window.getComputedStyle(button).fontWeight;

                    // 获取按钮文本内容
                    const buttonText = button.textContent.trim();
                    tempSpan.textContent = buttonText;

                    document.body.appendChild(tempSpan);
                    const textWidth = tempSpan.offsetWidth;
                    document.body.removeChild(tempSpan);

                    // 按钮最小宽度 = 文本宽度 + 内边距 + 边框
                    const padding = parseInt(window.getComputedStyle(button).paddingLeft) +
                                   parseInt(window.getComputedStyle(button).paddingRight);
                    const border = parseInt(window.getComputedStyle(button).borderLeftWidth) +
                                  parseInt(window.getComputedStyle(button).borderRightWidth);

                    const buttonMinWidth = textWidth + padding + border + 10; // 额外10px作为安全边距
                    totalWidth += buttonMinWidth;
                });

                // 添加按钮之间的间距
                const buttonSpacing = (buttons.length - 1) * 8;
                totalWidth += buttonSpacing;

                // 添加单元格的内边距
                const cellPadding = parseInt(window.getComputedStyle(actionTd).paddingLeft) +
                                   parseInt(window.getComputedStyle(actionTd).paddingRight);
                totalWidth += cellPadding;

                return Math.max(totalWidth, 260); // 最小260px
            } catch (error) {
                console.error('计算操作列宽度时出错:', error);
                return 260;
            }
        }

        /**
         * 扫描页面表格，提取字段并计算宽度
         */
        scanTable() {
            if (!this.selectedTable) {
                return false;
            }

            const headerRow = this.selectedTable.querySelector('thead tr');
            if (!headerRow) {
                return false;
            }

            this.fields = [];
            const thElements = headerRow.querySelectorAll('th');

            // 计算操作列宽度
            this.actionColumnWidth = this.calculateActionColumnWidth();

            // 遍历 th，跳过第一个（选择框）和最后一个（操作列）
            for (let i = 1; i < thElements.length - 1; i++) {
                const th = thElements[i];
                const cell = th.querySelector('.cell');
                if (!cell) continue;

                // 提取文本，并移除排序图标等子元素的文本
                const textNode = Array.from(cell.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                const fieldName = textNode ? textNode.textContent.trim() : cell.textContent.trim();

                if (fieldName) {
                    // 计算公式：字数 * 14 + 24 + 12 * 2
                    const calculatedWidth = fieldName.length * 14 + 48;
                    this.fields.push({
                        name: fieldName,
                        width: calculatedWidth,
                        thElement: th // 保存元素引用，用于后续设置样式
                    });
                }
            }

            // 处理操作列
            const actionTh = thElements[thElements.length - 1];
            if (actionTh) {
                this.actionColumnThElement = actionTh;
            }

            return this.fields.length > 0;
        }

        /**
         * 渲染列宽计算UI界面
         */
        renderColumnWidthUI() {
            let fieldsHtml = '';
            this.fields.forEach((field, index) => {
                fieldsHtml += `
                    <div class="field-width-item" data-index="${index}">
                        <span class="field-name" title="${field.name}">${field.name}：</span>
                        <div class="width-control">
                            <button class="width-btn minus">-</button>
                            <input type="text" class="width-input" value="${field.width}" data-index="${index}">
                            <button class="width-btn plus">+</button>
                        </div>
                    </div>
                `;
            });

            // 操作列宽度控制
            fieldsHtml += `
                <div class="divider"></div>
                <div class="field-width-item">
                    <span class="field-name">操作列：</span>
                    <div class="width-control">
                        <button class="width-btn minus-action">-</button>
                        <input type="text" class="width-input" id="action-width-input" value="${this.actionColumnWidth}">
                        <button class="width-btn plus-action">+</button>
                    </div>
                </div>
            `;

            this.body.innerHTML = `
                <button class="action-button back-button">← 返回扫描页面</button>
                <h4 style="margin-bottom: 15px;">字段列宽调整</h4>
                ${fieldsHtml}
                <div class="divider"></div>
                <button class="action-button primary" id="apply-widths-btn" style="width: 100%;">应用修改</button>
                <div class="divider"></div>
                <div class="result-group">
                    <label>字段列宽：</label>
                    <input type="text" id="result-string" readonly placeholder="点击下方按钮生成">
                </div>
                <div class="button-group">
                    <button class="action-button success" id="generate-string-btn">生成字符</button>
                    <button class="action-button" id="copy-string-btn">复制</button>
                </div>
                <div id="status-message"></div>
            `;

            this.bindUIEvents();
            this.bindBackButton();
        }

        bindBackButton() {
            const backButton = this.body.querySelector('.back-button');
            if (backButton) {
                backButton.addEventListener('click', () => {
                    this.showInitialUI();
                });
            }
        }

        /**
         * 绑定UI内部元素的事件
         */
        bindUIEvents() {
            // +/- 按钮事件
            this.body.addEventListener('click', (e) => {
                if (e.target.classList.contains('minus') || e.target.classList.contains('plus')) {
                    const isPlus = e.target.classList.contains('plus');
                    const input = e.target.parentElement.querySelector('.width-input');
                    let value = parseInt(input.value) || 0;
                    input.value = isPlus ? value + 10 : Math.max(0, value - 10);
                }
                if (e.target.classList.contains('minus-action') || e.target.classList.contains('plus-action')) {
                    const isPlus = e.target.classList.contains('plus-action');
                    const input = document.getElementById('action-width-input');
                    let value = parseInt(input.value) || 0;
                    input.value = isPlus ? value + 10 : Math.max(0, value - 10);
                }
            });

            // 应用修改按钮
            document.getElementById('apply-widths-btn').addEventListener('click', () => {
                this.applyWidths();
            });

            // 生成字符按钮
            document.getElementById('generate-string-btn').addEventListener('click', () => {
                this.generateString();
            });

            // 复制按钮
            document.getElementById('copy-string-btn').addEventListener('click', () => {
                const resultInput = document.getElementById('result-string');
                if (resultInput.value) {
                    GM_setClipboard(resultInput.value);
                    const copyBtn = document.getElementById('copy-string-btn');
                    const originalText = copyBtn.innerText;
                    copyBtn.innerText = '已复制!';
                    copyBtn.classList.add('success');
                    setTimeout(() => {
                        copyBtn.innerText = originalText;
                        copyBtn.classList.remove('success');
                    }, 2000);
                } else {
                    this.showStatusMessage('没有可复制的内容，请先生成字符串。', false);
                }
            });
        }

        /**
         * 显示状态消息
         */
        showStatusMessage(message, isSuccess = true) {
            const statusDiv = document.getElementById('status-message');
            statusDiv.innerHTML = `
                <div class="status-message ${isSuccess ? 'status-success' : ''}">
                    ${message}
                </div>
            `;

            // 5秒后自动清除消息
            setTimeout(() => {
                statusDiv.innerHTML = '';
            }, 5000);
        }

        /**
         * 应用修改，将输入框的值设置到表格的cell上
         */
        applyWidths() {
            const statusDiv = document.getElementById('status-message');
            statusDiv.innerHTML = '';

            const inputs = this.body.querySelectorAll('.width-input:not(#action-width-input)');
            let modifiedCells = [];

            inputs.forEach(input => {
                const index = parseInt(input.dataset.index);
                const width = input.value;
                if (this.fields[index] && this.fields[index].thElement) {
                    const cell = this.fields[index].thElement.querySelector('.cell');
                    cell.style.width = `${width}px`;
                    modifiedCells.push(cell);
                }
            });

            // 应用操作列宽度
            const actionWidthInput = document.getElementById('action-width-input');
            if (this.actionColumnThElement) {
                const actionCell = this.actionColumnThElement.querySelector('.cell');
                actionCell.style.width = `${actionWidthInput.value}px`;
                modifiedCells.push(actionCell);
            }

            // 为修改的单元格添加红色边框提示
            modifiedCells.forEach(cell => {
                cell.classList.add('cell-highlight');
            });

            // 显示成功消息
            this.showStatusMessage('宽度已成功应用到表格！修改的单元格已用红色边框标记。');

            // 5秒后移除红色边框
            setTimeout(() => {
                modifiedCells.forEach(cell => {
                    cell.classList.remove('cell-highlight');
                });
            }, 5000);
        }

        /**
         * 生成平台所需的字符串
         */
        generateString() {
            const inputs = this.body.querySelectorAll('.width-input:not(#action-width-input)');
            const widths = Array.from(inputs).map(input => input.value);
            const actionWidth = document.getElementById('action-width-input').value;

            // 平台拼接规则：列数$宽度1#宽度2#...#宽度N%操作列宽度
            // 这里的"列数"指的是数据列的数量
            const resultString = `${widths.length}$${widths.join('#')}%${actionWidth}`;

            document.getElementById('result-string').value = resultString;
            this.showStatusMessage('字符串已生成，可点击复制按钮进行复制。');
        }
    }

    // --- 启动工具箱 ---
    // 等待页面加载完成后执行
    let toolbox;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            toolbox = new DevToolbox();
        });
    } else {
        toolbox = new DevToolbox();
    }

})();