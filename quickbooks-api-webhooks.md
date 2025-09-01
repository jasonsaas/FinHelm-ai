# QuickBooks Online API Webhooks - Complete Guide

## Overview

QuickBooks webhooks are automated messages sent from QuickBooks to your application when specific events occur in the accounting system. Unlike traditional APIs that require polling, webhooks provide real-time notifications when data changes, enabling immediate responses to business events.

## Supported Entities

### Core Business Entities
- **Account** - Chart of accounts changes
- **Bill** - Accounts payable transactions  
- **Customer** - Customer master data
- **Invoice** - Sales transactions
- **Item** - Products and services
- **Payment** - Payment transactions
- **Vendor** - Supplier master data

### Transaction Entities
- **BillPayment** - Bill payment transactions
- **CreditMemo** - Credit memo transactions
- **Purchase** - Purchase transactions
- **RefundReceipt** - Refund transactions
- **SalesReceipt** - Sales receipt transactions
- **Transfer** - Transfer transactions
- **VendorCredit** - Vendor credit transactions

### Additional Supported Entities
- **Budget** - Budget data changes
- **Currency** - Currency settings
- **Department** - Department data
- **Deposit** - Deposit transactions
- **JournalCode** - Journal codes
- **JournalEntry** - Journal entry transactions
- **PaymentMethod** - Payment method settings
- **Preferences** - Company preference changes
- **TaxAgency** - Tax agency information
- **Term** - Payment terms
- **TimeActivity** - Time tracking entries

## Supported Operations

Webhooks trigger for the following operations on supported entities:

- **Create** - New entity creation
- **Update** - Existing entity modifications
- **Delete** - Entity deletion
- **Merge** - Entity merging operations
- **Void** - Transaction voiding

## Webhook Event Types

### Customer Events
- Customer creation (`Customer.Create`)
- Customer updates (`Customer.Update`)
- Customer deletion (`Customer.Delete`)

### Invoice Events
- Invoice creation (`Invoice.Create`)
- Invoice updates (`Invoice.Update`)
- Invoice voiding (`Invoice.Void`)
- Invoice deletion (`Invoice.Delete`)

### Payment Events
- Payment creation (`Payment.Create`)
- Payment updates (`Payment.Update`)
- Payment deletion (`Payment.Delete`)

### Other Entity Events
All supported entities follow the same pattern:
- `{EntityName}.Create`
- `{EntityName}.Update`
- `{EntityName}.Delete`
- `{EntityName}.Merge` (where applicable)
- `{EntityName}.Void` (where applicable)

## Webhook Payload Structure

### Basic Payload Format
```json
{
  "eventNotifications": [
    {
      "realmId": "1185883450",
      "dataChangeEvent": {
        "entities": [
          {
            "name": "Customer",
            "id": "1",
            "operation": "Create",
            "lastUpdated": "2022-04-22T15:00:00-0700"
          }
        ]
      }
    }
  ]
}
```

### Payload Components
- **eventNotifications**: Array of event notification objects
- **realmId**: QuickBooks company ID
- **dataChangeEvent**: Container for data change information
- **entities**: Array of changed entities
- **name**: Entity type (Customer, Invoice, Payment, etc.)
- **id**: Unique identifier of the changed entity
- **operation**: Type of operation (Create, Update, Delete, Merge, Void)
- **lastUpdated**: Timestamp of the last update

### Multiple Entities in One Webhook
A single webhook payload can contain multiple entity changes:

```json
{
  "eventNotifications": [
    {
      "realmId": "1185883450",
      "dataChangeEvent": {
        "entities": [
          {
            "name": "Customer",
            "id": "1",
            "operation": "Update",
            "lastUpdated": "2022-04-22T15:00:00-0700"
          },
          {
            "name": "Invoice",
            "id": "42",
            "operation": "Create",
            "lastUpdated": "2022-04-22T15:01:00-0700"
          }
        ]
      }
    }
  ]
}
```

## Security and Verification

### HMAC-SHA256 Signature Verification

Every webhook request includes an `intuit-signature` header for verification:

#### Verification Process
1. **Extract signature**: Get the `intuit-signature` header value
2. **Generate hash**: Create HMAC-SHA256 hash using:
   - Key: Your app's verifier token
   - Message: Raw request body (exact payload)
3. **Compare**: Compare generated hash with header value

#### Implementation Examples

**Python**:
```python
import hmac
import hashlib
import base64

def verify_webhook_signature(payload, signature, verifier_token):
    # Generate HMAC-SHA256 hash
    hmac_hex_digest = hmac.new(
        verifier_token.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    # Decode signature from base64 to hex
    decoded_hex_signature = base64.b64decode(signature).hex()
    
    # Compare signatures
    return hmac_hex_digest == decoded_hex_signature
```

**Ruby**:
```ruby
require 'openssl'
require 'base64'

def verify_webhook_signature(payload, signature, verifier_token)
  # Generate signature
  expected_signature = OpenSSL::HMAC.base64digest('SHA256', verifier_token, payload)
  
  # Compare signatures
  signature == expected_signature
end
```

### Security Best Practices

1. **Always verify signatures**: Reject requests with invalid signatures
2. **Use HTTPS**: Webhook endpoints must use HTTPS
3. **Validate payload**: Ensure payload structure is correct
4. **Store verifier token securely**: Keep verifier token in secure configuration
5. **Handle replay attacks**: Implement timestamp validation if needed

## Webhook Setup and Configuration

### Prerequisites
- QuickBooks Online app with OAuth 2.0 authentication
- Publicly accessible HTTPS endpoint
- Webhook endpoint capable of handling POST requests

### Setup Steps

1. **Configure endpoint** in Intuit Developer Portal:
   - Navigate to your app's webhook section
   - Set webhook URL (must be HTTPS)
   - Copy the verifier token

2. **Select entities** for webhook notifications:
   - Choose specific entities (Customer, Invoice, Payment, etc.)
   - Select operations (Create, Update, Delete, Merge, Void)

3. **Implement webhook endpoint**:
   - Handle POST requests
   - Verify signature
   - Process entity changes
   - Return appropriate HTTP status codes

### Endpoint Requirements
- **URL**: Must be publicly accessible HTTPS endpoint
- **Method**: Must accept POST requests
- **Response**: Return HTTP 200 for successful processing
- **Timeout**: Respond within 30 seconds
- **Content-Type**: Accept `application/json`

## Integration Patterns

### Real-time Synchronization
Use webhooks for immediate data synchronization:

```python
def process_webhook(payload):
    for notification in payload['eventNotifications']:
        realm_id = notification['realmId']
        
        for entity in notification['dataChangeEvent']['entities']:
            entity_type = entity['name']
            entity_id = entity['id']
            operation = entity['operation']
            
            # Process based on entity type and operation
            if entity_type == 'Customer' and operation == 'Create':
                sync_new_customer(realm_id, entity_id)
            elif entity_type == 'Invoice' and operation == 'Update':
                sync_updated_invoice(realm_id, entity_id)
```

### Change Data Capture (CDC) Fallback
Implement CDC calls as backup for missed webhooks:

```python
from datetime import datetime, timedelta

def backup_sync():
    # Get last successful webhook timestamp
    last_sync = get_last_successful_webhook_time()
    
    # Make CDC call for entities dating back to last known event
    cdc_date = last_sync - timedelta(minutes=5)  # Add buffer
    
    # Query for changes since last sync
    changes = query_cdc_data(since=cdc_date)
    process_missed_changes(changes)
```

### Idempotency Handling
Ensure duplicate events don't cause issues:

```python
def process_entity_change(entity_id, operation, last_updated):
    # Check if we've already processed this change
    if is_change_already_processed(entity_id, last_updated):
        return
    
    # Process the change
    process_change(entity_id, operation)
    
    # Mark as processed
    mark_change_processed(entity_id, last_updated)
```

## Error Handling and Retry Logic

### Webhook Delivery Retries
- QuickBooks retries failed webhook deliveries
- Implement exponential backoff for processing failures
- Return appropriate HTTP status codes

### Failed Webhook Handling
```python
def handle_webhook_failure(payload, error):
    # Log the failure
    log_webhook_error(payload, error)
    
    # Queue for retry
    queue_webhook_retry(payload)
    
    # Return 500 to trigger QuickBooks retry
    return 500
```

### Monitoring and Alerting
- Monitor webhook delivery success rates
- Set up alerts for webhook processing failures
- Track entity sync lag and errors

## Best Practices

### Performance Optimization
1. **Async processing**: Process webhooks asynchronously
2. **Batch operations**: Group related API calls
3. **Queue management**: Use message queues for scalability
4. **Caching**: Cache frequently accessed data

### Reliability Patterns
1. **Duplicate handling**: Implement idempotent processing
2. **Out-of-order events**: Handle events arriving out of sequence
3. **Partial failures**: Handle scenarios where some entities fail
4. **CDC backup**: Regular CDC calls to catch missed events

### Data Consistency
1. **Transaction boundaries**: Use database transactions
2. **Rollback capabilities**: Implement compensation logic
3. **State validation**: Verify data consistency
4. **Reconciliation**: Regular data validation against QuickBooks

## Limitations and Considerations

### Technical Limitations
- Webhook payload only contains entity IDs, not full data
- Additional API calls required to get complete entity data
- 30-second response timeout requirement
- HTTPS endpoint requirement

### Business Considerations
- Webhooks may arrive out of order
- Duplicate webhooks possible
- Network issues can cause missed webhooks
- Rate limiting still applies to API calls triggered by webhooks

## Testing and Validation

### Webhook Testing
1. **Signature validation**: Test with known payloads and signatures
2. **Entity processing**: Verify correct handling of all entity types
3. **Error scenarios**: Test failure conditions and recovery
4. **Load testing**: Validate under high webhook volumes

### Development Environment
- Use ngrok or similar tools for local webhook testing
- Implement webhook simulation for development
- Test signature verification with sandbox credentials
- Validate against all supported entity types and operations