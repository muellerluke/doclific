---
name: generate-doclific-http-request
description: Generate MDX for HttpRequest components. Use when creating API request documentation in Doclific that allows users to make live HTTP requests.
---

# Generate Doclific HTTP Request

## Overview

This skill helps you generate the MDX for HttpRequest components in Doclific documentation. These components allow users to make live HTTP requests directly from the documentation.

## Instructions

When the user asks you to create an HTTP request component:

1. **Gather requirements**: Ask the user about:
   - HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
   - URL/endpoint (must include protocol - see URL requirements below)
   - Headers (if any)
   - Query parameters (if any)
   - Request body (for POST/PUT/PATCH)
   - Authentication (if needed)

2. **Create input JSON**: Write a JSON file with the request configuration.

3. **Run the generator script**: Execute the script to generate the MDX component.

4. **Insert the MDX**: Copy the output into the documentation.

## Important: Updating Existing Requests

**Never try to manually edit the HTML-encoded JSON attributes in an existing `<HttpRequest>` component.**

The attributes contain HTML-encoded JSON (e.g., `&#x22;` for quotes) which is difficult to edit correctly by hand.

When a user asks to update an existing HTTP request:

1. **Read the existing request** to understand current configuration
2. **Create a new input JSON** with the updated values
3. **Run the generator script** to create a fresh MDX component
4. **Replace the entire `<HttpRequest>...</HttpRequest>` block** with the new output

This ensures the HTML encoding is always correct and avoids encoding errors.

## URL Requirements

**Always include the protocol (http:// or https://) in the URL.**

- Correct: `https://api.example.com/users`
- Correct: `http://localhost:3000/api/health`
- Incorrect: `api.example.com/users`
- Incorrect: `localhost:3000/api/health`

The HttpRequest component makes real HTTP requests from the browser, so the full URL with protocol is required.

## Input JSON Structure

Create a JSON file with the following structure:

```json
{
  "method": "POST",
  "url": "https://api.example.com/users",
  "headers": [
    { "key": "Content-Type", "value": "application/json", "enabled": true },
    { "key": "Accept", "value": "application/json", "enabled": true }
  ],
  "queryParams": [
    { "key": "version", "value": "2", "enabled": true }
  ],
  "bodyType": "json",
  "bodyContent": "{\n  \"name\": \"John Doe\",\n  \"email\": \"john@example.com\"\n}",
  "formData": [],
  "auth": {
    "type": "bearer",
    "token": "your-api-token"
  }
}
```

### Field Reference

#### method (required)
HTTP method. One of: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`

#### url (required)
The full request URL including protocol (`http://` or `https://`). Examples:
- `https://api.example.com/v1/users`
- `http://localhost:8080/api/health`

#### headers (optional)
Array of header objects:
```json
{ "key": "Header-Name", "value": "header-value", "enabled": true }
```
- `key`: Header name
- `value`: Header value
- `enabled`: Whether the header is active (default: true)

#### queryParams (optional)
Array of query parameter objects (same structure as headers):
```json
{ "key": "param", "value": "value", "enabled": true }
```

#### bodyType (optional)
Request body type. One of:
- `none` - No body (default)
- `json` - JSON body
- `raw` - Raw text body
- `form-data` - Multipart form data
- `x-www-form-urlencoded` - URL-encoded form

#### bodyContent (optional)
The body content as a string. Used when `bodyType` is `json` or `raw`.

For JSON bodies, use escaped newlines for formatting:
```json
"bodyContent": "{\n  \"key\": \"value\"\n}"
```

#### formData (optional)
Array of form field objects (same structure as headers). Used when `bodyType` is `form-data` or `x-www-form-urlencoded`:
```json
{ "key": "field", "value": "value", "enabled": true }
```

#### auth (optional)
Authentication configuration. Structure depends on type:

**No Auth (default):**
```json
{ "type": "none" }
```

**Basic Auth:**
```json
{
  "type": "basic",
  "username": "user",
  "password": "pass"
}
```

**Bearer Token:**
```json
{
  "type": "bearer",
  "token": "your-token"
}
```

**API Key:**
```json
{
  "type": "apikey",
  "apiKeyName": "X-API-Key",
  "apiKeyValue": "your-api-key",
  "apiKeyLocation": "header"
}
```
- `apiKeyLocation`: Either `header` or `query`

## Workflow

1. **Create a temporary JSON file** with the request configuration
2. **Run the generator script**:
   ```bash
   node skills/generate-doclific-http-request/generate-request.js <json-file-path>
   ```
3. **Copy the output** - The script outputs the complete `<HttpRequest>` MDX component
4. **Delete the temporary file**

## Examples

### Simple GET Request

Input JSON:
```json
{
  "method": "GET",
  "url": "https://api.example.com/users"
}
```

### POST with JSON Body

Input JSON:
```json
{
  "method": "POST",
  "url": "https://api.example.com/users",
  "headers": [
    { "key": "Content-Type", "value": "application/json", "enabled": true }
  ],
  "bodyType": "json",
  "bodyContent": "{\n  \"name\": \"John\",\n  \"email\": \"john@example.com\"\n}"
}
```

### Request with Bearer Auth

Input JSON:
```json
{
  "method": "GET",
  "url": "https://api.example.com/me",
  "auth": {
    "type": "bearer",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Form Data POST

Input JSON:
```json
{
  "method": "POST",
  "url": "https://api.example.com/upload",
  "bodyType": "form-data",
  "formData": [
    { "key": "name", "value": "document.pdf", "enabled": true },
    { "key": "description", "value": "My document", "enabled": true }
  ]
}
```

See `example.json` for a complete example.
