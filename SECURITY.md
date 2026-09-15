# Security policy

Report suspected vulnerabilities privately using this repository's GitHub **Security → Report a vulnerability** feature when available. If private reporting is unavailable, ask the repository owner for a private channel without publishing exploit details, credentials, or customer information in an issue.

Only the latest deployed release is supported. Security fixes must pass the checks in `.github/workflows/security-checks.yml` and receive review before deployment. Do not commit secrets, production database dumps, authentication cookies, or receipt/customer data.

See [the deployment runbook](docs/SECURITY_ROLLOUT.md), [payment recovery](docs/PAYMENT_ROLLOUT.md), and the chatbot's configuration documentation. Repository settings and production configuration are part of the rollout and are not changed by this branch.
