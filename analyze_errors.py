import csv
from datetime import datetime, timezone, timedelta
from collections import Counter

filepath = r'D:\LiveAuction\jmeter_results\profile_A_baseline.jtl'
errors = []
all_rows = []
ist_tz = timezone(timedelta(hours=5, minutes=30))

with open(filepath, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        ts_sec = int(row['timeStamp']) / 1000.0
        dt_ist = datetime.fromtimestamp(ts_sec, ist_tz)
        item = {
            'timeStamp': int(row['timeStamp']),
            'dt_ist': dt_ist.strftime('%H:%M:%S.%f')[:-3],
            'elapsed': int(row['elapsed']),
            'label': row['label'],
            'responseCode': row['responseCode'],
            'responseMessage': row['responseMessage'],
            'threadName': row['threadName'],
            'success': row['success'].lower() == 'true'
        }
        all_rows.append(item)
        if not item['success']:
            errors.append(item)

print(f"Total Logged Samples: {len(all_rows)}")
print(f"Total Error Rows: {len(errors)}")

if errors:
    print("\n--- FIRST 20 ERROR SAMPLES ---")
    for e in errors[:20]:
        print(f"{e['dt_ist']} | Elapsed: {e['elapsed']:>5} ms | Code: {e['responseCode']} | Msg: {e['responseMessage']:<25} | Label: {e['label']:<25} | Thread: {e['threadName']}")

    print("\n--- LAST 10 ERROR SAMPLES ---")
    for e in errors[-10:]:
        print(f"{e['dt_ist']} | Elapsed: {e['elapsed']:>5} ms | Code: {e['responseCode']} | Msg: {e['responseMessage']:<25} | Label: {e['label']:<25} | Thread: {e['threadName']}")

    print("\n--- ERROR BREAKDOWN BY ENDPOINT ---")
    ep_counts = Counter(e['label'] for e in errors)
    for ep, cnt in ep_counts.items():
        print(f"  {ep:<30}: {cnt} errors ({cnt/len(errors)*100:.1f}%)")

    first_err_time = min(e['dt_ist'] for e in errors)
    last_err_time = max(e['dt_ist'] for e in errors)
    print(f"\n--- ERROR TIME WINDOW ---")
    print(f"  First Error: {first_err_time}")
    print(f"  Last Error:  {last_err_time}")

# Peak 4664ms request analysis
max_req = max(all_rows, key=lambda x: x['elapsed'])
print("\n--- MAXIMUM LATENCY REQUEST (4,664 ms Peak) ---")
print(f"  Timestamp:    {max_req['dt_ist']}")
print(f"  Endpoint:     {max_req['label']}")
print(f"  Elapsed Time: {max_req['elapsed']} ms")
print(f"  Response:     HTTP {max_req['responseCode']} ({max_req['responseMessage']})")
print(f"  Success:      {max_req['success']}")
print(f"  Thread Name:  {max_req['threadName']}")

# First 20 requests chronologically
chronological = sorted(all_rows, key=lambda x: x['timeStamp'])
print("\n--- FIRST 20 CHRONOLOGICAL REQUESTS AT TEST START ---")
for item in chronological[:20]:
    status_str = "SUCCESS" if item['success'] else "FAILED"
    print(f"{item['dt_ist']} | Status: {status_str:<7} | Code: {item['responseCode']} | Elapsed: {item['elapsed']:>5} ms | Label: {item['label']:<25} | Thread: {item['threadName']}")
