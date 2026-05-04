#ifndef ALARM_SERVICE_H
#define ALARM_SERVICE_H

#include <nlohmann/json.hpp>
#include <string>
#include <vector>

using json = nlohmann::json;

class AlarmService
{
private:
  json alarmConfig;

public:
  AlarmService();
  json getConfig();
  void setConfig(const json& config);
  void setScheduleType(const std::string& scheduleType);
  void playAlarm();
  void playHymn();
  void restartScheduler();
};

#endif