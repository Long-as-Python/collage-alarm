# Kubernetes — collage-alarm

> **Status:** these manifests are **not** the current production deployment path. The live instance runs directly on VM `192.168.0.31` with Docker and is exposed through port `33080`. See `../docs-vm-deployment.md` for the real deployed topology and operations notes.

Готові маніфести знаходяться у папці `k8s/`. Структура:

```
k8s/
├── kustomization.yaml        # точка входу — apply все одною командою
├── namespace.yaml            # namespace: collage-alarm
├── configmap.yaml            # env-конфіг (не секретний)
├── secret.yaml               # ADMIN_PASSWORD + JWT_SECRET (base64)
├── backend-deployment.yaml   # C++ бекенд, порт 4000
├── backend-service.yaml      # ClusterIP → backend
├── frontend-deployment.yaml  # React/Vite фронтенд, порт 3000
├── frontend-service.yaml     # NodePort → frontend
└── ingress.yaml              # nginx-ingress, маршрутизація /api → backend, / → frontend
```

---

## Швидкий старт

### 1. Зібрати і завантажити образи

**Minikube:**
```bash
eval $(minikube docker-env)
docker compose build
```

**Реальний кластер — запушити в реєстр:**
```bash
docker tag collage-alarm-backend:latest registry.example.com/collage-alarm-backend:1.0.0
docker tag collage-alarm-frontend:latest registry.example.com/collage-alarm-frontend:1.0.0
docker push registry.example.com/collage-alarm-backend:1.0.0
docker push registry.example.com/collage-alarm-frontend:1.0.0
# потім розкоментувати images: у k8s/kustomization.yaml
```

### 2. Оновити секрети (перед деплоєм)

Або редагуй `k8s/secret.yaml` (base64-значення), або виконай:
```bash
kubectl create secret generic collage-alarm-secret \
  --namespace=collage-alarm \
  --from-literal=ADMIN_PASSWORD='ваш-пароль' \
  --from-literal=JWT_SECRET='ваш-jwt-секрет' \
  --dry-run=client -o yaml > k8s/secret.yaml
```
> ⚠️ Не комітьте `secret.yaml` з реальними значеннями у git.

### 3. Задеплоїти все

```bash
kubectl apply -k k8s/
```

### 4. Перевірити стан

```bash
kubectl get all -n collage-alarm
```

### 5. Відкрити UI

**Minikube:**
```bash
minikube service frontend-service -n collage-alarm
```

**NodePort вручну:**
```bash
kubectl get svc frontend-service -n collage-alarm
# знайти NodePort (30000-32767) і відкрити http://<node-ip>:<nodeport>
```

**Ingress (після налаштування домену):**
Змінити `host: collage-alarm.example.com` в `k8s/ingress.yaml` на реальний домен.

---

## Примітки щодо аудіо

Бекенд виконує `aplay`/`ffplay` для відтворення сигналів. У Kubernetes це потребує доступу до `/dev/snd` вузла. Для production-середовища рекомендується виконувати відтворення звуку окремим сервісом на вузлі (DaemonSet або systemd-юніт), а бекенд надсилає йому команду через HTTP/UNIX-сокет.
