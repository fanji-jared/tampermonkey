# 繁寂の油猴脚本集合

这个仓库包含了一系列用于 Tampermonkey 浏览器扩展的实用脚本，旨在增强特定网站的功能和用户体验。

## 脚本列表

| 项目名称 | 路径（最新版书） |
| --- | --- |
| RZLowCode开发工具箱 | [RZLowCode开发工具箱 0.6.5](RZLowCode/RZLowCode开发工具箱-0.6.5.user.js) |
| Abaka 标注平台工具箱 | [Abaka/Abaka标注平台工具箱-1.5.1.user.js](Abaka/Abaka标注平台工具箱-1.5.1.user.js) |
| Abaka README | [Abaka/README.md](Abaka/README.md) |
| RZLowCode README | [RZLowCode/README.md](RZLowCode/README.md) |

## 脚本介绍

### RZLowCode开发工具箱

| 版本 | 新增功能 | 描述 |
| --- | --- | --- |
| 0.5.0 | 字段列宽计算工具 | 用于自动计算RZ低代码平台中表格字段列的宽度，然后生成RZ平台对应配置字符串 |
| 0.6.0 | 模板代码高度计算工具 | 修复了表格字段列宽计算工具在特定情况下无法正确计算的问题 |
| 0.6.5 | BUG:字段列宽计算工具 | 修复"扫描表格"以及"应用修改后"border占用位置导致的显示不正常 |

### Abaka 标注平台工具箱

| 版本 | 新增功能 | 描述 |
| 1.0.0 | 自动聚焦输入框 / Enter 送审快捷键 / 翻译快捷键 | 初始版本，包含基础标注辅助功能 |
| 1.5.0 | 分类拖拽、双击重命名、工具设置 | 支持对工具分类进行拖拽排序、双击重命名分类及启用/禁用工具 |
| 1.5.1 | 支持定义审查频率、设置导出/导入与重置 | 增强初始化与设置管理，新增审查频率配置并完善设置导入/导出/重置 |

## 使用与安装（通用）

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击上方表格中的脚本链接
3. 在打开的页面中点击「Raw」按钮
4. 点击脚本文件的"Raw"链接

    ![Raw](https://github.com/user-attachments/assets/984c96b2-66ac-4df7-851d-f0bf1a26b1ae)

5. Tampermonkey 会检测到用户脚本并显示安装界面
6. 点击"安装"按钮完成安装

    ![点击安装](https://github.com/user-attachments/assets/ec8672f5-b056-430a-bc08-9d4bbd284141)

7. 访问对应网站，脚本将自动生效

## 贡献

欢迎提交 Pull Request 或 Issue 来改进这些脚本或添加新的脚本。
