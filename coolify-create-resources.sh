#!/usr/bin/env bash
# Vytvoří 5 Coolify resources pro weby skupiny Úsporami + Herbert chatbot.
# Předpoklad: build je v PUBLIC git repu (GIT_REPO níže). Web neobsahuje tajemství.
# Spustit: bash coolify-create-resources.sh
set -euo pipefail

B="https://coolify.usporami.cz/api/v1"
TOK="$(cat "$(dirname "$0")/../.coolify-token")"   # 2|... token z workspace rootu
H=(-H "Authorization: Bearer $TOK" -H "Content-Type: application/json")

# --- zjištěné z Coolify API (16. 6. 2026) ---
SERVER_UUID="uj2993zohapr0yux1lxoswk0"      # localhost (Coolify host)
PROJECT_UUID="g12xfti91p79h4miwxzkb7x1"     # nebo si založ vlastní projekt "usporami-web"
ENV="production"

# --- DOPLNIT: public repo + branch s buildem ---
GIT_REPO="https://github.com/usporami/usporami-web.git"
GIT_BRANCH="main"

create_static () {
  local name="$1" basedir="$2" domains="$3"
  echo ">>> $name ($domains)"
  curl -s "${H[@]}" -X POST "$B/applications/public" -d "$(cat <<JSON
{
  "project_uuid": "$PROJECT_UUID",
  "server_uuid": "$SERVER_UUID",
  "environment_name": "$ENV",
  "git_repository": "$GIT_REPO",
  "git_branch": "$GIT_BRANCH",
  "build_pack": "static",
  "ports_exposes": "80",
  "base_directory": "$basedir",
  "domains": "$domains",
  "name": "$name",
  "instant_deploy": true
}
JSON
)"; echo
}

create_static "web-usporami"    "/usporami.cz"    "https://usporami.cz,https://www.usporami.cz"
create_static "web-dotacemi"    "/dotacemi.cz"    "https://dotacemi.cz,https://www.dotacemi.cz"
create_static "web-energetikou" "/energetikou.cz" "https://energetikou.cz,https://www.energetikou.cz"
create_static "web-projektem"   "/projektem.cz"   "https://projektem.cz,https://www.projektem.cz"

# --- Herbert chatbot (Node app) ---
echo ">>> usporami-chatbot (api.usporami.cz)"
curl -s "${H[@]}" -X POST "$B/applications/public" -d "$(cat <<JSON
{
  "project_uuid": "$PROJECT_UUID",
  "server_uuid": "$SERVER_UUID",
  "environment_name": "$ENV",
  "git_repository": "$GIT_REPO",
  "git_branch": "$GIT_BRANCH",
  "build_pack": "nixpacks",
  "base_directory": "/chatbot-server",
  "ports_exposes": "3001",
  "domains": "https://api.usporami.cz",
  "name": "usporami-chatbot",
  "instant_deploy": false
}
JSON
)"; echo
echo "Po vytvoření chatbotu nastav env (secret): ANTHROPIC_API_KEY, PORT=3001, pak Deploy."
