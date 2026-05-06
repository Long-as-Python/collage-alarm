# collage-alarm TODO

## Критичне / In progress

- [x] Timezone fix — `ENV TZ=Europe/Kyiv` в Dockerfile (готово, потрібен rebuild + deploy)
- [x] Хронологія на сьогодні — фільтр «тільки майбутні події» (готово)

## Повітряна тривога (air-raid feature)

- [ ] **Backend `alarmService.h`** — додати air raid члени:
  - `std::atomic<bool> airRaidActive`
  - `std::atomic<bool> airRaidMonitorRunning`
  - `std::thread airRaidMonitorThread`
  - `void airRaidMonitorLoop()`
  - `json getAirRaidStatus()`
  - `void setAirRaidConfig(const json&)`
  - `std::string fetchAirRaidRegionsJson()`

- [ ] **Backend `alarmService.cpp`**:
  - `normalizeConfig()` — нормалізація секції `airRaid`
  - `playFireAlarm()` — перевіряти `fireSoundId` з конфігу
  - `schedulerLoop()` — пропускати тригери якщо `airRaidActive && !playDuringAlert`
  - Constructor — запускати `airRaidMonitorThread`
  - Destructor — зупиняти `airRaidMonitorThread`
  - Нові методи: `airRaidMonitorLoop()`, `getAirRaidStatus()`, `setAirRaidConfig()`, `fetchAirRaidRegionsJson()`
  - API polling: `api.ukrainealarm.com/api/v3/alerts/{regionId}` кожні 60с
  - При старті тривоги: грати `airRaidSoundId`, `airRaidActive = true`
  - При кінці тривоги: `airRaidActive = false`

- [ ] **Backend `server.cpp`** — нові ендпоінти:
  - `GET  /api/air-raid/status`
  - `POST /api/air-raid/config`
  - `GET  /api/air-raid/regions`

- [ ] **Frontend `types.ts`** — оновити `AirRaidSettings` ✅ (вже зроблено)

- [ ] **Frontend `mock.ts`** — оновити дефолт `airRaid` ✅ (вже зроблено)

- [ ] **Frontend `services.ts`**:
  - Додати `BackendAirRaidStatus` інтерфейс
  - `normalizeAirRaid()` — маппінг нових полів
  - `airRaidService.get()` → `GET /api/air-raid/status`
  - `airRaidService.save()` → `POST /api/air-raid/config`
  - `airRaidService.getRegions()` → `GET /api/air-raid/regions`

- [ ] **Frontend `air-raid.tsx`** — повний реврайт:
  - Статус бейдж (active / спокійно)
  - Toggle увімкнення/вимкнення
  - Input API ключ (type=password)
  - Select регіону (завантажується з API)
  - SoundSelect для звуку повітряної тривоги
  - SoundSelect для звуку пожежної тривоги
  - Toggle «Програвати розклад під час тривоги»
  - Кнопка «Зберегти»

## Deploy

- [ ] Rebuild Docker image з timezone fix
- [ ] `docker save | ssh | docker load` → VM 192.168.0.31
- [ ] Restart контейнера
- [ ] Перевірити `docker exec collage-alarm-backend date` — має показати Europe/Kyiv
