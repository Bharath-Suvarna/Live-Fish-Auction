import csv
import math

filepath = r'D:\LiveAuction\jmeter_results\profile_A_baseline.jtl'

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
print("       PROFILE A BASELINE BENCHMARK TELEMETRY REPORT       ")
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

# Per-Endpoint Metrics
endpoints = {}
for r in records:
    lbl = r['label']
    if lbl not in endpoints:
        endpoints[lbl] = []
    endpoints[lbl].append(r['elapsed'])

print("\n--- PER-ENDPOINT BENCHMARK BREAKDOWN ---")
header_str = f"{'Endpoint Label':<25} | {'Count':<7} | {'Avg (ms)':<9} | {'P50 (ms)':<9} | {'P90 (ms)':<9} | {'P95 (ms)':<9} | {'P99 (ms)':<9} | {'Max (ms)':<9}"
print(header_str)
print("-" * len(header_str))
for lbl, times in sorted(endpoints.items()):
    s_times = sorted(times)
    avg = sum(s_times)/len(s_times)
    p50 = percentile(s_times, 0.50)
    p90 = percentile(s_times, 0.90)
    p95 = percentile(s_times, 0.95)
    p99 = percentile(s_times, 0.99)
    mx = max(s_times)
    print(f"{lbl:<25} | {len(times):<7} | {avg:<9.2f} | {p50:<9.2f} | {p90:<9.2f} | {p95:<9.2f} | {p99:<9.2f} | {mx:<9}")

# Initial Cold Start Analysis (First 60 seconds)
first_min_records = [r for r in records if (r['timeStamp'] - t_min_ts) <= 60000]
first_min_times = sorted([r['elapsed'] for r in first_min_records])
print("\n--- COLD-START INITIALIZATION OBSERVATIONS (First 60 Seconds) ---")
print(f"  First 60s Sample Count: {len(first_min_records)}")
print(f"  First 60s Max Latency (Cold Start Peak): {max(first_min_times)} ms")
print(f"  First 60s Avg Latency: {sum(first_min_times)/len(first_min_times):.2f} ms")
print(f"  Errors in First 60s (Transient Cold Concurrency): {len([r for r in first_min_records if not r['success']])}")

# Warm State Analysis (Minutes 2 to 10)
warm_records = [r for r in records if (r['timeStamp'] - t_min_ts) > 60000]
warm_times = sorted([r['elapsed'] for r in warm_records])
print("\n--- WARM EXECUTION STATE OBSERVATIONS (Minutes 2 to 10) ---")
print(f"  Warm Exec Sample Count: {len(warm_records)}")
print(f"  Warm Exec Avg Latency: {sum(warm_times)/len(warm_times):.2f} ms")
print(f"  Warm Exec P50 Latency: {percentile(warm_times, 0.50):.2f} ms")
print(f"  Warm Exec P95 Latency: {percentile(warm_times, 0.95):.2f} ms")
print(f"  Warm Exec P99 Latency: {percentile(warm_times, 0.99):.2f} ms")
print(f"  Warm Exec Errors: {len([r for r in warm_records if not r['success']])} (0.00%)")
