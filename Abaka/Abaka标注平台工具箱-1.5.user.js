// ==UserScript==
// @name         Abaka标注平台工具箱
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Abaka标注平台多功能工具箱 - 支持拖拽分类和双击重命名
// @author       You
// @match        https://app.abaka.ai/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_download
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 工具箱配置
    const TOOLBOX_CONFIG = {
        name: 'Abaka标注平台工具箱',
        version: '1.5',
        categories: [
            {
                id: 'default',
                name: '默认分类',
                tools: ['autoFocus', 'shortcutSubmit', 'translationShortcut', 'autoClick']
            }
        ],
        tools: [
            {
                id: 'autoFocus',
                name: '自动聚焦输入框',
                description: '点击Yes按钮后自动聚焦到展开的输入框',
                enabled: true,
                version: '1.0',
                hasSettings: false
            },
            {
                id: 'shortcutSubmit',
                name: 'Enter送审快捷键',
                description: '双击Enter键直接送审',
                enabled: true,
                version: '1.0',
                hasSettings: false
            },
            {
                id: 'translationShortcut',
                name: '有道灵动-翻译快捷键',
                description: "输入框里按`键触发翻译<a href='https://magicfanyi.youdao.com/#/' target='_blank' style='color: blue;'>点击安装插件</a>",
                enabled: true,
                version: '1.0',
                hasSettings: false
            },
            {
                id: 'autoClick',
                name: '控制台静默自动点击',
                description: '控制台静默后自动点击送审按钮',
                enabled: true,
                version: '1.6',
                hasSettings: true
            }
        ]
    };

    // 工具箱状态
    let currentToolView = null;
    let isDragging = false;
    let dragStartX, dragStartY, panelStartX, panelStartY;
    let draggedToolItem = null;
    let categories = [];
    let toolCategories = {};
    let categoryCounter = 1;

    // 初始化数据
    function initData() {
        // 加载分类数据
        const savedCategories = GM_getValue('abaka-categories', TOOLBOX_CONFIG.categories);
        categories = savedCategories;

        // 加载工具分类映射
        const savedToolCategories = GM_getValue('abaka-tool-categories', {});
        toolCategories = savedToolCategories;

        // 初始化未分类的工具
        TOOLBOX_CONFIG.tools.forEach(tool => {
            if (!toolCategories[tool.id]) {
                toolCategories[tool.id] = 'default';
            }
        });

        // 计算分类计数器
        categoryCounter = Math.max(1, ...categories.map(cat => {
            const match = cat.name.match(/^新分类(\d+)$/);
            return match ? parseInt(match[1]) : 0;
        })) + 1;
    }

    // 保存数据
    function saveData() {
        GM_setValue('abaka-categories', categories);
        GM_setValue('abaka-tool-categories', toolCategories);
    }

    // 生成不重复的分类名称
    function generateCategoryName() {
        let name = `新分类${categoryCounter}`;
        while (categories.some(cat => cat.name === name)) {
            categoryCounter++;
            name = `新分类${categoryCounter}`;
        }
        categoryCounter++;
        return name;
    }

    // 工具箱UI
    function createToolboxUI() {
        // 检查是否已存在工具箱
        if (document.getElementById('abaka-toolbox')) {
            return;
        }

        initData();

        const toolbox = document.createElement('div');
        toolbox.id = 'abaka-toolbox';
        toolbox.classList.add('collapsed'); // 默认折叠
        toolbox.innerHTML = `
            <div class="abaka-toolbox-header" id="abakaToolboxHeader">
                <div class="abaka-toolbox-title">
                    <span id="abakaToolboxMainTitle">${TOOLBOX_CONFIG.name}</span>
                    <span class="abaka-toolbox-version">v${TOOLBOX_CONFIG.version}</span>
                </div>
                <div class="abaka-toolbox-controls">
                    <button id="abaka-toolbox-settings" class="abaka-toolbox-btn" title="设置">⚙️</button>
                    <button id="abaka-toolbox-back" class="abaka-toolbox-btn" style="display: none;">←</button>
                    <button id="abaka-toolbox-toggle" class="abaka-toolbox-btn">+</button>
                    <button id="abaka-toolbox-close" class="abaka-toolbox-btn">×</button>
                </div>
            </div>
            <div class="abaka-toolbox-body">
                <!-- 主工具列表视图 -->
                <div class="abaka-tool-view" id="abakaMainView">
                    <div class="abaka-toolbox-categories abaka-hideScrollbar" id="abakaToolboxCategories">
                        <!-- 分类将通过JavaScript动态生成 -->
                    </div>
                    <div class="abaka-toolbox-footer">
                        <div class="abaka-toolbox-logs">
                            <div class="abaka-logs-header">操作日志</div>
                            <div class="abaka-logs-content abaka-hideScrollbar" id="abaka-toolbox-logs"></div>
                        </div>
                    </div>
                </div>

                <!-- 控制台静默点击器设置视图 -->
                <div class="abaka-tool-view" id="abakaAutoClickerView" style="display: none;">
                    <div class="abaka-tool-settings-header">
                        <h3>设置</h3>
                    </div>
                    <div class="abaka-tool-settings-content">
                        <div class="abaka-settings-controls">
                            <div class="abaka-controls-wrapper">
                                <div class="abaka-controls">
                                    <button id="abaka-autoClickerStartBtn">开始监听</button>
                                    <button id="abaka-autoClickerStopBtn" disabled>停止监听</button>
                                </div>
                                <div class="abaka-auto-stop-option">
                                    <input type="checkbox" id="abaka-autoStopCheckbox" checked>
                                    <label for="abaka-autoStopCheckbox">检测到"没有更多数据"弹窗时自动停止</label>
                                </div>
                            </div>
                        </div>
                        <div class="abaka-settings-status">
                            <div class="abaka-status-display">
                                状态: <span id="abaka-autoClickerStatus" class="abaka-status abaka-stopped">已停止</span>
                            </div>
                        </div>
                        <div class="abaka-settings-logs">
                            <div class="abaka-logs-header">自动点击器日志</div>
                            <div class="abaka-logs-content" id="abaka-autoClickerLogs"></div>
                        </div>
                    </div>
                </div>

                <!-- 工具箱设置视图 -->
                <div class="abaka-tool-view" id="abakaToolboxSettingsView" style="display: none;">
                    <div class="abaka-tool-settings-header">
                        <h3>设置</h3>
                    </div>
                    <div class="abaka-tool-settings-content">
                        <div class="abaka-settings-section">
                            <h4>数据管理</h4>
                            <div class="abaka-data-management">
                                <button id="abaka-export-settings">导出设置</button>
                                <button id="abaka-import-settings">导入设置</button>
                                <input type="file" id="abaka-import-file" accept=".json" style="display: none;">
                                <button id="abaka-reset-settings" class="abaka-danger">重置设置</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(toolbox);

        // 设置初始位置 - 顶部居中，top为0px
        const toolboxWidth = 420;
        const viewportWidth = window.innerWidth;
        const initialLeft = (viewportWidth - toolboxWidth) / 2;
        toolbox.style.left = `${initialLeft}px`;
        toolbox.style.top = '0px';

        setupToolboxEvents();
        initDragAndDrop();
        loadToolStates();
        renderCategories();

        // 注册菜单命令
        GM_registerMenuCommand('打开工具箱设置', function() {
            document.getElementById('abaka-toolbox').classList.remove('collapsed');
            document.getElementById('abaka-toolbox-toggle').textContent = '−';
            showToolboxSettings();
        });
    }

    // 渲染分类视图
    function renderCategories() {
        const categoriesContainer = document.getElementById('abakaToolboxCategories');
        categoriesContainer.innerHTML = '';

        // 先渲染默认分类
        const defaultCategory = categories.find(cat => cat.id === 'default');
        if (defaultCategory) {
            renderCategory(defaultCategory, categoriesContainer);
        }

        // 渲染其他分类
        categories.filter(cat => cat.id !== 'default').forEach(category => {
            renderCategory(category, categoriesContainer);
        });

        // 重新绑定工具事件
        setupToolEvents();
    }

    // 渲染单个分类
    function renderCategory(category, container) {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'abaka-category';
        categoryElement.dataset.categoryId = category.id;

        const categoryTools = TOOLBOX_CONFIG.tools.filter(tool =>
            toolCategories[tool.id] === category.id
        );

        if (categoryTools.length === 0 && category.id !== 'default') {
            // 空分类不显示
            return;
        }

        categoryElement.innerHTML = `
            <div class="abaka-category-header">
                <div class="abaka-category-name" data-category-id="${category.id}">${category.name}</div>
                <div class="abaka-category-controls">
                    <button class="abaka-category-toggle">−</button>
                    ${category.id !== 'default' ? '<button class="abaka-category-delete" title="删除分类">×</button>' : ''}
                </div>
            </div>
            <div class="abaka-category-tools">
                ${categoryTools.map(tool => `
                    <div class="abaka-tool-item" data-tool-id="${tool.id}" draggable="true">
                        <div class="abaka-tool-header">
                            <label class="abaka-tool-toggle">
                                <input type="checkbox" ${tool.enabled ? 'checked' : ''} id="abaka-toggle-${tool.id}">
                                <span class="abaka-slider"></span>
                            </label>
                            <div class="abaka-tool-info">
                                <div class="abaka-tool-name">${tool.name}</div>
                                <div class="abaka-tool-desc">${tool.description}</div>
                            </div>
                            <div class="abaka-tool-version">v${tool.version}</div>
                        </div>
                        <div class="abaka-tool-status" id="abaka-status-${tool.id}">${tool.enabled ? '已启用' : '已禁用'}</div>
                        ${tool.hasSettings ? '<div class="abaka-tool-settings-btn">⚙️</div>' : ''}
                    </div>
                `).join('')}
            </div>
        `;

        container.appendChild(categoryElement);

        // 设置分类折叠事件
        const toggleBtn = categoryElement.querySelector('.abaka-category-toggle');
        const categoryToolsEl = categoryElement.querySelector('.abaka-category-tools');

        // 检查是否已折叠
        const isCollapsed = GM_getValue(`abaka-category-${category.id}-collapsed`, false);
        if (isCollapsed) {
            categoryToolsEl.style.display = 'none';
            toggleBtn.textContent = '+';
        }

        toggleBtn.addEventListener('click', function() {
            const isCollapsed = categoryToolsEl.style.display === 'none';
            categoryToolsEl.style.display = isCollapsed ? 'block' : 'none';
            toggleBtn.textContent = isCollapsed ? '−' : '+';
            GM_setValue(`abaka-category-${category.id}-collapsed`, !isCollapsed);
        });

        // 设置分类删除事件
        const deleteBtn = categoryElement.querySelector('.abaka-category-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteCategory(category.id);
            });
        }

        // 设置分类名称双击重命名事件
        const categoryNameEl = categoryElement.querySelector('.abaka-category-name');
        categoryNameEl.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            renameCategory(category.id, category.name);
        });
    }

    // 删除分类
    function deleteCategory(categoryId) {
        if (confirm(`确定要删除分类 "${getCategoryName(categoryId)}" 吗？该分类中的所有工具将移动到默认分类。`)) {
            // 将分类中的工具移到默认分类
            TOOLBOX_CONFIG.tools.forEach(tool => {
                if (toolCategories[tool.id] === categoryId) {
                    toolCategories[tool.id] = 'default';
                }
            });

            // 删除分类
            categories = categories.filter(cat => cat.id !== categoryId);

            // 保存并重新渲染
            saveData();
            renderCategories();
            addLog(`已删除分类 "${getCategoryName(categoryId)}"`);
        }
    }

    // 重命名分类
    function renameCategory(categoryId, currentName) {
        const newName = prompt('请输入新的分类名称：', currentName);
        if (newName && newName.trim() && newName !== currentName) {
            const category = categories.find(cat => cat.id === categoryId);
            if (category) {
                category.name = newName.trim();
                saveData();
                renderCategories();
                addLog(`分类已重命名为 "${newName}"`);
            }
        }
    }

    // 创建新分类
    function createNewCategory(toolIds) {
        const newCategory = {
            id: 'category_' + Date.now(),
            name: generateCategoryName(),
            tools: toolIds
        };

        // 将工具移动到新分类
        toolIds.forEach(toolId => {
            toolCategories[toolId] = newCategory.id;
        });

        categories.push(newCategory);
        saveData();
        renderCategories();

        // 自动进入重命名模式
        setTimeout(() => {
            renameCategory(newCategory.id, newCategory.name);
        }, 100);

        addLog(`已创建新分类 "${newCategory.name}"`);

        return newCategory.id;
    }

    // 获取分类名称
    function getCategoryName(categoryId) {
        const category = categories.find(cat => cat.id === categoryId);
        return category ? category.name : '未知分类';
    }

    // 初始化拖拽功能
    function initDragAndDrop() {
        const toolbox = document.getElementById('abaka-toolbox');
        const header = document.getElementById('abakaToolboxHeader');

        // 工具箱拖拽
        header.addEventListener('mousedown', (e) => {
            // 只允许通过标题栏拖拽，排除按钮
            if (e.button !== 0 || e.target.classList.contains('abaka-toolbox-btn')) return;

            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;

            const rect = toolbox.getBoundingClientRect();
            panelStartX = rect.left;
            panelStartY = rect.top;

            // 添加拖拽样式
            toolbox.classList.add('abaka-dragging');
            document.body.style.cursor = 'move';
            toolbox.style.transition = 'none';

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);

            // 阻止事件冒泡，避免影响页面其他元素
            e.stopPropagation();
            e.preventDefault();
        });

        function onMouseMove(e) {
            if (!isDragging) return;

            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;

            const newLeft = panelStartX + dx;
            const newTop = panelStartY + dy;

            // 限制在视口范围内
            const maxX = window.innerWidth - toolbox.offsetWidth;
            const maxY = window.innerHeight - toolbox.offsetHeight;

            const boundedLeft = Math.max(0, Math.min(newLeft, maxX));
            const boundedTop = Math.max(0, Math.min(newTop, maxY));

            toolbox.style.left = `${boundedLeft}px`;
            toolbox.style.top = `${boundedTop}px`;
            toolbox.style.right = 'auto';
            toolbox.style.bottom = 'auto';

            // 阻止事件冒泡
            e.stopPropagation();
        }

        function onMouseUp(e) {
            if (!isDragging) return;

            isDragging = false;
            toolbox.classList.remove('abaka-dragging');
            document.body.style.cursor = '';
            toolbox.style.transition = 'all 0.3s ease';

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            // 阻止事件冒泡
            if (e) {
                e.stopPropagation();
            }
        }

        // 防止在拖拽过程中意外选择文本
        header.addEventListener('selectstart', (e) => {
            if (isDragging) {
                e.preventDefault();
            }
        });

        // 工具项拖拽
        document.addEventListener('dragstart', function(e) {
            if (e.target.classList.contains('abaka-tool-item')) {
                draggedToolItem = e.target;
                e.dataTransfer.setData('text/plain', e.target.dataset.toolId);
                e.target.classList.add('abaka-dragging');
            }
        });

        document.addEventListener('dragend', function(e) {
            if (e.target.classList.contains('abaka-tool-item')) {
                e.target.classList.remove('abaka-dragging');
                draggedToolItem = null;

                // 移除所有拖拽目标样式
                document.querySelectorAll('.abaka-drop-target').forEach(el => {
                    el.classList.remove('abaka-drop-target');
                });
            }
        });

        document.addEventListener('dragover', function(e) {
            e.preventDefault();

            if (!draggedToolItem) return;

            // 分类头部拖拽目标
            if (e.target.classList.contains('abaka-category-header')) {
                e.target.closest('.abaka-category').classList.add('abaka-drop-target');
            }
            // 工具项拖拽目标
            else if (e.target.classList.contains('abaka-tool-item')) {
                e.target.classList.add('abaka-drop-target');
            }
        });

        document.addEventListener('dragleave', function(e) {
            if (e.target.classList.contains('abaka-category-header')) {
                e.target.closest('.abaka-category').classList.remove('abaka-drop-target');
            }
            else if (e.target.classList.contains('abaka-tool-item')) {
                e.target.classList.remove('abaka-drop-target');
            }
        });

        document.addEventListener('drop', function(e) {
            e.preventDefault();

            if (!draggedToolItem) return;

            const draggedToolId = draggedToolItem.dataset.toolId;

            // 拖拽到分类头部 - 移动到该分类
            if (e.target.classList.contains('abaka-category-header')) {
                const categoryElement = e.target.closest('.abaka-category');
                const categoryId = categoryElement.dataset.categoryId;

                // 更新工具分类
                toolCategories[draggedToolId] = categoryId;
                saveData();

                // 重新渲染分类
                renderCategories();

                addLog(`已将 "${TOOLBOX_CONFIG.tools.find(t => t.id === draggedToolId).name}" 移动到 "${getCategoryName(categoryId)}"`);
            }
            // 拖拽到工具项 - 创建新分类
            else if (e.target.classList.contains('abaka-tool-item')) {
                const targetToolId = e.target.dataset.toolId;

                // 如果拖拽到同一个工具，不处理
                if (draggedToolId === targetToolId) return;

                // 创建新分类
                createNewCategory([draggedToolId, targetToolId]);
            }

            // 移除拖拽样式
            document.querySelectorAll('.abaka-drop-target').forEach(el => {
                el.classList.remove('abaka-drop-target');
            });
        });
    }

    // 设置工具箱事件
    function setupToolboxEvents() {
        // 切换工具箱显示/隐藏
        document.getElementById('abaka-toolbox-toggle').addEventListener('click', function(e) {
            const toolbox = document.getElementById('abaka-toolbox');
            const isCollapsed = toolbox.classList.contains('collapsed');

            if (isCollapsed) {
                toolbox.classList.remove('collapsed');
                this.textContent = '−';
            } else {
                toolbox.classList.add('collapsed');
                this.textContent = '+';
            }

            e.stopPropagation();
        });

        // 关闭工具箱
        document.getElementById('abaka-toolbox-close').addEventListener('click', function(e) {
            document.getElementById('abaka-toolbox').style.display = 'none';
            e.stopPropagation();
        });

        // 返回主视图
        document.getElementById('abaka-toolbox-back').addEventListener('click', function(e) {
            showMainView();
            e.stopPropagation();
        });

        // 工具箱设置
        document.getElementById('abaka-toolbox-settings').addEventListener('click', function(e) {
            showToolboxSettings();
            e.stopPropagation();
        });

        // 导出设置
        document.getElementById('abaka-export-settings').addEventListener('click', function(e) {
            exportSettings();
            e.stopPropagation();
        });

        // 导入设置
        document.getElementById('abaka-import-settings').addEventListener('click', function(e) {
            document.getElementById('abaka-import-file').click();
            e.stopPropagation();
        });

        // 处理文件导入
        document.getElementById('abaka-import-file').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                importSettings(file);
            }
            // 清空input，以便再次选择同一文件
            e.target.value = '';
        });

        // 重置设置
        document.getElementById('abaka-reset-settings').addEventListener('click', function(e) {
            if (confirm('确定要重置所有设置吗？这将恢复默认分类和工具状态。')) {
                resetSettings();
            }
            e.stopPropagation();
        });

        // 初始化所有启用的工具
        TOOLBOX_CONFIG.tools.forEach(tool => {
            if (tool.enabled) {
                enableTool(tool.id);
            }
        });
    }

    // 设置工具事件
    function setupToolEvents() {
        // 工具开关事件
        TOOLBOX_CONFIG.tools.forEach(tool => {
            const toggle = document.getElementById(`abaka-toggle-${tool.id}`);
            if (toggle) {
                toggle.addEventListener('change', function(e) {
                    const enabled = this.checked;
                    updateToolState(tool.id, enabled);

                    if (enabled) {
                        enableTool(tool.id);
                    } else {
                        disableTool(tool.id);
                    }

                    e.stopPropagation();
                });
            }

            // 工具项点击事件（打开设置）
            const toolItem = document.querySelector(`.abaka-tool-item[data-tool-id="${tool.id}"]`);
            if (toolItem && tool.hasSettings) {
                toolItem.addEventListener('click', function(e) {
                    if (!e.target.closest('.abaka-tool-toggle') && !e.target.closest('.abaka-tool-settings-btn')) {
                        showToolSettings(tool.id);
                    }
                    e.stopPropagation();
                });

                // 设置按钮点击事件
                const settingsBtn = toolItem.querySelector('.abaka-tool-settings-btn');
                if (settingsBtn) {
                    settingsBtn.addEventListener('click', function(e) {
                        showToolSettings(tool.id);
                        e.stopPropagation();
                    });
                }
            }
        });

        // 自动点击器控制按钮
        const autoClickerStartBtn = document.getElementById('abaka-autoClickerStartBtn');
        const autoClickerStopBtn = document.getElementById('abaka-autoClickerStopBtn');

        if (autoClickerStartBtn) {
            autoClickerStartBtn.addEventListener('click', function(e) {
                if (toolManager.autoClick.enabled) {
                    toolManager.autoClick.startListening();
                }
                e.stopPropagation();
            });
        }

        if (autoClickerStopBtn) {
            autoClickerStopBtn.addEventListener('click', function(e) {
                if (toolManager.autoClick.enabled) {
                    toolManager.autoClick.stopListening();
                }
                e.stopPropagation();
            });
        }
    }

    // 显示主视图
    function showMainView() {
        document.getElementById('abakaMainView').style.display = 'block';
        document.getElementById('abakaAutoClickerView').style.display = 'none';
        document.getElementById('abakaToolboxSettingsView').style.display = 'none';
        document.getElementById('abaka-toolbox-back').style.display = 'none';
        document.getElementById('abakaToolboxMainTitle').textContent = TOOLBOX_CONFIG.name;
        currentToolView = null;
    }

    // 显示工具设置
    function showToolSettings(toolId) {
        if (toolId === 'autoClick') {
            document.getElementById('abakaMainView').style.display = 'none';
            document.getElementById('abakaAutoClickerView').style.display = 'block';
            document.getElementById('abakaToolboxSettingsView').style.display = 'none';
            document.getElementById('abaka-toolbox-back').style.display = 'block';
            document.getElementById('abakaToolboxMainTitle').textContent = '控制台静默点击器';
            currentToolView = 'autoClick';
        }
    }

    // 显示工具箱设置
    function showToolboxSettings() {
        document.getElementById('abakaMainView').style.display = 'none';
        document.getElementById('abakaAutoClickerView').style.display = 'none';
        document.getElementById('abakaToolboxSettingsView').style.display = 'block';
        document.getElementById('abaka-toolbox-back').style.display = 'block';
        document.getElementById('abakaToolboxMainTitle').textContent = '工具箱设置';
        currentToolView = 'toolboxSettings';
    }

    // 加载工具状态
    function loadToolStates() {
        TOOLBOX_CONFIG.tools.forEach(tool => {
            const savedState = GM_getValue(`tool-${tool.id}-enabled`, tool.enabled);
            const toggle = document.getElementById(`abaka-toggle-${tool.id}`);

            if (toggle) {
                toggle.checked = savedState;
                updateToolState(tool.id, savedState);

                if (savedState) {
                    enableTool(tool.id);
                }
            }
        });
    }

    // 更新工具状态
    function updateToolState(toolId, enabled) {
        const statusElement = document.getElementById(`abaka-status-${toolId}`);
        if (statusElement) {
            statusElement.textContent = enabled ? '已启用' : '已禁用';
            statusElement.className = `abaka-tool-status ${enabled ? 'abaka-enabled' : 'abaka-disabled'}`;
        }

        GM_setValue(`tool-${tool.id}-enabled`, enabled);
        addLog(`${TOOLBOX_CONFIG.tools.find(t => t.id === toolId).name} ${enabled ? '已启用' : '已禁用'}`);
    }

    // 导出设置
    function exportSettings() {
        const settings = {
            version: TOOLBOX_CONFIG.version,
            exportTime: new Date().toISOString(),
            toolStates: {},
            categories: categories,
            toolCategories: toolCategories
        };

        // 收集所有工具状态
        TOOLBOX_CONFIG.tools.forEach(tool => {
            settings.toolStates[tool.id] = GM_getValue(`tool-${tool.id}-enabled`, tool.enabled);
        });

        // 收集分类折叠状态
        settings.categoryCollapsed = {};
        categories.forEach(category => {
            settings.categoryCollapsed[category.id] = GM_getValue(`abaka-category-${category.id}-collapsed`, false);
        });

        const dataStr = JSON.stringify(settings, null, 2);
        const blob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `abaka-toolbox-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addLog('设置已导出');
    }

    // 导入设置
    function importSettings(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const settings = JSON.parse(e.target.result);

                // 验证设置文件
                if (!settings.toolStates || !settings.categories || !settings.toolCategories) {
                    throw new Error('无效的设置文件格式');
                }

                // 应用工具状态
                Object.keys(settings.toolStates).forEach(toolId => {
                    GM_setValue(`tool-${toolId}-enabled`, settings.toolStates[toolId]);
                });

                // 应用分类和工具分类
                GM_setValue('abaka-categories', settings.categories);
                GM_setValue('abaka-tool-categories', settings.toolCategories);

                // 应用分类折叠状态
                if (settings.categoryCollapsed) {
                    Object.keys(settings.categoryCollapsed).forEach(categoryId => {
                        GM_setValue(`abaka-category-${categoryId}-collapsed`, settings.categoryCollapsed[categoryId]);
                    });
                }

                // 重新初始化数据
                initData();
                loadToolStates();
                renderCategories();

                addLog('设置已导入');
            } catch (error) {
                alert('导入设置失败: ' + error.message);
                addLog('导入设置失败: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    // 重置设置
    function resetSettings() {
        // 重置工具状态
        TOOLBOX_CONFIG.tools.forEach(tool => {
            GM_setValue(`tool-${tool.id}-enabled`, tool.enabled);
        });

        // 重置分类
        GM_setValue('abaka-categories', TOOLBOX_CONFIG.categories);

        // 重置工具分类
        const defaultToolCategories = {};
        TOOLBOX_CONFIG.tools.forEach(tool => {
            defaultToolCategories[tool.id] = 'default';
        });
        GM_setValue('abaka-tool-categories', defaultToolCategories);

        // 重置分类折叠状态
        categories.forEach(category => {
            GM_setValue(`abaka-category-${category.id}-collapsed`, false);
        });

        // 重新初始化数据
        initData();
        loadToolStates();
        renderCategories();

        addLog('设置已重置为默认值');
    }

    // 添加日志
    function addLog(message, type = 'info') {
        const logsContainer = document.getElementById('abaka-toolbox-logs');
        const logEntry = document.createElement('div');
        logEntry.className = `abaka-log-entry abaka-${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    // 添加自动点击器日志
    function addAutoClickerLog(message, type = 'info') {
        const logsContainer = document.getElementById('abaka-autoClickerLogs');
        const logEntry = document.createElement('div');
        logEntry.className = `abaka-log-entry abaka-${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    // 更新自动点击器状态
    function updateAutoClickerStatus(newStatus) {
        const statusEl = document.getElementById('abaka-autoClickerStatus');
        statusEl.textContent = newStatus;
        statusEl.className = 'abaka-status';
        statusEl.classList.add(newStatus === '运行中' ? 'abaka-running' : 'abaka-stopped');
    }

    // 工具管理器
    const toolManager = {
        autoFocus: {
            enabled: false,
            init: function() {
                // 自动聚焦工具实现
                document.addEventListener('click', this.clickHandler);
                this.observer = new MutationObserver(this.mutationHandler);
                this.observer.observe(document.body, { childList: true, subtree: true });
                addLog('自动聚焦工具已初始化');
            },
            destroy: function() {
                document.removeEventListener('click', this.clickHandler);
                if (this.observer) {
                    this.observer.disconnect();
                }
                addLog('自动聚焦工具已卸载');
            },
            clickHandler: function(event) {
                const target = event.target;
                if (target.classList.contains('option-answer') &&
                    target.textContent.includes('Yes') &&
                    !target.classList.contains('selected')) {

                    setTimeout(() => {
                        const textarea = document.querySelector('.n-input__textarea-el');
                        if (textarea) {
                            textarea.focus();
                            textarea.select();
                            addLog('焦点已设置到输入框', 'success');
                        } else {
                            setTimeout(() => {
                                const retryTextarea = document.querySelector('.n-input__textarea-el');
                                if (retryTextarea) {
                                    retryTextarea.focus();
                                    retryTextarea.select();
                                    addLog('重试成功：焦点已设置到输入框', 'success');
                                }
                            }, 300);
                        }
                    }, 500);
                }
            },
            mutationHandler: function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === 1 && node.querySelector) {
                                const textarea = node.querySelector('.n-input__textarea-el');
                                if (textarea && document.activeElement !== textarea) {
                                    setTimeout(() => {
                                        textarea.focus();
                                        textarea.select();
                                        addLog('通过MutationObserver设置焦点', 'success');
                                    }, 100);
                                }
                            }
                        });
                    }
                });
            }
        },

        shortcutSubmit: {
            enabled: false,
            lastEnterTime: 0,
            doubleClickInterval: 300,
            init: function() {
                this.keyHandler = this.keyHandler.bind(this);
                document.addEventListener('keydown', this.keyHandler);
                addLog('Enter送审快捷键工具已初始化');
            },
            destroy: function() {
                document.removeEventListener('keydown', this.keyHandler);
                addLog('Enter送审快捷键工具已卸载');
            },
            keyHandler: function(event) {
                if (event.key === 'Enter' || event.keyCode === 13) {
                    const currentTime = Date.now();
                    const timeDiff = currentTime - this.lastEnterTime;

                    if (timeDiff > 0 && timeDiff <= this.doubleClickInterval) {
                        const submitButton = document.querySelector('.button.head-submit-button');
                        if (submitButton) {
                            submitButton.click();
                            addLog('已通过双击Enter点击送审按钮', 'success');
                            this.lastEnterTime = 0;
                        } else {
                            addLog('未找到送审按钮 (.button.head-submit-button)', 'warning');
                        }
                    } else {
                        this.lastEnterTime = currentTime;
                    }
                }
            }
        },

        translationShortcut: {
            enabled: false,
            init: function() {
                document.addEventListener('keydown', this.keyHandler);
                addLog('翻译快捷键工具已初始化');
            },
            destroy: function() {
                document.removeEventListener('keydown', this.keyHandler);
                addLog('翻译快捷键工具已卸载');
            },
            keyHandler: function(event) {
                if (event.key === '`' || event.code === 'Backquote') {
                    event.preventDefault();

                    const iconHost = document.querySelector('yd-mg-icon');
                    if (iconHost) {
                        const shadowRoot = iconHost.shadowRoot;
                        if (shadowRoot) {
                            const targetButton = shadowRoot.querySelector('#logo');
                            if (targetButton) {
                                targetButton.click();
                                addLog('成功点击了 Shadow DOM 内的翻译按钮', 'success');
                            } else {
                                addLog('在 Shadow DOM 内未找到翻译按钮', 'warning');
                            }
                        } else {
                            addLog('无法访问 yd-mg-icon 的 Shadow DOM', 'warning');
                        }
                    } else {
                        addLog('未在页面上找到翻译组件', 'warning');
                    }
                }
            }
        },

        autoClick: {
            enabled: false,
            init: function() {
                this.lastConsoleTime = Date.now();
                this.checkTimer = null;
                this.isRunning = false;
                this.isProcessing = false;
                this.consoleMethods = ['log', 'info', 'warn', 'error', 'debug', 'dir', 'table'];
                this.originalMethods = {};

                addLog('控制台静默自动点击工具已初始化');
            },
            destroy: function() {
                this.stopListening();
                addLog('控制台静默自动点击工具已卸载');
            },
            checkNoMoreDataPopup: function() {
                const popupContainer = document.querySelector('.n-modal.pop-container');
                if (!popupContainer) return false;

                const contentDiv = popupContainer.querySelector('.pop-content');
                if (contentDiv && contentDiv.textContent.includes('没有更多数据，是否退出?')) {
                    return true;
                }

                return false;
            },
            isLoadingPopupVisible: function() {
                const loadingPopup = document.querySelector('.workspace-loading.show-header');
                return loadingPopup && loadingPopup.style.display !== 'none';
            },
            handleNoMoreDataPopup: function() {
                const popupContainer = document.querySelector('.n-modal.pop-container');
                if (popupContainer) {
                    const confirmBtn = popupContainer.querySelector('.button.info');
                    if (confirmBtn) {
                        addAutoClickerLog('检测到"没有更多数据"弹窗，等待2秒后点击确认...', 'warning');
                        setTimeout(() => {
                            confirmBtn.click();
                            addAutoClickerLog('已点击确认按钮退出页面', 'success');

                            const isAutoStopEnabled = document.getElementById('abaka-autoStopCheckbox').checked;
                            if (isAutoStopEnabled) {
                                addAutoClickerLog('弹窗已处理，自动停止监听', 'info');
                                this.stopListening();
                            }
                        }, 2000);
                        return true;
                    }
                }
                return false;
            },
            handleLoadingState: function() {
                if (this.isLoadingPopupVisible()) {
                    addAutoClickerLog('检测到页面加载中，等待加载完成...', 'info');
                    this.lastConsoleTime = Date.now();
                    return true;
                }
                return false;
            },
            startListening: function() {
                if (this.isRunning) return;

                // 重写 console 方法
                this.consoleMethods.forEach(method => {
                    this.originalMethods[method] = console[method];
                    console[method] = (...args) => {
                        this.lastConsoleTime = Date.now();
                        this.originalMethods[method].apply(console, args);
                    };
                });

                this.lastConsoleTime = Date.now();
                this.isRunning = true;
                this.isProcessing = false;
                document.getElementById('abaka-autoClickerStartBtn').disabled = true;
                document.getElementById('abaka-autoClickerStopBtn').disabled = false;
                updateAutoClickerStatus('运行中');
                addAutoClickerLog('开始循环监听控制台输出...', 'info');

                this.checkTimer = setInterval(() => {
                    if (this.isProcessing) return;

                    const now = Date.now();

                    // 情况1: 优先检查"没有更多数据"弹窗
                    if (this.checkNoMoreDataPopup()) {
                        this.isProcessing = true;
                        addAutoClickerLog('检测到结束弹窗，处理中...', 'warning');
                        this.handleNoMoreDataPopup();
                        return;
                    }

                    // 情况2: 检查加载弹窗
                    if (this.handleLoadingState()) {
                        return; // 页面正在加载，等待完成
                    }

                    // 情况3: 没有弹窗、没有加载、控制台静默 - 执行点击
                    if (now - this.lastConsoleTime > 2000) {
                        this.isProcessing = true;
                        addAutoClickerLog('控制台静默且无弹窗/加载，执行点击...', 'success');
                        const submitBtn = document.querySelector('.head-submit-button');
                        if (submitBtn) {
                            submitBtn.click();
                            addAutoClickerLog('成功触发 .head-submit-button 点击！', 'success');

                            setTimeout(() => {
                                this.lastConsoleTime = Date.now();
                                this.isProcessing = false;
                            }, 1000);
                        } else {
                            addAutoClickerLog('未找到 .head-submit-button 元素！', 'error');
                            this.isProcessing = false;
                        }
                    }
                }, 1000);
            },
            stopListening: function() {
                if (!this.isRunning) return;

                // 恢复原生 console 方法
                this.consoleMethods.forEach(method => {
                    if (this.originalMethods[method]) {
                        console[method] = this.originalMethods[method];
                    }
                });

                if (this.checkTimer) {
                    clearInterval(this.checkTimer);
                    this.checkTimer = null;
                }

                this.isRunning = false;
                this.isProcessing = false;
                document.getElementById('abaka-autoClickerStartBtn').disabled = false;
                document.getElementById('abaka-autoClickerStopBtn').disabled = true;
                updateAutoClickerStatus('已停止');
                addAutoClickerLog('循环监听已停止。', 'info');
            }
        }
    };

    // 启用工具
    function enableTool(toolId) {
        if (toolManager[toolId] && !toolManager[toolId].enabled) {
            toolManager[toolId].enabled = true;
            toolManager[toolId].init();
        }
    }

    // 禁用工具
    function disableTool(toolId) {
        if (toolManager[toolId] && toolManager[toolId].enabled) {
            toolManager[toolId].enabled = false;
            toolManager[toolId].destroy();
        }
    }

    // 添加样式
    GM_addStyle(`
        #abaka-toolbox {
            position: fixed;
            width: 420px;
            background: #2d3748;
            color: #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            z-index: 10000;
            transition: all 0.3s ease;
            overflow: hidden;
            user-select: none;
        }

        #abaka-toolbox.collapsed {
            height: 40px;
        }

        #abaka-toolbox.collapsed .abaka-toolbox-body {
            display: none;
        }

        #abaka-toolbox.abaka-dragging {
            opacity: 0.9;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }

        .abaka-toolbox-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background: #1a202c;
            border-bottom: 1px solid #4a5568;
            cursor: move;
            user-select: none;
        }

        .abaka-toolbox-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: bold;
            font-size: 16px;
        }

        .abaka-toolbox-version {
            font-size: 12px;
            color: #a0aec0;
            font-weight: normal;
        }

        .abaka-toolbox-controls {
            display: flex;
            gap: 5px;
        }

        .abaka-toolbox-btn {
            background: none;
            border: none;
            color: #cbd5e0;
            font-size: 16px;
            cursor: pointer;
            width: 24px;
            height: 24px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .abaka-toolbox-btn:hover {
            background: #4a5568;
            color: white;
        }

        .abaka-toolbox-body {
            padding: 0;
        }

        .abaka-tool-view {
            transition: all 0.3s ease;
        }

        /* 分类样式 */
        .abaka-toolbox-categories {
            max-height: 400px;
            overflow-y: auto;
            padding: 10px;
        }

        .abaka-category {
            margin-bottom: 15px;
            border: 1px solid #4a5568;
            border-radius: 6px;
            overflow: hidden;
        }

        .abaka-category.abaka-drop-target {
            border-color: #48bb78;
            box-shadow: 0 0 0 2px rgba(72, 187, 120, 0.3);
        }

        .abaka-category-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: #4a5568;
            cursor: pointer;
            user-select: none;
        }

        .abaka-category-name {
            font-weight: bold;
            font-size: 14px;
            cursor: text;
        }

        .abaka-category-name:hover {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
        }

        .abaka-category-controls {
            display: flex;
            gap: 5px;
        }

        .abaka-category-toggle {
            background: none;
            border: none;
            color: #cbd5e0;
            cursor: pointer;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .abaka-category-delete {
            background: none;
            border: none;
            color: #e53e3e;
            cursor: pointer;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
        }

        .abaka-category-delete:hover {
            background: #e53e3e;
            color: white;
            border-radius: 3px;
        }

        .abaka-category-tools {
            padding: 8px;
            background: #2d3748;
        }

        .abaka-tool-item {
            background: #4a5568;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 8px;
            transition: all 0.2s;
            position: relative;
            cursor: pointer;
        }

        .abaka-tool-item:hover {
            background: #5a6578;
        }

        .abaka-tool-item.abaka-dragging {
            opacity: 0.5;
        }

        .abaka-tool-item.abaka-drop-target {
            border: 2px dashed #48bb78;
            background: rgba(72, 187, 120, 0.1);
        }

        .abaka-tool-header {
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }

        .abaka-tool-toggle {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
            flex-shrink: 0;
        }

        .abaka-tool-toggle input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .abaka-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #718096;
            transition: .4s;
            border-radius: 20px;
        }

        .abaka-slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        .abaka-tool-toggle input:checked + .abaka-slider {
            background-color: #48bb78;
        }

        .abaka-tool-toggle input:checked + .abaka-slider:before {
            transform: translateX(20px);
        }

        .abaka-tool-info {
            flex: 1;
            min-width: 0; /* 防止内容溢出 */
        }

        .abaka-tool-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .abaka-tool-desc {
            font-size: 12px;
            color: #a0aec0;
            line-height: 1.3;
        }

        .abaka-tool-version {
            font-size: 10px;
            color: #718096;
            flex-shrink: 0;
        }

        .abaka-tool-status {
            font-size: 11px;
            margin-top: 8px;
            padding: 2px 8px;
            border-radius: 10px;
            display: inline-block;
        }

        .abaka-tool-status.abaka-enabled {
            background: #48bb78;
            color: white;
        }

        .abaka-tool-status.abaka-disabled {
            background: #718096;
            color: #e2e8f0;
        }

        .abaka-tool-settings-btn {
            position: absolute;
            bottom: 10px; /* 设置按钮放在下面 */
            right: 10px;
            font-size: 14px;
            opacity: 0.7;
            cursor: pointer;
            z-index: 1; /* 确保在版本号之上 */
        }

        .abaka-tool-settings-btn:hover {
            opacity: 1;
        }

        .abaka-toolbox-footer {
            border-top: 1px solid #4a5568;
        }

        .abaka-toolbox-logs {
            padding: 10px;
        }

        .abaka-logs-header {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
        }

        .abaka-logs-content {
            height: 120px;
            overflow-y: auto;
            background: #1a202c;
            border-radius: 4px;
            padding: 8px;
            font-size: 11px;
            line-height: 1.4;
        }

        .abaka-log-entry {
            margin-bottom: 4px;
            padding-left: 15px;
            position: relative;
        }

        .abaka-log-entry:before {
            content: "•";
            position: absolute;
            left: 5px;
            color: #718096;
        }

        .abaka-log-entry.abaka-info { color: #a0aec0; }
        .abaka-log-entry.abaka-success { color: #48bb78; }
        .abaka-log-entry.abaka-warning { color: #ed8936; }
        .abaka-log-entry.abaka-error { color: #e53e3e; }

        /* 自动点击器设置样式 */
        .abaka-tool-settings-header {
            padding: 15px;
            border-bottom: 1px solid #4a5568;
        }

        .abaka-tool-settings-header h3 {
            margin: 0;
            font-size: 16px;
        }

        .abaka-tool-settings-content {
            padding: 15px;
        }

        .abaka-settings-controls {
            margin-bottom: 15px;
        }

        .abaka-controls-wrapper {
            margin-bottom: 10px;
        }

        .abaka-settings-controls .abaka-controls {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }

        .abaka-settings-controls button {
            flex: 1;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
        }

        #abaka-autoClickerStartBtn {
            background-color: #48bb78;
            color: white;
        }

        #abaka-autoClickerStartBtn:hover {
            background-color: #38a169;
        }

        #abaka-autoClickerStartBtn:disabled {
            background-color: #718096;
            cursor: not-allowed;
        }

        #abaka-autoClickerStopBtn {
            background-color: #e53e3e;
            color: white;
        }

        #abaka-autoClickerStopBtn:hover {
            background-color: #c53030;
        }

        #abaka-autoClickerStopBtn:disabled {
            background-color: #718096;
            cursor: not-allowed;
        }

        .abaka-auto-stop-option {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: #cbd5e0;
        }

        .abaka-auto-stop-option input[type="checkbox"] {
            width: 14px;
            height: 14px;
            accent-color: #48bb78;
            cursor: pointer;
        }

        .abaka-settings-status {
            margin-bottom: 15px;
            padding: 10px;
            background: #1a202c;
            border-radius: 4px;
        }

        .abaka-status-display {
            font-size: 14px;
        }

        .abaka-status {
            font-size: 12px;
            padding: 3px 8px;
            border-radius: 12px;
            background-color: #4a5568;
            color: #cbd5e0;
            margin-left: 10px;
        }

        .abaka-status.abaka-running {
            background-color: #38a169;
            color: white;
        }

        .abaka-status.abaka-stopped {
            background-color: #718096;
            color: white;
        }

        .abaka-settings-logs {
            margin-top: 15px;
        }

        .abaka-settings-logs .abaka-logs-content {
            height: 150px;
        }

        /* 工具箱设置样式 */
        .abaka-settings-section {
            margin-bottom: 20px;
        }

        .abaka-settings-section h4 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #e2e8f0;
        }

        .abaka-data-management {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .abaka-data-management button {
            padding: 10px 15px;
            background: #4a5568;
            border: none;
            border-radius: 4px;
            color: #e2e8f0;
            cursor: pointer;
            font-size: 14px;
        }

        .abaka-data-management button:hover {
            background: #5a6578;
        }

        .abaka-data-management button.abaka-danger {
            background: #e53e3e;
            color: white;
        }

        .abaka-data-management button.abaka-danger:hover {
            background: #c53030;
        }

        /* 针对目标滚动容器（如示例中的.abaka-toolbox-categories） */
        .abaka-hideScrollbar {
          overflow: auto; /* 保持滚动功能 */
          -ms-overflow-style: none; /* 隐藏 IE/旧版 Edge 滚动条 */
          scrollbar-width: none; /* 隐藏 Firefox 滚动条 */
        }

        /* 隐藏 WebKit 内核浏览器（Chrome、Safari 等）的滚动条 */
        .abaka-hideScrollbar::-webkit-scrollbar {
          display: none;
        }
    `);

    // 初始化工具箱
    createToolboxUI();
    addLog('Abaka标注平台工具箱 v1.5 已加载');

})();