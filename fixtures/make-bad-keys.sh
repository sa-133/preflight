#!/bin/sh
# Generates fake, random "leaked" keys for the bad test site. Not committed,
# so GitHub secret scanning never sees key-shaped strings in the repo.
cd "$(dirname "$0")/bad"
KEY="sk-proj-$(head -c 60 /dev/urandom | base64 | tr -dc A-Za-z0-9 | head -c 40)"
P=$(printf '{"iss":"supabase","role":"service_role","iat":1}' | base64 | tr '+/' '-_' | tr -d '=')
mkdir -p assets
printf 'const k="%s";const sb="eyJhbGciOiJIUzI1NiJ9.%s.abcdefghijklmnopqrstuv";\n//# sourceMappingURL=index-AbC123.js.map\n' "$KEY" "$P" > assets/index-AbC123.js
