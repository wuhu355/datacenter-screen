/**
 * charts.js — ECharts 共享配置 + 所有图表渲染函数
 */

/* ---- 共享配置 ---- */
const baseGrid = { top: 30, right: 18, bottom: 28, left: 50 };
const baseTooltip = {
  backgroundColor: 'rgba(17,22,64,0.95)',
  borderColor: '#00d4ff',
  textStyle: { color: '#e0e6f0', fontSize: 12 }
};
const C = ['#00d4ff','#00ff88','#ffb820','#ff4757','#bd6eff','#00e5ff','#69f0ae'];

/* ---- 图表实例缓存 ---- */
const G = {};

/** 创建/重建图表实例 */
function initChart(id) {
  const el = document.getElementById(id);
  if (!el || el.offsetWidth === 0) return null;
  if (G[id]) G[id].dispose();
  G[id] = echarts.init(el);
  return G[id];
}

/* ========== 渲染函数 ========== */

/** 1. 统计卡片 */
function renderStats(data) {
  document.getElementById('stat-hosts').textContent    = data.total_hosts;
  document.getElementById('stat-online').textContent   = data.online_hosts;
  document.getElementById('stat-mods').textContent     = data.total_mods;
  document.getElementById('stat-alerts').textContent   = data.total_alerts;
  document.getElementById('stat-resolved').textContent = data.resolved;
  document.getElementById('stat-health').textContent   = data.health_score + '%';
}

/** 2. 机房健康度 — 雷达图 */
function renderRoomHealth(data) {
  const chart = initChart('chart-room-health');
  if (!chart) return;
  chart.setOption({
    tooltip: baseTooltip,
    legend: { bottom: 0, textStyle: { color: '#8892b0', fontSize: 10 } },
    radar: {
      center: ['50%', '52%'], radius: '65%',
      indicator: [
        { name: 'CPU', max: 100 },
        { name: '磁盘', max: 100 },
        { name: '内存', max: 100 },
      ],
      axisName: { color: '#8892b0', fontSize: 10 },
      splitArea: { areaStyle: { color: ['rgba(0,212,255,0.02)','rgba(0,212,255,0.02)'] } },
      splitLine: { lineStyle: { color: 'rgba(30,42,90,0.4)' } },
      axisLine:  { lineStyle: { color: 'rgba(30,42,90,0.4)' } },
    },
    series: [{
      type: 'radar',
      data: data.map(r => ({
        name: r.room,
        value: [r.cpu_score, r.disk_score, r.mem_score],
      })),
      symbol: 'circle', symbolSize: 3,
      lineStyle: { width: 1.5 },
      areaStyle: { opacity: 0.1 },
    }],
    color: C,
  });
}

/** 3. 主机风险 TOP5 */
function renderHostRisk(data) {
  const list = document.getElementById('risk-list');
  const rankClass = ['r1','r2','r3','r4','r5'];
  list.innerHTML = data.map((h, i) => `
    <li class="risk-item">
      <span class="risk-rank ${rankClass[i]}">${i + 1}</span>
      <span class="risk-name" title="${h.hostname}">${h.hostname}</span>
      <span class="risk-bar"><span class="risk-bar-fill" style="width:${Math.min(h.risk_score, 100)}%;background:${C[i]}"></span></span>
      <span class="risk-score">${h.risk_score}</span>
    </li>
  `).join('');
}

/** 4. 磁盘使用率 TOP5 — 水平柱状图 */
function renderDiskTop(data) {
  const chart = initChart('chart-disk-top');
  if (!chart) return;
  chart.setOption({
    tooltip: baseTooltip,
    grid: { ...baseGrid, left: 100 },
    xAxis: { type: 'value', name: '%', axisLabel: { color: '#8892b0', fontSize: 10 },
             splitLine: { lineStyle: { color: 'rgba(30,42,90,0.3)' } } },
    yAxis: { type: 'category', inverse: true,
             data: data.map(r => r.hostname.split('.')[0]).reverse(),
             axisLabel: { color: '#e0e6f0', fontSize: 11 },
             axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar',
      data: data.map(r => r.avg_util).reverse(),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#00d4ff' }, { offset: 1, color: '#00ff88' }
        ]),
        borderRadius: [0, 3, 3, 0],
      },
      barWidth: 14,
      label: { show: true, position: 'right', color: '#8892b0', fontSize: 10,
               formatter: p => p.value + '%' },
    }],
  });
}

/** 5. CPU 趋势 — 折线图 */
function renderCPUTrend(data) {
  const chart = initChart('chart-cpu-trend');
  if (!chart) return;
  chart.setOption({
    tooltip: { ...baseTooltip, trigger: 'axis' },
    legend: { top: 0, textStyle: { color: '#8892b0', fontSize: 10 },
              itemWidth: 12, itemHeight: 6, data: ['user','sys','wait','idle','usage'] },
    grid: { ...baseGrid, top: 40 },
    xAxis: { type: 'category', data: data.map(r => r.hour),
             axisLabel: { color: '#8892b0', fontSize: 9, interval: 23 },
             axisLine: { lineStyle: { color: '#1e2a5a' } } },
    yAxis: { type: 'value', name: '%', axisLabel: { color: '#8892b0', fontSize: 10 },
             splitLine: { lineStyle: { color: 'rgba(30,42,90,0.3)' } } },
    series: [
      { name: 'user',  type: 'line', data: data.map(r => r.cpu_user),  smooth: true, symbol: 'none', lineStyle: { width: 1 } },
      { name: 'sys',   type: 'line', data: data.map(r => r.cpu_sys),   smooth: true, symbol: 'none', lineStyle: { width: 1 } },
      { name: 'wait',  type: 'line', data: data.map(r => r.cpu_wait),  smooth: true, symbol: 'none', lineStyle: { width: 1 } },
      { name: 'idle',  type: 'line', data: data.map(r => r.cpu_idle),  smooth: true, symbol: 'none', lineStyle: { width: 1 } },
      { name: 'usage', type: 'line', data: data.map(r => r.cpu_usage), smooth: true, symbol: 'none', lineStyle: { width: 2 } },
    ],
    color: C,
  });
}

/** 6. 负载趋势 — 面积图 */
function renderLoadTrend(data) {
  const chart = initChart('chart-load-trend');
  if (!chart) return;
  chart.setOption({
    tooltip: { ...baseTooltip, trigger: 'axis' },
    legend: { top: 0, textStyle: { color: '#8892b0', fontSize: 10 }, itemWidth: 12, itemHeight: 6 },
    grid: { ...baseGrid, top: 40 },
    xAxis: { type: 'category', data: data.map(r => r.hour),
             axisLabel: { color: '#8892b0', fontSize: 9, interval: 23 },
             axisLine: { lineStyle: { color: '#1e2a5a' } } },
    yAxis: { type: 'value', axisLabel: { color: '#8892b0', fontSize: 10 },
             splitLine: { lineStyle: { color: 'rgba(30,42,90,0.3)' } } },
    series: ['load1','load5','load15'].map((k, i) => ({
      name: k, type: 'line', data: data.map(r => r[k]),
      smooth: true, symbol: 'none', lineStyle: { width: 1.5 },
      areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1, [
        { offset: 0, color: C[i] + '44' }, { offset: 1, color: C[i] + '04' }
      ])},
    })),
    color: C,
  });
}

/** 7. 磁盘读写 TOP5 — 堆叠柱状图 */
function renderDiskIO(data) {
  const chart = initChart('chart-disk-io');
  if (!chart) return;
  chart.setOption({
    tooltip: { ...baseTooltip, trigger: 'axis' },
    legend: { top: 0, textStyle: { color: '#8892b0', fontSize: 10 }, itemWidth: 12, itemHeight: 6 },
    grid: { ...baseGrid, top: 40 },
    xAxis: { type: 'category', data: data.map(r => r.hostname.split('.')[0]),
             axisLabel: { color: '#e0e6f0', fontSize: 10 },
             axisLine: { lineStyle: { color: '#1e2a5a' } } },
    yAxis: { type: 'value', name: 'sectors', axisLabel: { color: '#8892b0', fontSize: 10 },
             splitLine: { lineStyle: { color: 'rgba(30,42,90,0.3)' } } },
    series: [
      { name: '读', type: 'bar', stack: 'total', data: data.map(r => r.total_read),
        itemStyle: { color: '#00d4ff', borderRadius: [0,0,0,0] }, barWidth: 24 },
      { name: '写', type: 'bar', stack: 'total', data: data.map(r => r.total_write),
        itemStyle: { color: '#00ff88', borderRadius: [3,3,0,0] } },
    ],
  });
}

/** 8. 内存使用 TOP5 — 水平柱状图 */
function renderMemoryTop(data) {
  const chart = initChart('chart-memory-top');
  if (!chart) return;
  chart.setOption({
    tooltip: { ...baseTooltip, formatter: p => p.name + '<br/>' + p.value + ' MB' },
    grid: { ...baseGrid, left: 100 },
    xAxis: { type: 'value', name: 'MB', axisLabel: { color: '#8892b0', fontSize: 10 },
             splitLine: { lineStyle: { color: 'rgba(30,42,90,0.3)' } } },
    yAxis: { type: 'category', inverse: true,
             data: data.map(r => r.hostname.split('.')[0]).reverse(),
             axisLabel: { color: '#e0e6f0', fontSize: 11 },
             axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar',
      data: data.map(r => r.avg_mem_used).reverse(),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0,0,1,0, [
          { offset: 0, color: '#bd6eff' }, { offset: 1, color: '#00d4ff' }
        ]),
        borderRadius: [0, 3, 3, 0],
      },
      barWidth: 14,
      label: { show: true, position: 'right', color: '#8892b0', fontSize: 10,
               formatter: p => (p.value/1024).toFixed(1) + 'G' },
    }],
  });
}

/** 9. 网络流量 — 双 Y 轴折线图 */
function renderNetwork(data) {
  const chart = initChart('chart-network');
  if (!chart) return;
  chart.setOption({
    tooltip: { ...baseTooltip, trigger: 'axis' },
    legend: { top: 0, textStyle: { color: '#8892b0', fontSize: 10 }, itemWidth: 12, itemHeight: 6 },
    grid: { ...baseGrid, top: 40 },
    xAxis: { type: 'category', data: data.map(r => r.hour),
             axisLabel: { color: '#8892b0', fontSize: 9, interval: 23 },
             axisLine: { lineStyle: { color: '#1e2a5a' } } },
    yAxis: [
      { type: 'value', name: 'MB/s', axisLabel: { color: '#8892b0', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(30,42,90,0.3)' } } },
      { type: 'value', name: 'MB/s', axisLabel: { color: '#8892b0', fontSize: 10 } },
    ],
    series: [
      { name: '入站', type: 'line', data: data.map(r => r.net_in),  smooth: true, symbol: 'none', lineStyle: { width: 1.5 } },
      { name: '出站', type: 'line', data: data.map(r => r.net_out), smooth: true, symbol: 'none', lineStyle: { width: 1.5 }, yAxisIndex: 1 },
    ],
    color: ['#00d4ff', '#ffb820'],
  });
}

/** 10. 告警列表 */
function renderAlerts(data) {
  const list = document.getElementById('alert-list');
  const levelClass = { '严重': 'critical', '警告': 'warning', '已处理': 'resolved' };
  const now = new Date();
  list.innerHTML = data.slice(0, 8).map((a, i) => `
    <li class="alert-item" style="animation-delay:${i*0.1}s">
      <span class="alert-dot ${levelClass[a.level] || 'warning'}"></span>
      <span class="alert-msg">[${a.type}] ${a.hostname}: ${a.message}</span>
      <span class="alert-time">${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()-i).padStart(2,'0')}</span>
    </li>
  `).join('');
}
