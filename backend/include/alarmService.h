#ifndef ALARM_SERVICE_H
#define ALARM_SERVICE_H

#include <nlohmann/json.hpp>
#include <atomic>
#include <mutex>
#include <set>
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
  std::atomic<bool> airRaidActive{false};
  std::atomic<bool> airRaidMonitorRunning{false};
  std::thread airRaidMonitorThread;
  std::mutex alarmMutex;
  std::string lastTriggerMinuteKey;
  std::set<std::string> triggeredKeysForMinute;

  void normalizeConfig();
  void schedulerLoop();
  void airRaidMonitorLoop();
  void triggerLesson(const json& lesson, bool isEndTrigger = false);
  void triggerSingleEvent(const json& event);
  void sendTriggerToMainSoft(const json& lesson);
  void playSound(const std::string& soundType);
  bool soundExistsUnlocked(const std::string& soundType) const;
  json* findCustomSoundUnlocked(const std::string& soundId);
  const json* findCustomSoundUnlocked(const std::string& soundId) const;

public:
  AlarmService();
  ~AlarmService();
  json getConfig();
  json getAvailableSounds();
  void setConfig(const json& config);
  void setScheduleType(const std::string& scheduleType);
  json addCustomSound(const std::string& name, const std::string& description, const std::vector<std::string>& tags, const std::string& fileName, const std::string& fileContent);
  json updateCustomSound(const std::string& id, const std::string& name, const std::string& description, const std::vector<std::string>& tags);
  void deleteCustomSound(const std::string& id);
  void playAlarm();
  void playHymn();
  void playFireAlarm();
  void triggerManual(const std::string& soundType);
  void restartScheduler();
  json getAirRaidStatus();
  void setAirRaidConfig(const json& config);
  std::string fetchAirRaidRegionsJson();
};

#endif
