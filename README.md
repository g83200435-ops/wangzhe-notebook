# 王者荣耀游戏错题本（第一阶段 MVP）

一个帮助玩家复盘对局、积累错题的个人工具。第一阶段仅实现：手动添加对局、保存到 localStorage、Dashboard 展示最近对局与整体统计、支持删除。

## 技术栈

- React 18 + Vite（JavaScript）
- React Router DOM
- lucide-react 图标
- 原生 CSS
- Vitest 单元测试（jsdom 环境）
- 数据持久化：浏览器 localStorage（key: `wangzhe_game_notebook`）

## 使用

```bash
npm install
npm run dev       # 启动开发服务器
npm run build     # 生产构建
npm run test      # 运行单元测试
```

注：本项目未配置 ESLint。

## 目录结构

```
src/
  main.jsx / App.jsx / App.css
  constants/options.js
  services/storage.js
  utils/stats.js
  utils/id.js
  components/{Layout,EmptyState,MatchCard,StatsPanel,ConfirmDialog}.jsx
  pages/{Dashboard,AddMatch}.jsx
  __tests__/{stats,storage}.test.js
```
