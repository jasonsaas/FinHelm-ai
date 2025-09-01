# QuickBooks Online API Rate Limiting & Throttling Guide

## Rate Limit Overview

The QuickBooks Online API implements comprehensive rate limiting to ensure system stability and fair usage across all consumers.

## Core Rate Limits

### Standard Endpoints
- **500 requests per minute** per realm ID (company)
- **Maximum 10 concurrent requests** per realm ID per application
- Rate limits apply to individual company (realm ID) and application combinations

### Batch Operations
- **40 batch requests per minute** per realm ID
- Each batch request can contain multiple operations
- Batch requests count toward the concurrent request limit

### Resource-Intensive Endpoints
- **200 requests per minute** per realm ID for select high-resource APIs
- Applied to computationally expensive operations like complex reports

## Environment Differences

### Production vs Sandbox
- **Identical rate limits** between production and sandbox environments
- **Sandbox restrictions**: 40 emails/day per realm (email functionality testing)
- Changes are deployed to sandbox first for testing before production release

## Rate Limit Headers

### Standard HTTP Headers
Applications should monitor these headers in API responses:

- **X-RateLimit-Limit**: Maximum allowed requests in the time window
- **X-RateLimit-Remaining**: Number of requests remaining in current window  
- **X-RateLimit-Reset**: Timestamp when the rate limit window resets

### Implementation Notes
- Headers provide real-time visibility into rate limit status
- Use headers to implement proactive throttling before hitting limits
- Monitor trends to optimize request timing and batching

## Error Handling

### HTTP 429 Response
When rate limits are exceeded, the API returns:
```
HTTP/1.1 429 Too Many Requests
{
  "message": "ThrottleExceeded",
  "errorCode": "003001", 
  "statusCode": 429
}
```

### Error Response Structure
- **message**: "ThrottleExceeded" indicates rate limit exceeded
- **errorCode**: "003001" is the specific throttling error code
- **statusCode**: 429 follows HTTP standard for rate limit errors

## Throttling Strategies

### 1. Exponential Backoff
Implement exponential backoff when receiving 429 errors:

```python
import time
import random

def exponential_backoff_retry(func, max_retries=5):
    for attempt in range(max_retries):
        try:
            return func()
        except RateLimitError:
            if attempt == max_retries - 1:
                raise
            # Exponential backoff with jitter
            delay = (2 ** attempt) + random.uniform(0, 1)
            time.sleep(delay)
```

### 2. Request Queuing
- Implement request queuing during peak usage periods
- Use queue management to stay under rate limits
- Prioritize critical operations during high-demand periods

### 3. Batch Operations
- Group related operations into batch requests
- Use batch endpoints to reduce total API calls
- Remember: 40 batch requests per minute limit

## Best Practices for Rate Limit Management

### Request Management
1. **Single-threaded calls**: Make single-threaded API calls to the same realm ID
2. **Avoid multi-threading**: Unless absolutely necessary, avoid concurrent requests
3. **Maximum 10 concurrent**: Never exceed 10 simultaneous requests per realm ID
4. **Use request IDs**: Include requestId with all API calls for idempotency

### Timing Strategies
1. **Add delays**: Implement delays between requests to stay under 500/minute
2. **Spread requests**: Distribute API calls evenly across the time window
3. **Monitor usage**: Track request frequency in real-time
4. **Peak hour planning**: Reduce API usage during known high-traffic periods

### Error Recovery
1. **Retry with same requestId**: Safe to retry 429 errors with same request ID
2. **Implement jitter**: Add randomization to backoff delays
3. **Circuit breaker**: Implement circuit breaker pattern for repeated failures
4. **Graceful degradation**: Design fallback behavior when rate limits are hit

## Advanced Throttling Techniques

### Jitter Implementation
Prevent "thundering herd" problem where multiple clients retry simultaneously:

```python
import random

def jittered_backoff(base_delay, max_jitter=0.1):
    jitter = random.uniform(0, max_jitter)
    return base_delay * (1 + jitter)
```

### Request Scheduling
- Implement request scheduler to distribute load
- Use priority queues for critical vs non-critical operations
- Schedule bulk operations during off-peak hours

### Monitoring and Alerting
- Monitor rate limit usage patterns
- Set up alerts before reaching 80% of rate limits
- Track 429 error frequency and patterns
- Implement dashboard for real-time rate limit visibility

## Rate Limit Calculation Examples

### Standard Requests
- 500 requests/minute = ~8.33 requests/second maximum
- Safe rate: 6-7 requests/second with buffer for spikes
- 10 concurrent maximum means careful thread management required

### Batch Operations  
- 40 batch requests/minute = ~0.67 batch requests/second
- Each batch can contain multiple entities/operations
- More efficient than individual requests for bulk operations

## Common Rate Limiting Scenarios

### Multi-tenant Applications
- Each customer's realm ID has separate rate limits
- Scale requests across multiple companies
- Implement per-tenant rate limit tracking

### High-volume Integrations
- Use batch operations extensively
- Implement intelligent request queuing
- Consider data sync strategies to reduce API calls

### Real-time Applications
- Reserve rate limit capacity for real-time operations
- Use webhooks to reduce polling-based API calls
- Implement cache layers to reduce redundant requests

## Testing Rate Limits

### Sandbox Testing
- Test rate limit scenarios in sandbox environment
- Verify 429 error handling works correctly
- Test exponential backoff and retry logic
- Validate concurrent request limiting

### Load Testing Considerations
- Respect rate limits during load testing
- Test rate limit recovery scenarios
- Verify application behavior under sustained rate limiting
- Document rate limit impact on application performance