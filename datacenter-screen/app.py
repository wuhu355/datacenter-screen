"""
datacenter-screen — Flask 后端 API
数据来源：MySQL 8.0 Docker 容器 monitor 库
"""
from flask import Flask, jsonify, render_template
import pymysql
from decimal import Decimal

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '123456',
    'database': 'monitor',
    'charset': 'utf8mb4',
}


def query(sql):
    """执行 SQL，返回字典列表（Decimal → float）"""
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cur:
            cur.execute(sql)
            rows = cur.fetchall()
            # 将 Decimal 转为 float，否则 jsonify 报错
            for r in rows:
                for k, v in r.items():
                    if isinstance(v, Decimal):
                        r[k] = float(v)
            return rows
    finally:
        conn.close()


# ============================================================
# 页面路由
# ============================================================

@app.route('/')
def index():
    return render_template('index.html')


# ============================================================
# API 路由 — 10 个接口
# ============================================================

# 1. 基础统计卡片
@app.route('/api/stats')
def api_stats():
    total_hosts = query("SELECT COUNT(*) AS n FROM host_detail")[0]['n']
    total_mods  = query("SELECT COUNT(*) AS n FROM mod_detail")[0]['n']

    # 告警数（基于阈值扫描）
    cpu_alerts = query("""
        SELECT COUNT(DISTINCT hostid) AS n
        FROM pref_tsar WHERE `mod`='cpu_usage' AND `value` > 70
    """)[0]['n']
    disk_alerts = query("""
        SELECT COUNT(DISTINCT hostid) AS n
        FROM disk_tsar WHERE `mod` LIKE '%_util' AND `value` > 80
    """)[0]['n']
    mem_alerts = query("""
        SELECT COUNT(DISTINCT hostid) AS n
        FROM pref_tsar WHERE `mod`='mem_used' AND `value` > 75000
    """)[0]['n']
    total_alerts = cpu_alerts + disk_alerts + mem_alerts

    # 整体健康度：所有 CPU 不超 70 的主机占比 × 所有磁盘不超 80 的主机占比
    cpu_healthy = query("""
        SELECT COUNT(DISTINCT hostid) AS n FROM pref_tsar
        WHERE `mod`='cpu_usage'
    """)[0]['n']
    cpu_ok = query("""
        SELECT COUNT(DISTINCT hostid) AS n FROM pref_tsar
        WHERE `mod`='cpu_usage' AND `value` <= 70
    """)[0]['n']
    disk_total = query("""
        SELECT COUNT(DISTINCT hostid) AS n FROM disk_tsar
        WHERE `mod` LIKE '%_util'
    """)[0]['n']
    disk_ok = query("""
        SELECT COUNT(DISTINCT hostid) AS n FROM disk_tsar
        WHERE `mod` LIKE '%_util' AND `value` <= 80
    """)[0]['n']

    health = round(((cpu_ok / cpu_healthy) * 0.5 + (disk_ok / disk_total) * 0.5) * 100, 1)

    return jsonify({
        'total_hosts':   total_hosts,
        'online_hosts':  total_hosts,          # 模拟全部在线
        'total_mods':    total_mods,
        'total_alerts':  total_alerts,
        'resolved':      1,                    # 模拟 1 条已处理
        'health_score':  health,
    })


# 2. 机房健康度（雷达图）
@app.route('/api/room-health')
def api_room_health():
    rows = query("""
        SELECT h.location1 AS room,
               ROUND(AVG(CASE WHEN p.`mod`='cpu_usage' THEN p.`value` END), 2) AS avg_cpu,
               ROUND(AVG(CASE WHEN p.`mod`='mem_used' THEN p.`value` END), 2) AS avg_mem,
               COUNT(DISTINCT h.hostid) AS host_cnt
        FROM host_detail h
        LEFT JOIN pref_tsar p ON h.hostid = p.hostid
        GROUP BY h.location1
    """)

    # 磁盘数据单独查（不同表）
    disk_rows = query("""
        SELECT h.location1 AS room,
               ROUND(AVG(d.`value`), 2) AS avg_disk
        FROM host_detail h
        JOIN disk_tsar d ON h.hostid = d.hostid
        WHERE d.`mod` LIKE '%_util'
        GROUP BY h.location1
    """)
    disk_map = {r['room']: r['avg_disk'] for r in disk_rows}

    # 健康评分：CPU 和磁盘越低越好，映射到 0~100
    result = []
    for r in rows:
        room = r['room']
        cpu = r['avg_cpu'] or 50
        disk = disk_map.get(room, 50)
        mem = r['avg_mem'] or 65000
        cpu_score  = round(max(0, 100 - cpu), 1)           # CPU 越低分越高
        disk_score = round(max(0, 100 - disk * 1.2), 1)    # 磁盘越低分越高
        mem_score  = round(max(0, 100 - mem / 1000), 1)    # 内存越低分越高
        overall    = round((cpu_score + disk_score + mem_score) / 3, 1)
        result.append({
            'room': room, 'host_cnt': r['host_cnt'],
            'cpu_score': cpu_score, 'disk_score': disk_score,
            'mem_score': mem_score, 'overall': overall,
        })
    return jsonify(result)


# 3. 主机风险排名 TOP5
@app.route('/api/host-risk')
def api_host_risk():
    cpu_rows = query("""
        SELECT hostid, ROUND(AVG(`value`), 2) AS avg_cpu
        FROM pref_tsar WHERE `mod`='cpu_usage'
        GROUP BY hostid
    """)
    disk_rows = query("""
        SELECT hostid, ROUND(AVG(`value`), 2) AS avg_disk
        FROM disk_tsar WHERE `mod` LIKE '%_util'
        GROUP BY hostid
    """)
    mem_rows = query("""
        SELECT hostid, ROUND(AVG(`value`), 2) AS avg_mem
        FROM pref_tsar WHERE `mod`='mem_used'
        GROUP BY hostid
    """)
    host_info = query("""
        SELECT hostid, hostname, model, location1 FROM host_detail
    """)

    cpu_map  = {r['hostid']: r['avg_cpu']  for r in cpu_rows}
    disk_map = {r['hostid']: r['avg_disk'] for r in disk_rows}
    mem_map  = {r['hostid']: r['avg_mem']  for r in mem_rows}

    risks = []
    for h in host_info:
        hid = h['hostid']
        cpu  = cpu_map.get(hid, 50)
        disk = disk_map.get(hid, 50)
        mem  = mem_map.get(hid, 65000)
        # 加权风险分：CPU 权重 0.4，磁盘 0.35，内存 0.25
        score = round(cpu * 0.4 + disk * 0.35 + (mem / 1000) * 0.25, 1)
        risks.append({
            'hostid': hid, 'hostname': h['hostname'],
            'model': h['model'], 'room': h['location1'],
            'risk_score': score, 'avg_cpu': cpu,
            'avg_disk': disk, 'avg_mem': mem,
        })

    risks.sort(key=lambda x: x['risk_score'], reverse=True)
    return jsonify(risks[:5])


# 4. 磁盘使用率 TOP5
@app.route('/api/disk-top')
def api_disk_top():
    rows = query("""
        SELECT d.hostid, h.hostname,
               ROUND(AVG(d.`value`), 2) AS avg_util
        FROM disk_tsar d
        JOIN host_detail h ON d.hostid = h.hostid
        WHERE d.`mod` LIKE '%_util'
        GROUP BY d.hostid, h.hostname
        ORDER BY avg_util DESC LIMIT 5
    """)
    return jsonify(rows)


# 5. CPU 使用率趋势（7 天 × 24 小时）
@app.route('/api/cpu-trend')
def api_cpu_trend():
    rows = query("""
        SELECT FROM_UNIXTIME(ts/1000, '%m-%d %H:00') AS hour,
               ROUND(AVG(CASE WHEN `mod`='cpu_user'  THEN `value` END), 2) AS cpu_user,
               ROUND(AVG(CASE WHEN `mod`='cpu_sys'   THEN `value` END), 2) AS cpu_sys,
               ROUND(AVG(CASE WHEN `mod`='cpu_wait'  THEN `value` END), 2) AS cpu_wait,
               ROUND(AVG(CASE WHEN `mod`='cpu_idle'  THEN `value` END), 2) AS cpu_idle,
               ROUND(AVG(CASE WHEN `mod`='cpu_usage' THEN `value` END), 2) AS cpu_usage
        FROM pref_tsar
        WHERE `mod` IN ('cpu_user','cpu_sys','cpu_wait','cpu_idle','cpu_usage')
        GROUP BY hour
        ORDER BY hour
    """)
    return jsonify(rows)


# 6. 系统负载趋势
@app.route('/api/load-trend')
def api_load_trend():
    rows = query("""
        SELECT FROM_UNIXTIME(ts/1000, '%m-%d %H:00') AS hour,
               ROUND(AVG(CASE WHEN `mod`='load1'  THEN `value` END), 2) AS load1,
               ROUND(AVG(CASE WHEN `mod`='load5'  THEN `value` END), 2) AS load5,
               ROUND(AVG(CASE WHEN `mod`='load15' THEN `value` END), 2) AS load15
        FROM pref_tsar
        WHERE `mod` IN ('load1','load5','load15')
        GROUP BY hour
        ORDER BY hour
    """)
    return jsonify(rows)


# 7. 磁盘读写 TOP5
@app.route('/api/disk-io')
def api_disk_io():
    rows = query("""
        SELECT d.hostid, h.hostname,
               ROUND(SUM(CASE WHEN d.`mod` LIKE '%_read'  THEN d.`value` ELSE 0 END), 0) AS total_read,
               ROUND(SUM(CASE WHEN d.`mod` LIKE '%_write' THEN d.`value` ELSE 0 END), 0) AS total_write
        FROM disk_tsar d
        JOIN host_detail h ON d.hostid = h.hostid
        GROUP BY d.hostid, h.hostname
        ORDER BY (total_read + total_write) DESC
        LIMIT 5
    """)
    return jsonify(rows)


# 8. 内存使用 TOP5
@app.route('/api/memory-top')
def api_memory_top():
    rows = query("""
        SELECT h.hostname,
               ROUND(AVG(p.`value`), 2) AS avg_mem_used
        FROM pref_tsar p
        JOIN host_detail h ON p.hostid = h.hostid
        WHERE p.`mod` = 'mem_used'
        GROUP BY p.hostid, h.hostname
        ORDER BY avg_mem_used DESC
        LIMIT 5
    """)
    return jsonify(rows)


# 9. 网络流量趋势
@app.route('/api/network')
def api_network():
    rows = query("""
        SELECT FROM_UNIXTIME(ts/1000, '%m-%d %H:00') AS hour,
               ROUND(AVG(CASE WHEN `mod`='net_in'  THEN `value` END), 2) AS net_in,
               ROUND(AVG(CASE WHEN `mod`='net_out' THEN `value` END), 2) AS net_out
        FROM pref_tsar
        WHERE `mod` IN ('net_in','net_out')
        GROUP BY hour
        ORDER BY hour
    """)
    return jsonify(rows)


# 10. 告警列表
@app.route('/api/alerts')
def api_alerts():
    alerts = []

    # CPU 告警
    cpu = query("""
        SELECT p.hostid, h.hostname, ROUND(MAX(p.`value`), 2) AS max_val
        FROM pref_tsar p
        JOIN host_detail h ON p.hostid = h.hostid
        WHERE p.`mod` = 'cpu_usage' AND p.`value` > 70
        GROUP BY p.hostid, h.hostname
    """)
    for r in cpu:
        alerts.append({
            'level': '严重', 'hostname': r['hostname'],
            'type': 'CPU', 'value': r['max_val'], 'unit': '%',
            'message': f"CPU 使用率达 {r['max_val']}%",
            'status': 'triggered',
        })

    # 磁盘告警
    disk = query("""
        SELECT d.hostid, h.hostname, d.`mod`,
               ROUND(MAX(d.`value`), 2) AS max_val
        FROM disk_tsar d
        JOIN host_detail h ON d.hostid = h.hostid
        WHERE d.`mod` LIKE '%_util' AND d.`value` > 80
        GROUP BY d.hostid, h.hostname, d.`mod`
    """)
    for r in disk:
        level = '严重' if r['max_val'] > 95 else '警告'
        alerts.append({
            'level': level, 'hostname': r['hostname'],
            'type': '磁盘', 'value': r['max_val'], 'unit': '%',
            'module': r['mod'],
            'message': f"{r['mod']} 使用率 {r['max_val']}%",
            'status': 'triggered',
        })

    # 内存告警
    mem = query("""
        SELECT p.hostid, h.hostname, ROUND(MAX(p.`value`), 2) AS max_val
        FROM pref_tsar p
        JOIN host_detail h ON p.hostid = h.hostid
        WHERE p.`mod` = 'mem_used' AND p.`value` > 75000
        GROUP BY p.hostid, h.hostname
    """)
    for r in mem:
        alerts.append({
            'level': '警告', 'hostname': r['hostname'],
            'type': '内存', 'value': r['max_val'], 'unit': 'MB',
            'message': f"内存使用 {r['max_val']} MB",
            'status': 'triggered',
        })

    # 按严重度排序：严重在前
    alerts.sort(key=lambda x: (0 if x['level'] == '严重' else 1, -x['value']))

    # 模拟：第一条改为"已处理"
    if alerts:
        alerts[0]['status'] = 'resolved'

    return jsonify(alerts)


# ============================================================
# 启动
# ============================================================

if __name__ == '__main__':
    print('datacenter-screen API -> http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
