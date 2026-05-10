# Todo 便签墙

一个打开就能用的待办事项小工具，风格是极简便签墙。

## 功能

- 可作为普通网页直接打开使用
- 添加待办事项
- 自己填写分类，也可以不填
- 不会预设分类，不填时会保持无分类
- 勾选完成状态
- 编辑和删除单条待办
- 按完成状态和你用过的分类筛选
- 一键清理已完成事项
- 自动保存，关闭弹窗后下次打开仍然保留
- 可显示在 Chrome 新标签页，打开首页即可看到待办
- 新标签页可以自定义分类列，支持新增、改名和删除空列
- 新标签页便签可以拖动，支持跨列移动和同列排序
- 新标签页分类列也可以拖动排序

## 使用方式

1. 打开 Chrome 的扩展程序页面：`chrome://extensions/`
2. 打开右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择这个文件夹：`/Users/evina/Evina-demo/chrome`

加载完成后，点击 Chrome 工具栏里的扩展图标即可使用。

如果希望固定在首页，加载扩展后打开一个新标签页即可看到待办页面。Chrome 可能会提示新标签页已被扩展更改，选择保留即可。

## 网页版

直接打开这个文件即可使用网页版：

`/Users/evina/Evina-demo/chrome/index.html`

网页版会把数据保存在当前浏览器的本地存储里，不需要服务器。

## English

Todo Sticky Wall is a lightweight todo extension designed as a clean sticky-note wall. It works as a toolbar popup, a Chrome new tab page, and a standalone web page.

### Features

- Can be opened directly as a standalone web page
- Add todo items quickly
- Add your own categories, or leave items uncategorized
- No preset category setup is required
- Mark tasks as complete
- Edit or delete individual tasks
- Filter by completion status and categories you have used
- Clear completed tasks in one action
- Automatically saves your tasks locally
- Shows your todo board on the Chrome new tab page
- Custom new tab columns: add, rename, and delete empty columns
- Drag sticky notes across columns or reorder them within the same column
- Drag columns to change the board layout

### How To Use

1. Open Chrome extensions: `chrome://extensions/`
2. Turn on "Developer mode" in the top-right corner.
3. Click "Load unpacked".
4. Select this folder: `/Users/evina/Evina-demo/chrome`

After loading the extension, click the extension icon in the Chrome toolbar to use the popup todo list.

To use it as your homepage-style board, open a new Chrome tab. If Chrome asks whether to keep the new tab page change, choose to keep it.

### Web Version

Open this file directly to use the standalone web version:

`/Users/evina/Evina-demo/chrome/index.html`

The web version saves data in the current browser's local storage and does not require a server.

### Privacy

Tasks and categories are saved locally in Chrome storage. The extension does not send your todo data to a server.
