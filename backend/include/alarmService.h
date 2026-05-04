#ifndef ALARM_SERVICE_H
#define ALARM_SERVICE_H

#include <nlohmann/json.hpp>
#include <atomic>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

using json = nlohmann::json;

class AlarmService
{
private:
  json alarmConfig;
  std::atomic<bool> schedulerRunning{false};
  std::thread schedulerThread;
  std::mutex alarmMutex;
  std::string lastTriggeredKey;

  void normalizeConfig();
  void schedulerLoop();
  void triggerLesson(const json& lesson);
  void sendTriggerToMainSoft(const json& lesson);
  void playSound(const std::string& soundType);

public:
  AlarmService();
  ~AlarmService();
  json getConfig();
  json getAvailableSounds();
  void setConfig(const json& config);
  void setScheduleType(const std::string& scheduleType);
  void playAlarm();
  void playHymn();
  void playFireAlarm();
  void restartScheduler();
};

#endif
