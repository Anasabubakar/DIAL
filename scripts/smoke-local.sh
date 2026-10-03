set -e
cd /Users/admin/Downloads/Hacknight/DIAL/apps/api
rm -rf /tmp/dialdev; pkill -f "tsx src/main.ts" 2>/dev/null || true
(DATA_DIR=/tmp/dialdev DEV_AUTH=true EMBED_WORKER=true PORT=8080 pnpm exec tsx src/main.ts > /tmp/dial-api.log 2>&1 &)
for i in $(seq 1 30); do curl -sf localhost:8080/healthz >/dev/null && break; sleep 1; done
H=(-H x-dev-user:u1 -H content-type:application/json)
j(){ python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }
curl -s localhost:8080/readyz; echo
curl -s -X PUT "${H[@]}" localhost:8080/v1/profile -d '{"confirmReviewed":true,"profile":{"fullName":"Ada Obi","email":"ada@example.com","headline":"Frontend engineer","summary":"","entries":[{"id":"e1","kind":"experience","title":"Frontend Engineer","organization":"Acme","bullets":["Built a React design system"]}]}}' >/dev/null
R=$(curl -s -X POST "${H[@]}" localhost:8080/v1/roles -d '{"title":"Frontend Engineer","company":"Paystack","description":"React and TypeScript frontend engineer for our dashboard.","applyEmail":"jobs@paystack.test"}' | j 'd["id"]')
T=$(curl -s -X POST "${H[@]}" localhost:8080/v1/tasks -d "{\"roleId\":\"$R\"}" | j 'd["taskId"]'); sleep 8
curl -s "${H[@]}" localhost:8080/v1/tasks/$T | j 'd["task"]["status"],d["draft"]["subject"],d["draft"]["attachmentFilename"]'
U=$(curl -s -X POST "${H[@]}" localhost:8080/v1/tasks/$T/download-url | j 'd["url"]'); curl -s localhost:8080$U -o /tmp/dial.pdf; file /tmp/dial.pdf
TK=$(curl -s -X POST "${H[@]}" localhost:8080/v1/tasks/$T/review | j 'd["token"]')
curl -s -X POST "${H[@]}" localhost:8080/v1/tasks/$T/confirm -d "{\"reviewToken\":\"$TK\"}"; echo; sleep 3
curl -s "${H[@]}" localhost:8080/v1/tasks/$T | j 'd["task"]["status"],d["attempt"]["deliveryStatus"],d["simulated"],[e["type"] for e in d["events"]]'

