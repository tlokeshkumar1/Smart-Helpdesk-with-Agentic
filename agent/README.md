# Smart Helpdesk AI Agent Worker

A Python FastAPI microservice that provides AI-powered ticket triage and response generation for the Smart Helpdesk system.

## Features

- **Ticket Classification**: Automatically categorizes tickets into billing, tech, shipping, or other
- **Knowledge Base Search**: Finds relevant articles using keyword matching
- **Draft Response Generation**: Creates helpful responses based on KB articles
- **Confidence Scoring**: Provides confidence levels for auto-resolution decisions
- **Flexible Architecture**: Supports both stub mode and real LLM integration

## Architecture

The agent follows a pipeline approach:

1. **Classify** - Categorize the ticket based on content
2. **Retrieve** - Find relevant knowledge base articles
3. **Draft** - Generate a helpful response
4. **Score** - Provide confidence for auto-resolution

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set environment variables:**
   ```bash
   export STUB_MODE=true
   export MAX_ARTICLES=3
   ```

3. **Start the server:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
   ```

4. **Test the health endpoint:**
   ```bash
   curl http://localhost:9000/healthz
   ```

### Docker Deployment

```bash
# Build the image
docker build -t helpdesk-agent .

# Run the container
docker run -p 9000:9000 -e STUB_MODE=true helpdesk-agent
```

## API Endpoints

### Health Check
```
GET /healthz
```
Returns: `{"ok": true}`

### Ticket Triage
```
POST /triage
```

**Request Body:**
```json
{
  "traceId": "uuid-trace-id",
  "ticket": {
    "id": "ticket-id",
    "title": "Ticket title",
    "description": "Detailed description"
  },
  "kb": [
    {
      "id": "article-id",
      "title": "Article title",
      "body": "Article content",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

**Response:**
```json
{
  "predictedCategory": "billing",
  "draftReply": "Generated response...",
  "citations": ["article-id-1", "article-id-2"],
  "confidence": 0.85,
  "modelInfo": {
    "provider": "stub",
    "model": "stub",
    "promptVersion": "v1",
    "stubMode": true
  },
  "stepLogs": [
    {
      "action": "AGENT_CLASSIFIED",
      "meta": {"predictedCategory": "billing", "confidence": 0.85}
    },
    {
      "action": "KB_RETRIEVED",
      "meta": {"articleIds": ["article-id-1"]}
    },
    {
      "action": "DRAFT_GENERATED",
      "meta": {"length": 150}
    }
  ]
}
```

## Configuration

Environment variables:

- `STUB_MODE` - Set to "true" for stub mode, "false" for real LLM (default: "true")
- `GEMINI_MODEL` - Gemini model to use (default: "gemini-2.0-flash")
- `MAX_ARTICLES` - Maximum articles to retrieve (default: 3)

## Classification Logic

In stub mode, the agent uses keyword matching:

- **Billing**: refund, invoice, charge, card, payment, billing
- **Tech**: error, bug, stack, 500, crash, login, auth, trace
- **Shipping**: delivery, shipment, shipping, package, track, courier, delayed

Confidence is calculated based on keyword frequency.

## Real LLM Integration

To integrate with a real LLM (like Gemini):

1. Set `STUB_MODE=false`
2. Implement the LLM provider in `llm_provider.py`
3. Add API keys and configuration
4. Ensure proper error handling and rate limiting

## Development

### Project Structure
```
app/
├── main.py          # FastAPI application
├── config.py        # Configuration settings
├── schemas.py       # Pydantic models
├── llm_provider.py  # LLM integration
├── search.py        # Knowledge base search
└── pipeline.py      # Main processing pipeline
```

### Adding New Features

1. **New Classification Categories**: Update keyword sets in `llm_provider.py`
2. **Better Search**: Enhance algorithms in `search.py`
3. **LLM Integration**: Implement real providers in `llm_provider.py`
4. **Monitoring**: Add logging and metrics to `pipeline.py`

## Testing

```bash
# Test the triage endpoint
curl -X POST http://localhost:9000/triage \
  -H "Content-Type: application/json" \
  -d '{
    "traceId": "test-trace",
    "ticket": {
      "id": "test-ticket",
      "title": "Refund request",
      "description": "I need a refund for my order"
    },
    "kb": [
      {
        "id": "kb-1",
        "title": "How to process refunds",
        "body": "Steps for processing customer refunds...",
        "tags": ["billing", "refunds"]
      }
    ]
  }'
```

## Integration with Node.js Backend

The agent integrates seamlessly with the Node.js backend:

1. Backend sends triage requests to `/triage`
2. Agent processes and returns structured response
3. Backend uses confidence score for auto-resolution
4. Step logs are persisted to audit trail

## Performance Considerations

- Keyword search is fast but simple
- Consider caching for frequently accessed KB articles
- Monitor response times and add timeouts
- Scale horizontally for high traffic

## Security

- No sensitive data is stored
- All processing is stateless
- Input validation via Pydantic schemas
- Error handling prevents information leakage
