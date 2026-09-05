# Deploy the co-op server

> Document type: **Guide** — use this page to build and operate one or more public co-op nodes behind a TLS reverse proxy.

The browser client is static and belongs on the CDN. Each regional node runs only the in-memory WebSocket coordinator. Rooms never cross nodes, so both players must select the same server ID and a server restart ends every room on that node.

## Build the artifacts

Build only the CDN files with the public node catalog embedded at compile time:

```bash
COOP_PUBLIC_SERVERS='{"hk":"wss://hk.example.com","us-west":"wss://us.example.com"}' npm run build:coop-client
```

Upload the contents of `dist-coop/` to the CDN. The first entry is the default node; `?server=us-west` selects another configured node. Production clients reject arbitrary WebSocket URL overrides.

Build the server image with Buildah. The build uses an exact lockfile install in a disposable Node stage, bundles every JavaScript dependency, and copies only two minified files into an Alpine runtime:

```bash
buildah bud --layers -t localhost/prism-bastion-coop:latest -f Containerfile .
```

On rootless hosts where the kernel overlay mount or the default `pasta` network is unavailable, use the installed FUSE overlay backend and host networking for the dependency-install step:

```bash
buildah --storage-opt overlay.mount_program=/usr/bin/fuse-overlayfs bud \
  --network=host --layers \
  -t localhost/prism-bastion-coop:latest -f Containerfile .
```

Optional OCI metadata can be supplied with `--build-arg VERSION=...`, `--build-arg VCS_REF=...`, and `--build-arg BUILD_DATE=...`. Do not pass `COOP_PUBLIC_SERVERS` to the server image build; it is a client-only compile-time setting.

## Test one container

The coordinator requires an explicit browser Origin allowlist and fails closed when it is absent:

```bash
podman run --rm --name prism-bastion-coop \
  --publish 127.0.0.1:4174:4174 \
  --env COOP_ALLOWED_ORIGINS=https://play.example.com \
  --read-only --cap-drop=all --security-opt=no-new-privileges \
  --cpus=1 --memory=2g --pids-limit=128 \
  --health-cmd="node -e \"fetch('http://127.0.0.1:4174/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))\"" \
  --health-interval=30s --health-timeout=3s --health-retries=3 \
  localhost/prism-bastion-coop:latest
```

In another terminal, `podman healthcheck run prism-bastion-coop` should succeed. The check uses Node's built-in `fetch`; no shell-side HTTP client is installed. OCI image configuration has no portable health-check field, so the checked-in Quadlet and the ad-hoc command configure it at container creation time.

## Run it as a user service

The checked-in Quadlet keeps the application bound to loopback so only the host reverse proxy can reach it:

```bash
install -D -m 0644 deploy/coop-server.container ~/.config/containers/systemd/coop-server.container
install -D -m 0600 deploy/coop.env.example ~/.config/prism-bastion/coop.env
systemctl --user daemon-reload
systemctl --user enable --now coop-server.service
```

Edit `~/.config/prism-bastion/coop.env` before starting the service. Copy the same files to each regional machine and change only node-specific capacity values when necessary. To keep a rootless user service alive after logout, enable systemd lingering for its account.

The template references `localhost/prism-bastion-coop:latest`, limits the node to one CPU and 2 GiB, restarts it after failures, and adds these containment settings:

- non-root user inside the image;
- read-only root filesystem;
- no added Linux capabilities and no privilege escalation;
- 128-process ceiling;
- loopback-only published port.

## Terminate TLS at the reverse proxy

Point the regional DNS name at the node, expose only TCP 443 publicly, and forward HTTP/1.1 WebSocket upgrades to `127.0.0.1:4174`. `deploy/Caddyfile.example` is sufficient for Caddy, which handles upgrades automatically. `deploy/nginx-coop.conf.example` contains the equivalent Nginx headers and timeouts. Preserve the browser's `Origin` header because the coordinator validates it against `COOP_ALLOWED_ORIGINS`.

After TLS is active, verify both paths:

```bash
curl --fail https://hk.example.com/healthz
```

Then open the CDN page with `?server=hk`, create a room, and join it from a second browser. Configure connection and request-rate limits at the reverse proxy; the application additionally enforces payload, room, connection, and combat-verification queue bounds.

## Runtime settings

| Variable | Default | Purpose |
| --- | ---: | --- |
| `COOP_ALLOWED_ORIGINS` | required | Comma-separated exact CDN origins, including scheme and non-default port |
| `COOP_HOST` | `0.0.0.0` | Listen address inside the container |
| `COOP_SERVER_PORT` | `4174` | Plain HTTP/WebSocket port behind the proxy |
| `COOP_COMBAT_WORKERS` | `1` | Authoritative replay worker threads |
| `COOP_COMBAT_QUEUE_LIMIT` | `128` | Pending replay jobs before fail-closed rejection |
| `COOP_MAX_ROOMS` | `64` | In-memory rooms accepted by one node |
| `COOP_MAX_CONNECTIONS` | `256` | Concurrent upgraded WebSocket connections |
| `COOP_DEV_LOG` | `0` | Verbose structured diagnostics; fatal server errors are always logged |

For the measured one-core / 2 GiB profile, keep one replay worker, plan around 48 active rooms, and retain 64 as the admission ceiling. Memory is not the expected bottleneck at this size; authoritative replay CPU is. Raise the room ceiling only after running `npm run perf:coop-report` on the target CPU and observing production latency.

Never set `COOP_ALLOW_ANY_ORIGIN=1` on a public node. Treat image replacement as a disruptive deployment until room persistence or draining is implemented; update one region at a time during a quiet window.
