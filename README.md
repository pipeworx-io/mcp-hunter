# mcp-hunter

Hunter.io MCP — wraps the Hunter.io email finder & verification API (hunter.io)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `domain_search` | Find email addresses for a domain on Hunter.io. Returns the email pattern plus a list of professional/work emails with names, positions, departments, and confidence scores. Example: domain_search({ domain: "stripe.com" }) |
| `email_finder` | Find the most likely professional/work email address for a specific person at a domain on Hunter.io. Returns the email, a confidence score, position, and the number of corroborating sources. Example: email_finder({ domain: "stripe.com", first_name: "Patrick", last_name: "Collison" }) |
| `email_verifier` | Verify an email address with Hunter.io email verification. Checks deliverability, MX records, SMTP, and whether the address is disposable or webmail. Returns a status, result, and confidence score. Example: email_verifier({ email: "patrick@stripe.com" }) |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "hunter": {
      "url": "https://gateway.pipeworx.io/hunter/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Hunter data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
