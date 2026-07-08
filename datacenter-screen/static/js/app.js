/**
 * app.js — 主入口：时钟 + 数据加载 + 刷新
 */

/* 实时时钟 */
function tick() {
  const now = new Date();
  document.getElementById('live-time').textContent =
    now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
}

/* 数据加载 + 渲染 */
async function loadAll() {
  try {
    const d = await fetchAll();
    renderStats(d.stats);
    renderRoomHealth(d.roomHealth);
    renderHostRisk(d.hostRisk);
    renderDiskTop(d.diskTop);
    renderCPUTrend(d.cpuTrend);
    renderLoadTrend(d.loadTrend);
    renderDiskIO(d.diskIO);
    renderMemoryTop(d.memoryTop);
    renderNetwork(d.network);
    renderAlerts(d.alerts);
  } catch (e) {
    console.error('数据加载失败:', e);
  }
}

/* 启动 */
tick();
setInterval(tick, 1000);
window.addEventListener('load', () => {
  loadAll();
  setInterval(loadAll, 10000);
});
