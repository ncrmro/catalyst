# MCP Server Implementation

This document describes the MCP (Model Context Protocol) server implementation in the Catalyst web application.

## Overview

The MCP server provides a standardized way for AI applications to access Catalyst's namespace data through the Model Context Protocol. It exposes two main tools for interacting with Kubernetes namespaces.

## Authentication

The MCP server uses static API key authentication via Bearer tokens. The API key is configured through the `MCP_API_KEY` environment variable and belongs to the first user in the system.

```bash
export MCP_API_KEY="your-secret-api-key"
```

## Endpoint

**URL**: `/api/mcp`  
**Method**: `POST`  
**Content-Type**: `application/json`  
**Authentication**: `Authorization: Bearer <api-key>`

## Available Tools

### 1. getNamespaces

Retrieves all namespaces that the authenticated user can access.

**Parameters:**
- `clusterName` (optional): Filter namespaces by cluster name

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "getNamespaces",
      "arguments": {}
    }
  }'
```

**Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"success\": true,\n  \"namespaces\": [\n    {\n      \"name\": \"default\",\n      \"labels\": {\n        \"kubernetes.io/metadata.name\": \"default\"\n      },\n      \"creationTimestamp\": \"2025-08-27T00:25:18.000Z\"\n    }\n  ],\n  \"count\": 1\n}"
    }
  ]
}
```

### 2. getNamespace

Retrieves detailed information for a specific namespace.

**Parameters:**
- `namespace` (required): The name of the namespace to retrieve
- `resources` (optional): Array of resource types to include in the response
- `clusterName` (optional): Specific cluster name

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "getNamespace",
      "arguments": {
        "namespace": "default",
        "resources": ["pods", "services"]
      }
    }
  }'
```

**Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"success\": true,\n  \"namespace\": {\n    \"name\": \"default\",\n    \"labels\": {\n      \"kubernetes.io/metadata.name\": \"default\"\n    },\n    \"creationTimestamp\": \"2025-08-27T00:25:18.000Z\",\n    \"requestedResources\": [\"pods\", \"services\"],\n    \"message\": \"Resource details not implemented yet\"\n  }\n}"
    }
  ]
}
```

## Listing Available Tools

To discover available tools, use the `tools/list` method:

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

## Error Handling

The server returns appropriate HTTP status codes and error messages:

- `401 Unauthorized`: Missing or invalid API key
- `400 Bad Request`: Invalid tool name or missing required parameters
- `500 Internal Server Error`: Server-side errors

## Integration with Existing Systems

The MCP server integrates with:
- User authentication system (first user for API key validation)
- Kubernetes namespace management (`k8s-namespaces.ts`)
- Team-based access control (future enhancement)

## Security Considerations

- API keys should be kept secret and rotated regularly
- The server validates all requests against the configured API key
- Future versions may support user-specific API keys and team-based access control

## Future Enhancements

- User-specific API keys instead of static key for first user
- Team-based namespace filtering
- Additional resource details in getNamespace responses
- Support for SSE transport for real-time updates
- Rate limiting and request logging