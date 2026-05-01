# Secret Rotation Runbook

This repository previously contained live-looking credentials. Removing them from HEAD does not invalidate credentials that may have been copied, logged, or preserved in git history.

## Required Rotation

- Revoke and recreate the Groq API keys used by the FastAPI and archived Nest services.
- Rotate the Neo4j database password used by `shopTHAT_V1/graph_rag_backend`.
- Rotate the OpenSearch user password used by `Shopthat_FastAPI/Shopthat_FastAPI`.
- Update deployment/runtime environment variables with the new values.
- Confirm `.env` files remain untracked and only `.env.example` files are committed.

## Verification

- Run the GitHub `Secret Scan` workflow on the branch before merging.
- Check `git status` for deleted tracked `.env` files and committed `.env.example` placeholders.
- Search for provider-specific key prefixes before release.
