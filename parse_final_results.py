import csv
import math
import subprocess
import json

filepath = r'D:\LiveAuction\jmeter_results\FINAL_PROFILE_B\final_profile_b.jtl'

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
attempted_tps = total_samples / duration_s if duration_s > 0 else 0.0
successful_tps = len(success_records) / duration_s if duration_s > 0 else 0.0

print("==========================================================")
print("       FINAL BENCHMARK EXECUTABLE TELEMETRY REPORT        ")
print("==========================================================")
print(f"Total Requests: {total_samples}")
print(f"Successful Requests (HTTP 200): {len(success_records)}")
print(f"Failed Requests (HTTP 500): {len(error_records)}")
print(f"Error Percentage: {len(error_records)/total_samples*100:.4f}%")
print(f"Total Execution Duration: {duration_s:.2f} seconds ({duration_s/60:.2f} minutes)")
print(f"Attempted Throughput: {attempted_tps:.2f} TPS")
print(f"Successful Throughput: {successful_tps:.2f} TPS")
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

# Per-Endpoint Metrics
endpoints = {}
for r in records:
    lbl = r['label']
    if lbl not in endpoints:
        endpoints[lbl] = {'all': [], 'errs': 0, 'succ': 0}
    endpoints[lbl]['all'].append(r['elapsed'])
    if r['success']:
        endpoints[lbl]['succ'] += 1
    else:
        endpoints[lbl]['errs'] += 1

print("\n--- PER-ENDPOINT BENCHMARK BREAKDOWN ---")
header_str = f"{'Endpoint Label':<25} | {'Samples':<8} | {'Success':<8} | {'Errors':<8} | {'Avg (ms)':<8} | {'P50 (ms)':<8} | {'P90 (ms)':<8} | {'P95 (ms)':<8} | {'P99 (ms)':<8} | {'Max (ms)':<8}"
print(header_str)
print("-" * len(header_str))
for lbl, data in sorted(endpoints.items()):
    s_times = sorted(data['all'])
    cnt = len(s_times)
    succ = data['succ']
    errs = data['errs']
    avg = sum(s_times)/cnt
    p50 = percentile(s_times, 0.50)
    p90 = percentile(s_times, 0.90)
    p95 = percentile(s_times, 0.95)
    p99 = percentile(s_times, 0.99)
    mx = max(s_times)
    print(f"{lbl:<25} | {cnt:<8} | {succ:<8} | {errs:<8} | {avg:<8.2f} | {p50:<8.2f} | {p90:<8.2f} | {p95:<8.2f} | {p99:<8.2f} | {mx:<8}")

# Generate clean CSV summary for report inclusion
csv_summary_path = r'D:\LiveAuction\jmeter_results\FINAL_PROFILE_B\final_summary.csv'
with open(csv_summary_path, 'w', newline='', encoding='utf-8') as f_csv:
    writer = csv.writer(f_csv)
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Total Requests", total_samples])
    writer.writerow(["Successful Requests", len(success_records)])
    writer.writerow(["Failed Requests", len(error_records)])
    writer.writerow(["Error Rate (%)", f"{len(error_records)/total_samples*100:.4f}%"])
    writer.writerow(["Duration (sec)", f"{duration_s:.2f}"])
    writer.writerow(["Attempted Throughput (TPS)", f"{attempted_tps:.2f}"])
    writer.writerow(["Successful Throughput (TPS)", f"{successful_tps:.2f}"])
    writer.writerow(["Average Latency (ms)", f"{sum(elapsed_times)/total_samples:.2f}"])
    writer.writerow(["P50 Latency (ms)", f"{percentile(elapsed_times, 0.50):.2f}"])
    writer.writerow(["P90 Latency (ms)", f"{percentile(elapsed_times, 0.90):.2f}"])
    writer.writerow(["P95 Latency (ms)", f"{percentile(elapsed_times, 0.95):.2f}"])
    writer.writerow(["P99 Latency (ms)", f"{percentile(elapsed_times, 0.99):.2f}"])
    writer.writerow(["Min Latency (ms)", min(elapsed_times)])
    writer.writerow(["Max Latency (ms)", max(elapsed_times)])
print(f"\nSummary CSV saved to: {csv_summary_path}")
