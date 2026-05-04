# Collage Alarm

Collage Alarm is a small college bell scheduling system with a C++ HTTP backend and a React admin UI. Administrators can enable or disable signals, choose a schedule type, edit lesson times, and assign a sound type to each lesson.

## Project Structure

```text
.
├── backend/             # C++17 API server
│   ├── include/         # Service headers
│   ├── src/             # API, auth, schedule, and alarm services
│   └── CMakeLists.txt   # Backend build configuration
├── frontend/            # React admin UI
│   ├── public/
│   └── src/
├── docker-compose.yml   # Backend + frontend development stack
├── docker-compose.macos-audio.yml  # macOS Docker sound bridge override
├── docker-compose.linux-audio.yml  # Linux ALSA device override
├── scripts/             # Local helper scripts
└── test-backend.ps1     # Windows backend connectivity smoke test
```

## Features

- Admin login protected by an environment-configurable password.
- Full and short schedule presets.
- Editable custom lesson list through the admin panel.
- Immediate fire alarm trigger from the admin panel.
- Predefined bell, hymn, fire alarm, and custom sound presets.
- Extensible backend sound catalog consumed by the admin UI.
- Backend scheduler that checks lesson start and end times every minute.
- Cross-platform fallback sound commands for macOS, Windows, and Linux.
- Overrideable playback commands for deployment-specific audio setups.

## Requirements

### Backend

- CMake 3.10 or newer
- C++17 compiler
- Network access during the first configure step, because CMake downloads:
  - `nlohmann/json`
  - `cpp-httplib`

### Frontend

- Node.js 18 or newer is recommended
- npm

### Docker

- Docker
- Docker Compose

## Environment Variables

Create a local `.env` file at the repository root when running with Docker Compose, or export the variables in your shell when running services manually.

```env
PORT=4000
ADMIN_PASSWORD=admin123
JWT_SECRET=secret-key-collage-alarm
REACT_APP_API_URL=http://localhost:4000/api

# Optional sound command overrides
ALARM_BELL_COMMAND=
ALARM_HYMN_COMMAND=
ALARM_FIRE_COMMAND=
ALARM_CUSTOM_COMMAND=
```

| Variable | Default | Used by | Description |
| --- | --- | --- | --- |
| `PORT` | `4000` | Backend | HTTP port for the API server. |
| `ADMIN_PASSWORD` | `admin123` | Backend | Password accepted by the admin login endpoint. |
| `JWT_SECRET` | `secret-key-collage-alarm` | Backend | Currently loaded by auth service for future token handling. |
| `REACT_APP_API_URL` | `http://localhost:4000/api` | Frontend | API base URL used by the React app. |
| `ALARM_BELL_COMMAND` | Platform fallback | Backend | Shell command run for bell playback. |
| `ALARM_HYMN_COMMAND` | Platform fallback | Backend | Shell command run for hymn playback. |
| `ALARM_FIRE_COMMAND` | Platform fallback | Backend | Shell command run for immediate fire alarm playback. |
| `ALARM_CUSTOM_COMMAND` | Platform fallback | Backend | Shell command run for custom sound playback. |

## Running Locally

### Backend

```bash
cmake -S backend -B backend/build
cmake --build backend/build
./backend/build/collage-alarm
```

The backend listens on `http://localhost:4000` unless `PORT` is set.

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000`.

## Running With Docker Compose

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

The default Compose file is portable and starts on macOS, Windows, and Linux. It does not expose host sound devices.

For sound on macOS while the backend runs in Docker, start the host sound bridge in one terminal:

```bash
python3 scripts/macos-sound-bridge.py
```

Then start Docker Compose with the macOS audio override in another terminal:

```bash
docker compose -f docker-compose.yml -f docker-compose.macos-audio.yml up --build
```

The override makes the Linux container call the bridge through `host.docker.internal`, and the bridge plays sounds on the Mac with `afplay`.

On Linux hosts with ALSA devices, start with the audio override:

```bash
docker compose -f docker-compose.yml -f docker-compose.linux-audio.yml up --build
```

The Linux override exposes the host ALSA device to the backend container:

- `/dev/snd:/dev/snd`

Docker Desktop on macOS and Windows does not expose host audio devices the same way. For actual speaker output on macOS, use the bridge above or run the backend directly on the host so it can use the built-in `afplay` fallback.

If a Linux host uses PulseAudio or PipeWire Pulse and you want `paplay` instead of the ALSA fallback, add the host Pulse socket and cookie mounts for that deployment and set `PULSE_SERVER`.

## Admin Access

Open `http://localhost:3000`, enter the admin password, and sign in.

Default password:

```text
admin123
```

Set `ADMIN_PASSWORD` in production or shared environments.

## Sound Playback

The backend plays sounds when a configured lesson starts or ends. It compares lesson `startTime` and `endTime` values to the local system time in `HH:MM` format and triggers at most once per minute.

Sounds are predefined by the backend catalog and exposed to the frontend through `/api/alarms/sounds`. The admin panel renders its sound selector from that API instead of hardcoding sound options in React.

Default playback behavior:

- macOS:
  - Bell: `afplay /System/Library/Sounds/Glass.aiff`
  - Hymn: `osascript -e 'beep 3'`
  - Fire alarm: alternating `Sosumi.aiff` and `Glass.aiff`
- Windows:
  - Bell: PowerShell console beep
  - Hymn: short sequence of PowerShell console beeps
  - Fire alarm: alternating high and low PowerShell console beeps
- Linux:
  - Tries `paplay`
  - Falls back to `aplay`
  - Falls back to terminal bell output

For reliable real-world playback, set explicit commands:

```bash
export ALARM_BELL_COMMAND='afplay /path/to/bell.mp3'
export ALARM_HYMN_COMMAND='afplay /path/to/hymn.mp3'
export ALARM_FIRE_COMMAND='afplay /path/to/fire-alarm.mp3'
export ALARM_CUSTOM_COMMAND='afplay /path/to/custom.mp3'
./backend/build/collage-alarm
```

Linux example:

```bash
export ALARM_BELL_COMMAND='paplay /home/alarm/sounds/bell.oga'
```

Windows PowerShell example:

```powershell
$env:ALARM_BELL_COMMAND = 'powershell -NoProfile -Command "[console]::beep(1000,700)"'
```

## API Endpoints

Base URL:

```text
http://localhost:4000/api
```

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/login` | Student login endpoint. |
| `POST` | `/auth/admin-login` | Admin login with JSON body `{ "password": "..." }`. |
| `GET` | `/auth/verify` | Basic auth verification response. |
| `GET` | `/schedule/all` | Returns full and short schedule presets. |
| `GET` | `/schedule/current` | Returns the schedule for the configured schedule type. |
| `GET` | `/alarms/config` | Returns current alarm configuration. |
| `GET` | `/alarms/sounds` | Returns predefined sound presets available to schedules. |
| `POST` | `/alarms/fire` | Plays the fire alarm immediately. |
| `POST` | `/alarms/config` | Replaces alarm configuration and restarts scheduler if enabled. |
| `POST` | `/alarms/schedule-type` | Updates `scheduleType`. |
| `GET` | `/alarms/current` | Returns backend local time. |

Example: update alarm configuration for a quick local test.

```bash
now=$(date +%H:%M)
curl -X POST http://localhost:4000/api/alarms/config \
  -H 'Content-Type: application/json' \
  -d "{
    \"isEnabled\": true,
    \"scheduleType\": \"full\",
    \"lessons\": [
      {
        \"startTime\": \"$now\",
        \"endTime\": \"23:59\",
        \"soundType\": \"bell\"
      }
    ]
  }"
```

## Alarm Configuration Shape

```json
{
  "isEnabled": true,
  "scheduleType": "full",
  "lessons": [
    {
      "startTime": "09:00",
      "endTime": "10:30",
      "soundType": "hymn"
    },
    {
      "startTime": "10:45",
      "endTime": "12:15",
      "soundType": "bell"
    }
  ]
}
```

Supported sound types:

- `bell`
- `hymn`
- `fire_alarm`
- `custom`

The backend normalizes unknown sound types to the default sound when saving configuration.

## Extending Sounds

Add new predefined sounds in `backend/src/alarmService.cpp` by extending `soundCatalog()`:

```cpp
static const std::vector<SoundDefinition> sounds = {
  {"bell", "Дзвінок", "ALARM_BELL_COMMAND"},
  {"hymn", "Гімн України", "ALARM_HYMN_COMMAND"},
  {"fire_alarm", "Пожежна тривога", "ALARM_FIRE_COMMAND"},
  {"custom", "Власний сигнал", "ALARM_CUSTOM_COMMAND"},
  {"warning", "Попереджувальний сигнал", "ALARM_WARNING_COMMAND"}
};
```

After adding a sound:

1. Rebuild the backend.
2. Set the matching command environment variable if the fallback command is not enough.
3. Refresh the admin UI; the new sound appears in the selector through `/api/alarms/sounds`.

## Troubleshooting

### Backend is not reachable

Check that port `4000` is listening and that no other process is using it.

```bash
curl http://localhost:4000/api/auth/verify
```

On Windows, you can also run:

```powershell
.\test-backend.ps1
```

### Admin login fails

The default password is `admin123`. If `ADMIN_PASSWORD` is set, use that value instead.

### Sound does not play

1. Confirm the backend is running on the machine that has access to speakers.
2. Confirm alarms are enabled in the admin panel.
3. Confirm the lesson time matches the backend machine's local time.
4. Test with a command override:

   ```bash
   export ALARM_BELL_COMMAND='touch /tmp/collage-alarm-bell-fired'
   ./backend/build/collage-alarm
   ```

   Then post a lesson for the current minute and check whether `/tmp/collage-alarm-bell-fired` was created. If it was created, scheduling works and the issue is the audio command or environment.

5. For Docker audio, use a Linux host with `/dev/snd` and the `docker-compose.linux-audio.yml` override. On macOS, run the backend directly on the host for actual speaker output.

### CMake dependency warnings

CMake may print development warnings from fetched dependencies. These warnings do not prevent the backend from building.

## Development Notes

- The backend keeps configuration in memory; it does not persist changes after restart.
- The scheduler restarts when `/api/alarms/config` is updated.
- The scheduler checks the local system clock, so host timezone and clock accuracy matter.
- The frontend stores the login token and role in `localStorage`.
- Current token verification is minimal and should be hardened before production use.

## Validation Commands

```bash
cmake -S backend -B backend/build
cmake --build backend/build
```

Optional frontend build:

```bash
cd frontend
npm install
npm run build
```
