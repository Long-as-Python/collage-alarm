#ifndef ALARM_SERVICE_H
#define ALARM_SERVICE_H

#include <nlohmann/json.hpp>
#include <atomic>
#include <mutex>
#include <thread>
#include <string>
#include <vector>

using json = nlohmann::json;

class AlarmService
{
private:
  json alarmConfig;
  std::atomic<bool> schedulerRunning;
  std::thread schedulerThread;
  std::mutex alarmMutex;
  std::string lastTriggeredKey;

  void normalizeConfig();
  void schedulerLoop();
  void triggerLesson(const json& lesson);
  void sendTriggerToMainSoft(const json& lesson);

public:
  AlarmService();
  ~AlarmService();
  json getConfig();
  void setConfig(const json& config);
  void setScheduleType(const std::string& scheduleType);
  void playAlarm();
  void playHymn();
  void restartScheduler();
};

#endif