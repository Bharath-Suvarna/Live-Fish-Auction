import csv
import math

filepath = r'D:\LiveAuction\jmeter_results\profile_B_ramp.jtl'

records = []
with open(filepath, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        records.append({
            'timeStamp': int(row['timeStamp']),
            'elapsed': int(row['elapsed']),
            'label': row['label'],
            'responseCode': row['responseCode'],
            'responseMessage': row['responseMessage'],
            'success': row['success'].lower() == 'true'
        })

total_samples = len(records)
success_records = [r for r in records if r['success']]
error_records = [r for r in records if not r['success']]

elapsed_times = sorted([r['elapsed'] for r in records])

def percentile(arr, p):
    if not arr: return 0.0
    k = (len(arr) - 1) * p
    f = math.floor(k)
    c = math.ceil(k)
    if f == c: return float(arr[int(k)])
    return float(arr[int(f)] * (c - k) + arr[int(c)] * (k - f))

t_min_ts = min(r['timeStamp'] for r in records)
t_max_ts = max(r['timeStamp'] for r in records)
duration_s = (t_max_ts - t_min_ts) / 1000.0
throughput = total_samples / duration_s if duration_s > 0 else 0.0

print("==========================================================")
print("       PROFILE B RAMP-UP BENCHMARK TELEMETRY REPORT       ")
print("==========================================================")
print(f"Total Samples: {total_samples}")
print(f"Successful Samples: {len(success_records)}")
print(f"Error Count: {len(error_records)}")
print(f"Error Percentage: {len(error_records)/total_samples*100:.4f}%")
print(f"Total Execution Duration: {duration_s:.2f} seconds ({duration_s/60:.2f} minutes)")
print(f"Overall Throughput: {throughput:.2f} transactions/sec (TPS)")
print(f"Average Response Time: {sum(elapsed_times)/total_samples:.2f} ms")
print(f"Median Response Time (P50): {percentile(elapsed_times, 0.50):.2f} ms")
print(f"p90 Latency: {percentile(elapsed_times, 0.90):.2f} ms")
print(f"p95 Latency: {percentile(elapsed_times, 0.95):.2f} ms")
print(f"p99 Latency: {percentile(elapsed_times, 0.99):.2f} ms")
print(f"Min Response Time: {min(elapsed_times)} ms")
print(f"Max Response Time: {max(elapsed_times)} ms")

# Status codes
status_codes = {}
for r in records:
    code = r['responseCode']
    status_codes[code] = status_codes.get(code, 0) + 1

print("\n--- HTTP STATUS CODE BREAKDOWN ---")
for code, count in sorted(status_codes.items()):
    print(f"  HTTP {code}: {count} ({count/total_samples*100:.2f}%)")

# Error messages
err_msgs = {}
for r in error_records:
    msg = f"{r['responseCode']} - {r['responseMessage']}"
    err_msgs[msg] = err_msgs.get(msg, 0) + 1

print("\n--- ERROR MESSAGE BREAKDOWN ---")
for msg, count in sorted(err_msgs.items(), key=lambda x: x[1], reverse=True):
    print(f"  {msg}: {count} ({count/len(error_records)*100:.2f}% of errors)")

# Per-Endpoint Metrics
endpoints = {}
for r in records:
    lbl = r['label']
    if lbl not in endpoints:
        endpoints[lbl] = {'all': [], 'errs': 0}
    endpoints[lbl]['all'].append(r['elapsed'])
    if not r['success']:
        endpoints[lbl]['errs'] += 1

print("\n--- PER-ENDPOINT BENCHMARK BREAKDOWN ---")
header_str = f"{'Endpoint Label':<25} | {'Count':<8} | {'Errors':<8} | {'Err %':<7} | {'Avg (ms)':<8} | {'P50 (ms)':<8} | {'P95 (ms)':<8} | {'P99 (ms)':<8} | {'Max (ms)':<8}"
print(header_str)
print("-" * len(header_str))
for lbl, data in sorted(endpoints.items()):
    s_times = sorted(data['all'])
    cnt = len(s_times)
    errs = data['errs']
    err_pct = errs / cnt * 100.0
    avg = sum(s_times)/cnt
    p50 = percentile(s_times, 0.50)
    p95 = percentile(s_times, 0.95)
    p99 = percentile(s_times, 0.99)
    mx = max(s_times)
    print(f"{lbl:<25} | {cnt:<8} | {errs:<8} | {err_pct:<7.2f}% | {avg:<8.2f} | {p50:<8.2f} | {p95:<8.2f} | {p99:<8.2f} | {mx:<8}")

# Timeline Analysis (1-minute intervals)
print("\n--- TIMELINE CONCURRENCY RAMP PROGRESSION (1-Min Intervals) ---")
print(f"{'Time Window':<15} | {'Approx VUs':<10} | {'Samples':<8} | {'Success':<8} | {'Errors':<8} | {'Err %':<7} | {'Avg (ms)':<8} | {'P95 (ms)':<8}")
print("-" * 90)

for m in range(10):
    start_ts = t_min_ts + m * 60000
    end_ts = start_ts + 60000
    minute_records = [r for r in records if start_ts <= r['timeStamp'] < end_ts]
    if not minute_records: continue
    
    m_count = len(minute_records)
    m_errs = len([r for r in minute_records if not r['success']])
    m_succ = m_count - m_errs
    m_times = sorted([r['elapsed'] for r in minute_records])
    m_avg = sum(m_times)/m_count
    m_p95 = percentile(m_times, 0.95)
    approx_vus = int((m + 0.5) * 50) # Approx 50 VUs added per minute (10 -> 500 VUs over 10 min)
    
    print(f"Min {m+1:02d} (t={m}m-{(m+1)}m) | ~{approx_vus:<8} VUs | {m_count:<8} | {m_succ:<8} | {m_errs:<8} | {m_errs/m_count*100:<7.2f}% | {m_avg:<8.1f} | {m_p95:<8.1f}")
