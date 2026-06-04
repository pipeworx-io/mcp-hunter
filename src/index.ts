interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Hunter.io MCP — wraps the Hunter.io email finder & verification API (hunter.io)
 *
 * Tools:
 * - domain_search: find email addresses for a domain (with names, positions, confidence)
 * - email_finder: find the most likely professional/work email for a person at a domain
 * - email_verifier: verify deliverability of an email address (email verification)
 *
 * Dual-key model: _apiKey is OPTIONAL. Pass your own Hunter.io key for higher
 * limits, or omit it to use the shared Pipeworx key (injected by the gateway).
 * Key is passed as the `api_key` query param. All requests are GET.
 * Hunter wraps payloads in `{ data: {...}, meta: {...} }`.
 */


const BASE_URL = 'https://api.hunter.io/v2';

const tools: McpToolExport['tools'] = [
  {
    name: 'domain_search',
    description:
      'Find email addresses for a domain on Hunter.io. Returns the email pattern plus a list of professional/work emails with names, positions, departments, and confidence scores. Example: domain_search({ domain: "stripe.com" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domain: {
          type: 'string',
          description: 'Domain to search, e.g. "stripe.com"',
        },
        limit: {
          type: 'number',
          description: 'Max number of emails to return (default 10, max 100)',
        },
        type: {
          type: 'string',
          enum: ['personal', 'generic'],
          description: 'Filter by email type: "personal" (named individuals) or "generic" (role addresses like info@)',
        },
        department: {
          type: 'string',
          description: 'Filter by department, e.g. "executive", "sales", "engineering"',
        },
        _apiKey: {
          type: 'string',
          description: 'Optional — your own Hunter.io API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'email_finder',
    description:
      'Find the most likely professional/work email address for a specific person at a domain on Hunter.io. Returns the email, a confidence score, position, and the number of corroborating sources. Example: email_finder({ domain: "stripe.com", first_name: "Patrick", last_name: "Collison" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domain: {
          type: 'string',
          description: 'Company domain, e.g. "stripe.com"',
        },
        first_name: {
          type: 'string',
          description: "Person's first name, e.g. \"Patrick\"",
        },
        last_name: {
          type: 'string',
          description: "Person's last name, e.g. \"Collison\"",
        },
        _apiKey: {
          type: 'string',
          description: 'Optional — your own Hunter.io API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
      required: ['domain', 'first_name', 'last_name'],
    },
  },
  {
    name: 'email_verifier',
    description:
      'Verify an email address with Hunter.io email verification. Checks deliverability, MX records, SMTP, and whether the address is disposable or webmail. Returns a status, result, and confidence score. Example: email_verifier({ email: "patrick@stripe.com" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        email: {
          type: 'string',
          description: 'Email address to verify, e.g. "patrick@stripe.com"',
        },
        _apiKey: {
          type: 'string',
          description: 'Optional — your own Hunter.io API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
      required: ['email'],
    },
  },
];

// Hunter wraps every successful response as { data: {...}, meta: {...} }.
// On non-2xx, return a structured error rather than throwing so the gateway
// surfaces the upstream status + message to the agent.
async function hunterGet(path: string, params: URLSearchParams): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}?${params}`);
  if (!res.ok) {
    const text = await res.text();
    return { error: res.status, message: text };
  }
  const json = (await res.json()) as { data?: Record<string, unknown>; meta?: unknown };
  return json.data ?? {};
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string;
  delete args._apiKey;

  if (!apiKey) {
    return { error: 'api_key_required', message: 'No Hunter.io key available.' };
  }

  switch (name) {
    case 'domain_search':
      return domainSearch(args, apiKey);
    case 'email_finder':
      return emailFinder(args, apiKey);
    case 'email_verifier':
      return emailVerifier(args, apiKey);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

interface DomainEmail {
  value: string;
  type: string;
  confidence: number;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  department: string | null;
}

async function domainSearch(args: Record<string, unknown>, apiKey: string) {
  const limit = Math.min(100, (args.limit as number | undefined) ?? 10);
  const params = new URLSearchParams({
    api_key: apiKey,
    domain: args.domain as string,
    limit: String(limit),
  });
  if (args.type) params.set('type', args.type as string);
  if (args.department) params.set('department', args.department as string);

  const result = await hunterGet('/domain-search', params);
  if (isError(result)) return result;

  const data = result as {
    domain?: string;
    organization?: string;
    pattern?: string;
    emails?: DomainEmail[];
  };

  return {
    domain: data.domain,
    organization: data.organization,
    pattern: data.pattern,
    emails: (data.emails || []).map((e) => ({
      value: e.value,
      type: e.type,
      confidence: e.confidence,
      first_name: e.first_name,
      last_name: e.last_name,
      position: e.position,
      department: e.department,
    })),
  };
}

async function emailFinder(args: Record<string, unknown>, apiKey: string) {
  const params = new URLSearchParams({
    api_key: apiKey,
    domain: args.domain as string,
    first_name: args.first_name as string,
    last_name: args.last_name as string,
  });

  const result = await hunterGet('/email-finder', params);
  if (isError(result)) return result;

  const data = result as {
    email?: string;
    score?: number;
    first_name?: string;
    last_name?: string;
    position?: string;
    company?: string;
    sources?: unknown[];
  };

  return {
    email: data.email,
    score: data.score,
    first_name: data.first_name,
    last_name: data.last_name,
    position: data.position,
    company: data.company,
    sources_count: data.sources?.length,
  };
}

async function emailVerifier(args: Record<string, unknown>, apiKey: string) {
  const params = new URLSearchParams({
    api_key: apiKey,
    email: args.email as string,
  });

  const result = await hunterGet('/email-verifier', params);
  if (isError(result)) return result;

  const data = result as {
    email?: string;
    status?: string;
    result?: string;
    score?: number;
    disposable?: boolean;
    webmail?: boolean;
    mx_records?: boolean;
    smtp_check?: boolean;
  };

  return {
    email: data.email,
    status: data.status,
    result: data.result,
    score: data.score,
    deliverable: data.result === 'deliverable',
    disposable: data.disposable,
    webmail: data.webmail,
    mx_records: data.mx_records,
    smtp_check: data.smtp_check,
  };
}

// hunterGet returns { error, message } on non-2xx; pass those straight through.
function isError(result: unknown): result is { error: unknown; message: unknown } {
  return typeof result === 'object' && result !== null && 'error' in result;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
