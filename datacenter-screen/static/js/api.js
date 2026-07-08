/**
 * api.js — 数据接口层
 */

const API = (url) => fetch(url).then(r => r.json());

const ENDPOINTS = [
  '/api/stats',
  '/api/room-health',
  '/api/host-risk',
  '/api/disk-top',
  '/api/cpu-trend',
  '/api/load-trend',
  '/api/disk-io',
  '/api/memory-top',
  '/api/network',
  '/api/alerts',
];

async function fetchAll() {
  const results = await Promise.all(ENDPOINTS.map(API));
  return {
    stats:      results[0],
    roomHealth: results[1],
    hostRisk:   results[2],
    diskTop:    results[3],
    cpuTrend:   results[4],
    loadTrend:  results[5],
    diskIO:     results[6],
    memoryTop:  results[7],
    network:    results[8],
    alerts:     results[9],
  };
}
