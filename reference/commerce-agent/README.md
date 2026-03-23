# Commerce Agent

Shopping assistant agent built with Strands SDK and AG-UI protocol for AWS Bedrock AgentCore.

## Tools

- `coveo_commerce_search` - Search for products using Coveo Commerce API
- `coveo_query_suggest` - Get search query suggestions

## Coveo Configuration

The agent requires Coveo configuration to be passed in the invoke payload under `forwardedProps.coveo`:

```json
{
  "forwardedProps": {
    "coveo": {
      "accessToken": "your-api-key",
      "organizationId": "your-org-id",
      "platformUrl": "https://platform.cloud.coveo.com",
      "trackingId": "your-tracking-id",
      "clientId": "uuid-v4-client-id",
      "locale": "en-US",
      "currency": "USD",
      "timezone": "America/Montreal",
      "context": {
        "view": {
          "url": "https://your-store.com/current-page",
          "referrer": "https://your-store.com/previous-page"
        }
      }
    }
  },
  "messages": [...],
  ...
}
```

The commerce runtime also requires a policy definition under `forwardedProps.policy`. In local
dashboard flows, that policy is loaded by the dashboard and forwarded to the agent. In deployed
flows, the caller of `invoke()` is responsible for passing it.

| Field                                        | Required | Description                                                  |
| -------------------------------------------- | -------- | ------------------------------------------------------------ |
| `forwardedProps.coveo.accessToken`           | Yes      | Coveo API key with commerce permissions                      |
| `forwardedProps.coveo.organizationId`        | Yes      | Coveo organization identifier                                |
| `forwardedProps.coveo.platformUrl`           | Yes      | Coveo platform URL                                           |
| `forwardedProps.coveo.trackingId`            | Yes      | Analytics tracking identifier                                |
| `forwardedProps.coveo.clientId`              | Yes      | UUID v4 identifying the shopper/session                      |
| `forwardedProps.coveo.locale`                | Yes      | IETF locale tag in `language-country` format (e.g., `en-US`) |
| `forwardedProps.coveo.currency`              | Yes      | ISO 4217 currency code (e.g., `USD`)                         |
| `forwardedProps.coveo.timezone`              | No       | IANA timezone (e.g., `America/Montreal`)                     |
| `forwardedProps.coveo.context.view.url`      | Yes      | Current page URL                                             |
| `forwardedProps.coveo.context.view.referrer` | No       | Referrer URL                                                 |

The policy payload must match the published oracle commerce schema version declared in
[`schema-support.yaml`](./schema-support.yaml). For the current commerce agent, that means
`forwardedProps.policy` should match oracle commerce schema `2.0.0`.

## Local Development

The preferred way to develop and test the agent is using the dashboard UI. From the repository root:

```bash
# Start the dashboard (reads .env files from each agent automatically)
uv run dashboard
```

The dashboard will be available at http://localhost:3000 and provides a chat interface for interacting with agents. It automatically reads each agent's `.env` file and forwards credentials via the AG-UI protocol.

## Evaluations

Commerce has two evaluation suites:

| Suite | Kind | Purpose |
| --- | --- | --- |
| `reference_regression` | reference | Deterministic fixture-backed validation of scenarios, graders, and result artifacts using saved observed data from the dataset. It does not execute the agent. |
| `live_regression` | live | Runtime-backed validation against the commerce agent |

### Run evals from the commerce folder

From `packages/agents/commerce`:

```bash
uv run python -m evals.run_reference_regression
uv run python -m evals.run_live_regression
```

Useful variants:

```bash
# Run the live suite locally through the in-process entrypoint
EVAL_TRANSPORT=in_process uv run python -m evals.run_live_regression

# Run live cases in parallel
EVAL_MAX_CONCURRENCY=3 uv run python -m evals.run_live_regression
```

### Run evals from the repo root

From the repo root:

```bash
uv run eval --list
uv run eval commerce reference_regression
uv run eval commerce live_regression
uv run eval commerce
```

### Environment setup for live evals

`reference_regression` does not require runtime env vars because it grades saved fixture observations from the dataset. It does not execute the agent.

`live_regression` requires commerce runtime env vars, and deployed AgentCore runs also require
runtime-specific AWS env vars.

See:

- `evals/.env.example`
- [Evaluation Runtime Environment](../../../docs/evals/evaluation-runtime-env.md)
- [Evaluation System Implementation](../../../docs/evals/agent-evals.md)

### Using agentcore CLI

Alternatively, you can test directly with the agentcore CLI:

```bash
# Start local development server
agentcore dev

# In another terminal, test the agent with AG-UI protocol payload
agentcore invoke --dev '{
  "messages": [{"id": "msg-1", "role": "user", "content": "Find me some running shoes"}],
  "threadId": "test-thread",
  "runId": "test-run",
  "state": {},
  "tools": [],
  "context": [],
  "forwardedProps": {
    "coveo": {
      "accessToken": "your-token",
      "organizationId": "your-org",
      "platformUrl": "https://platform.cloud.coveo.com",
      "trackingId": "your-tracking-id",
      "clientId": "58bb4b98-1daa-4767-8c15-90a0ea67645c",
      "locale": "en-US",
      "currency": "USD",
      "context": {"view": {"url": "https://example.com"}}
    },
    "policy": {
      "policy": {
        "name": "commerce_discovery",
        "version": "3.1",
        "initial_state": "route/intake",
        "actions": {
          "go_respond": {
            "tool": "route",
            "description": "Route directly to the response state."
          },
          "all_done": {
            "tool": "done",
            "description": "End the run."
          }
        },
        "states": {
          "route/intake": {
            "description": "Choose the next workflow step.",
            "allowed_actions": ["go_respond"],
            "transitions": {
              "go_respond": "respond/complete"
            }
          },
          "respond/complete": {
            "description": "End the run.",
            "allowed_actions": [],
            "transitions": {},
            "terminal": true
          }
        }
      }
    }
  }
}'
```

### AG-UI Protocol

This agent uses the [AG-UI protocol](https://docs.ag-ui.com) for streaming responses.
The payload must conform to the `RunAgentInput` schema:

| Field            | Type   | Description                                                       |
| ---------------- | ------ | ----------------------------------------------------------------- |
| `messages`       | array  | Conversation history (each message needs `id`, `role`, `content`) |
| `threadId`       | string | Conversation thread identifier                                    |
| `runId`          | string | Unique identifier for this run                                    |
| `state`          | object | Shared state between frontend and agent                           |
| `tools`          | array  | Frontend tools available to the agent                             |
| `context`        | array  | Additional context items                                          |
| `forwardedProps` | object | Props to forward to frontend components                           |

For commerce specifically, `forwardedProps` must include:
- `coveo`: Coveo runtime configuration
- `policy`: full policy payload with top-level `policy` key

## Schema Support Manifest

[`schema-support.yaml`](./schema-support.yaml) is a published compatibility artifact that declares
which oracle commerce policy schema versions this agent accepts.

```yaml
agent_type: commerce
supported_schema_versions:
  - "2.0.0"
```

This manifest is intended for external callers and platform services deciding which oracle schema
version to use when invoking the commerce agent. It is not used by the commerce runtime to parse
`forwardedProps.policy`.

| Field                       | Description                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `agent_type`                | Must match the agent type identifier used by callers and platform services (`commerce`)          |
| `supported_schema_versions` | List of oracle commerce policy schema versions accepted by this agent when invoked with a policy |

### Updating supported versions

**Adding a new version:** When a new oracle commerce policy schema version is published, append it
to `supported_schema_versions` and deploy once the commerce agent can handle policies authored
against that version.

**Deprecating a version:** First migrate callers to a newer supported schema version, then remove
the old version from `supported_schema_versions` and deploy. External callers should stop invoking
the agent with removed versions.

### Validation

Validate the manifest locally with:

```bash
uv run validate-schema-support
```

This also runs in CI.

## Deployment

See the [root README](../../../README.md#deployment) for deployment documentation.
