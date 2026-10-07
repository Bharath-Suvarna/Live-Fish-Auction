import subprocess
import json

def get_metric(namespace, metric_name, dimensions, stat="Sum"):
    cmd = [
        "aws", "cloudwatch", "get-metric-statistics",
        "--namespace", namespace,
        "--metric-name", metric_name,
        "--dimensions", dimensions,
        "--start-time", "2026-10-07T05:25:00Z",
        "--end-time", "2026-10-07T06:10:00Z",
        "--period", "60",
        "--statistics", stat,
        "--region", "ap-south-1"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        try:
            data = json.loads(res.stdout)
            points = data.get("Datapoints", [])
            points = sorted(points, key=lambda x: x["Timestamp"])
            return points
        except Exception as e:
            return []
    return []

print("--- AWS LAMBDA METRICS (malpe-auction-serverless-prod-api) ---")
dim_lambda = "Name=FunctionName,Value=malpe-auction-serverless-prod-api"
invocations = get_metric("AWS/Lambda", "Invocations", dim_lambda, "Sum")
errors = get_metric("AWS/Lambda", "Errors", dim_lambda, "Sum")
throttles = get_metric("AWS/Lambda", "Throttles", dim_lambda, "Sum")
concurrent = get_metric("AWS/Lambda", "ConcurrentExecutions", dim_lambda, "Maximum")
duration_avg = get_metric("AWS/Lambda", "Duration", dim_lambda, "Average")

print(f"Invocations Datapoints ({len(invocations)}):")
for p in invocations:
    print(f"  {p['Timestamp']} | Sum: {p['Sum']}")

print(f"\nErrors Datapoints ({len(errors)}):")
for p in errors:
    print(f"  {p['Timestamp']} | Sum: {p['Sum']}")

print(f"\nThrottles Datapoints ({len(throttles)}):")
for p in throttles:
    print(f"  {p['Timestamp']} | Sum: {p['Sum']}")

print(f"\nConcurrentExecutions Max Datapoints ({len(concurrent)}):")
for p in concurrent:
    print(f"  {p['Timestamp']} | Max: {p['Maximum']}")

print(f"\nDuration Avg Datapoints ({len(duration_avg)}):")
for p in duration_avg:
    print(f"  {p['Timestamp']} | Avg: {p['Average']:.2f} ms")

print("\n--- API GATEWAY METRICS ---")
dim_apigw = "Name=ApiName,Value=malpe-auction-serverless-prod"
apigw_5xx = get_metric("AWS/ApiGateway", "5XXError", dim_apigw, "Sum")
apigw_4xx = get_metric("AWS/ApiGateway", "4XXError", dim_apigw, "Sum")
apigw_latency = get_metric("AWS/ApiGateway", "Latency", dim_apigw, "Average")
apigw_int_lat = get_metric("AWS/ApiGateway", "IntegrationLatency", dim_apigw, "Average")

print(f"API Gateway 5XX Errors ({len(apigw_5xx)}):")
for p in apigw_5xx:
    print(f"  {p['Timestamp']} | Sum: {p['Sum']}")

print(f"API Gateway 4XX Errors ({len(apigw_4xx)}):")
for p in apigw_4xx:
    print(f"  {p['Timestamp']} | Sum: {p['Sum']}")

print(f"API Gateway Latency Avg ({len(apigw_latency)}):")
for p in apigw_latency:
    print(f"  {p['Timestamp']} | Avg: {p['Average']:.2f} ms")

print(f"API Gateway Integration Latency Avg ({len(apigw_int_lat)}):")
for p in apigw_int_lat:
    print(f"  {p['Timestamp']} | Avg: {p['Average']:.2f} ms")
