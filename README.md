# mcp-hunter

Hunter.io MCP — wraps the Hunter.io email finder & verification API (hunter.io)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 744+ live data sources.

## Tools

| Tool | Description |
|------|-------------|

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

Or connect to the full Pipeworx gateway for access to all 744+ data sources:

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

- [All tools and guides](https://github.com/pipeworx-io/examples)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
