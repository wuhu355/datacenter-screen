# 数据中心监控大屏 — 设计规范

> 全局视觉参考，写 CSS 时对照此文档。

---

## 一、色彩系统

### 1.1 主题色盘

| 色号 | 色值 | 用途 |
|------|------|------|
| 背景深色 | `#0a0e27` | 页面底色 |
| 面板底色 | `#111640` | 卡片/图表容器背景 |
| 面板边框 | `#1e2a5a` | 容器描边 |
| 主色调 | `#00d4ff` | 标题、高亮、线条主色（青蓝） |
| 辅色调 | `#00ff88` | 正常/在线/健康标识 |
| 警告色 | `#ffb820` | 警告级别告警 |
| 危险色 | `#ff4757` | 严重告警、异常指标 |
| 文字主色 | `#e0e6f0` | 主要文字 |
| 文字辅色 | `#8892b0` | 次要文字、标签 |

### 1.2 图表色阶（ECharts 里直接用）

```js
// 多系列图表的颜色数组
const chartPalette = [
  '#00d4ff', // 青蓝
  '#00ff88', // 绿色
  '#ffb820', // 橙色
  '#ff4757', // 红色
  '#bd6eff', // 紫色
  '#00e5ff', // 浅蓝
  '#69f0ae', // 浅绿
  '#ff8a80', // 浅红
];
```

### 1.3 渐变常用

```css
/* 标题文字渐变 */
.title-gradient {
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 面板顶部发光线条 */
.panel-glow-top {
  border-top: 2px solid;
  border-image: linear-gradient(90deg, transparent, #00d4ff, transparent) 1;
}

/* 统计卡片背景 */
.card-bg {
  background: linear-gradient(180deg, rgba(0,212,255,0.08) 0%, rgba(17,22,64,1) 100%);
}
```

---

## 二、字体

| 用途 | 字体 | 大小 | 粗细 |
|------|------|------|------|
| 大屏标题 | `'Microsoft YaHei', sans-serif` | 32px | 700 |
| 面板标题 | 同上 | 16px | 600 |
| 数字（统计卡片） | `'DIN Alternate', 'Helvetica Neue', monospace` | 36px | 700 |
| 图表标签 | 同上 | 12px | 400 |
| 表格/列表 | 同上 | 13px | 400 |

> 如果不用 DIN 字体，CSS 里回退到 `'Courier New', monospace`，等宽数字翻牌时不会抖动。

---

## 三、页面网格

```css
/* 1920×1080 标准大屏布局 */
.grid-container {
  display: grid;
  width: 100vw;
  height: 100vh;
  padding: 12px 16px;
  gap: 10px;
  grid-template-columns: 28fr 44fr 28fr;
  grid-template-rows: 80px 1fr;
}

/* 顶部横条 */
.header { grid-column: 1 / -1; grid-row: 1; }

/* 三列 */
.left-col   { grid-column: 1; grid-row: 2; }
.center-col { grid-column: 2; grid-row: 2; }
.right-col  { grid-column: 3; grid-row: 2; }
```

---

## 四、组件样式

### 4.1 统计卡片

```
┌──────────────────────┐
│ 主机总数       🖥️    │
│   20          ↑3     │  ← 数字用 36px bold，带翻牌动画
│ 较上月 +2            │  ← 副文字 12px
└──────────────────────┘
```

```css
.stat-card {
  background: linear-gradient(180deg, rgba(0,212,255,0.08), rgba(17,22,64,1));
  border: 1px solid #1e2a5a;
  border-radius: 4px;
  padding: 14px 18px;
  position: relative;
}
.stat-card::before {
  content: '';
  position: absolute; top: 0; left: 20%; right: 20%; height: 2px;
  background: linear-gradient(90deg, transparent, #00d4ff, transparent);
}
.stat-value { font-size: 36px; font-weight: 700; color: #00d4ff; }
.stat-label { font-size: 13px; color: #8892b0; }
```

### 4.2 面板容器

每个图表模块统一用 `.panel` 包裹：

```css
.panel {
  background: #111640;
  border: 1px solid #1e2a5a;
  border-radius: 4px;
  padding: 12px;
  position: relative;
}
.panel-title {
  font-size: 15px; font-weight: 600; color: #e0e6f0;
  padding-left: 10px;
  border-left: 3px solid #00d4ff;
  margin-bottom: 8px;
}
```

### 4.3 告警列表

```
┌──────────────────────────────────┐
│ 🔴 严重  server-003  磁盘99.5%    │
│ ⚠️ 警告  server-008  CPU 79.6%   │
│ ✅ 已处理 server-012  内存75G    │
└──────────────────────────────────┘
```

每行高 32px，严重行背景 `rgba(255,71,87,0.1)`，配合 `setInterval` 实现逐行滚动。

### 4.4 主机风险排名

数字序号 + 主机名 + 风险进度条，左栏紧凑展示：

```
① server-003  ████████████ 85分
② server-008  ██████████   78分
③ server-020  █████████    72分
```

---

## 五、ECharts 全局配置

```js
// 所有图表统一的基础配置
const baseOption = {
  backgroundColor: 'transparent',
  textStyle: { color: '#8892b0', fontSize: 12 },
  grid: { top: 30, right: 20, bottom: 25, left: 45 },
  legend: {
    textStyle: { color: '#8892b0' },
    icon: 'roundRect',
    itemWidth: 10,
    itemHeight: 6,
  },
  tooltip: {
    backgroundColor: 'rgba(17,22,64,0.95)',
    borderColor: '#00d4ff',
    textStyle: { color: '#e0e6f0' },
  },
  xAxis: {
    axisLine: { lineStyle: { color: '#1e2a5a' } },
    axisTick: { show: false },
    splitLine: { show: false },
  },
  yAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: 'rgba(30,42,90,0.4)' } },
  },
};
```

---

## 六、动画

| 元素 | 动画 | 时长 |
|------|------|------|
| 统计卡片数字 | `countUp` 递增效果（JS 实现） | 1s |
| 统计卡片进场 | `fadeInUp` CSS 动画 | 0.5s |
| 告警列表 | 每 3s 上滚一行 | 循环 |
| 顶部时间 | 每秒跳动 | 连续 |
| 面板边框 | hover 时发光（仅调试模式） | 0.3s |

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 告警闪烁点 */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.3; }
}
.dot-critical { animation: blink 1s infinite; }
```

---

## 七、移动端适配

以 375px 为基准，布局变为单列：

```css
@media (max-width: 768px) {
  .grid-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    padding: 8px;
  }
  .header { grid-row: 1; }
  .left-col, .center-col, .right-col { grid-column: 1; }
  .stat-value { font-size: 24px; }
  .panel-title { font-size: 14px; }
}
```

---

## 八、设计检查清单

- [ ] 背景深色，无白色漏光
- [ ] 所有面板统一 `#111640` 底色 + `#1e2a5a` 描边
- [ ] 图表网格线为 `rgba(30,42,90,0.4)`，不抢眼
- [ ] 文字层级：主色 `#e0e6f0` / 辅色 `#8892b0`
- [ ] 统计数字用等宽数字字体
- [ ] 严重告警用 `#ff4757`，警告用 `#ffb820`
- [ ] 左上角标题渐变发光
