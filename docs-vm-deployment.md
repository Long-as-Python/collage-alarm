# Collage Alarm — VM deployment and operations

This document describes the **actual live deployment** running on `192.168.0.31`.

## Live target

- **Host:** `192.168.0.31`
- **Runtime:** direct Docker containers on the VM
- **Public handoff port:** `33080/tcp`
- **Containers:**
  - `collage-alarm-backend`
  - `collage-alarm-web`

## Runtime topology

One host port is exposed:

```text
client -> 192.168.0.31:33080 -> nginx (collage-alarm-web) -> /api -> collage-alarm-backend:4000
```

The frontend container serves the built SPA and proxies `/api/*` to the backend container.

## VM paths

- **App checkout on VM:** `/home/user/collage-alarm/app`
- **Deployment env file:** `/home/user/collage-alarm/app/.env.deploy`
- **Host sound directory:** `/home/user/collage-alarm/sounds`
- **Uploaded custom sound files:** `/home/user/collage-alarm/sounds/custom`
- **Persistent config file:** `/home/user/collage-alarm/data/config.json`

## Admin access

- The backend currently validates the **password** and does not meaningfully validate the username.
- Use any reasonable username in the UI, normally `admin`.
- The active admin password is stored on the VM in `.env.deploy` as `ADMIN_PASSWORD`.

Do **not** commit the real password into git documentation.

## Containers and build artifacts

Relevant repo files:

- `frontend/Dockerfile.prod`
- `frontend/nginx.conf`
- `docker-compose.deploy.yml`

Useful rebuild flow on the VM:

```bash
cd /home/user/collage-alarm/app/backend
docker build -t collage-alarm-backend:deploy .

cd /home/user/collage-alarm/app/frontend
docker build -f Dockerfile.prod \
  --build-arg VITE_API_BASE_URL=/api \
  --build-arg VITE_USE_MOCK=false \
  -t collage-alarm-web:deploy .
```

Useful restart flow:

```bash
docker rm -f collage-alarm-web collage-alarm-backend || true

docker run -d --name collage-alarm-backend \
  --restart unless-stopped \
  --network collage-alarm \
  --network-alias backend \
  --env-file /home/user/collage-alarm/app/.env.deploy \
  -v /home/user/collage-alarm/sounds:/app/sounds \
  -v /home/user/collage-alarm/data:/app/data \
  --device /dev/snd \
  collage-alarm-backend:deploy

docker run -d --name collage-alarm-web \
  --restart unless-stopped \
  --network collage-alarm \
  -p 33080:80 \
  collage-alarm-web:deploy
```

## Audio behavior

The backend container needs:

- `/dev/snd` passed with `--device /dev/snd`
- the host sound files mounted to `/app/sounds`

`bind-mount /dev/snd` alone was **not enough**; `--device /dev/snd` is required for ALSA detection in this deployment.

Verified server-side facts:

- `aplay -l` inside `collage-alarm-backend` sees:
  - `USB PnP Audio Device`
- direct playback in the container succeeds
- scheduled playback also succeeds through the scheduler path

## Verified fix record

**Timestamp:** `2026-05-05T17:14:16.590+03:00`  
**Model:** `GPT-5.4 (model ID: gpt-5.4)`

Final verified scheduler fix:

- the missed bells were caused by a **timezone mismatch**;
- the VM host was in `UTC`, and the running backend image on the VM had been started from an older image without `TZ=Europe/Kyiv`;
- the backend image was rebuilt **on the server**, and `collage-alarm-backend` was restarted with the current image;
- after restart, the container reported `TZ=Europe/Kyiv` and `date` inside the container showed `EEST`;
- after moving the test lesson to `17:11–17:12`, the user confirmed that the bell **did play**.

## Sound playback commands

The active deployment currently uses `.env.deploy` to point all built-in commands at the shared test file:

- `ALARM_BELL_COMMAND`
- `ALARM_HYMN_COMMAND`
- `ALARM_FIRE_COMMAND`
- `ALARM_CUSTOM_COMMAND`

Custom uploaded sounds do **not** use `ALARM_CUSTOM_COMMAND`; they play their uploaded file directly from `/app/sounds/custom/...` through:

```text
ffplay -nodisp -autoexit ... || aplay ...
```

## Upload limits

`collage-alarm-web` nginx is configured with:

```nginx
client_max_body_size 100m;
```

This was added because sound uploads were failing with `413 Request Entity Too Large`.

## What currently works

- admin login
- dashboard and schedule pages
- events page against the real backend
- overlapping events are allowed
- custom sound upload/create/update/delete
- import of local sound pack from `collage-alarm/sounds`
- manual fire alarm trigger
- manual sound trigger via "Тест звуку" (dashboard) and Play buttons (sounds library)
- scheduled playback to the USB audio device

## Imported local sound pack

The following files from the repository were imported into the live custom library:

- `Оголошення пожежної безпеки`
- `Хвилина мовчання + Гімн`
- `Дзвоник`
- `Halloween`
- `Повітряна сирена`

## Real API shape used by the current frontend

The live frontend depends on these backend routes:

- `POST /api/auth/admin-login`
- `GET /api/auth/verify`
- `GET /api/schedule/all`
- `GET /api/schedule/current`
- `GET /api/alarms/config`
- `POST /api/alarms/config`
- `GET /api/alarms/sounds`
- `POST /api/alarms/sounds`
- `POST /api/alarms/sounds/update`
- `POST /api/alarms/sounds/delete`
- `POST /api/alarms/fire`
- `POST /api/alarms/play`
- `GET /api/alarms/current`

## Important current limitations

These are real and should be assumed during ops:

1. **Runtime config is persisted.** Config (events, sounds, schedule) is saved to `/home/user/collage-alarm/data/config.json` and loaded automatically on restart.
2. **Uploaded files persist on disk.** Files under `/home/user/collage-alarm/sounds/custom` persist; metadata is re-loaded from `config.json` on restart.
3. **Actual audible confirmation still requires a human nearby.** Server-side checks confirm successful playback, but remote CLI cannot physically hear the speaker.
4. **Kubernetes manifests are not the active production path.** The current production deployment is direct Docker on the VM.

## Operational checks

Quick health checks:

```bash
curl http://127.0.0.1:33080/api/auth/verify
curl http://127.0.0.1:33080/api/alarms/sounds
curl http://127.0.0.1:33080/api/alarms/config
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Check USB audio visibility:

```bash
docker exec collage-alarm-backend aplay -l
```

Direct playback test:

```bash
docker exec collage-alarm-backend sh -lc 'ffplay -nodisp -autoexit -loglevel error /app/sounds/test.mp3 >/dev/null 2>&1 || aplay /app/sounds/test.mp3'
```

Check backend logs:

```bash
docker logs --tail 100 collage-alarm-backend
```

Expected successful scheduler log example:

```text
[SOUND] Гімн України
```

## Ingress handoff

The application is ready behind:

```text
192.168.0.31:33080
```

External reverse proxy or ingress should forward the public host to that port.
