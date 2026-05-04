#include "alarmService.h"
#include <iostream>
#include <ctime>

AlarmService::AlarmService()
{
  alarmConfig = json::object();
  alarmConfig["isEnabled"] = true;
  alarmConfig["scheduleType"] = "full";

  json lessons = json::array();
  lessons.push_back({
    {"startTime", "09:00"},
    {"endTime", "10:30"},
    {"soundType", "hymn"}
  });
  lessons.push_back({
    {"startTime", "10:45"},
    {"endTime", "12:15"},
    {"soundType", "bell"}
  });
  lessons.push_back({
    {"startTime", "12:30"},
    {"endTime", "14:00"},
    {"soundType", "bell"}
  });
  lessons.push_back({
    {"startTime", "14:15"},
    {"endTime", "15:45"},
    {"soundType", "bell"}
  });

  alarmConfig["lessons"] = lessons;
  restartScheduler();
}

json AlarmService::getConfig()
{
  return alarmConfig;
}

void AlarmService::setConfig(const json& config)
{
  alarmConfig = config;
  restartScheduler();
}

void AlarmService::setScheduleType(const std::string& scheduleType)
{
  alarmConfig["scheduleType"] = scheduleType;
}

void AlarmService::playAlarm()
{
  std::cout << "Тривогу активовано" << std::endl;
}

void AlarmService::playHymn()
{
  std::cout << "Гімн України відтворюється о 09:00" << std::endl;
}

void AlarmService::restartScheduler()
{
  if (alarmConfig["isEnabled"])
  {
    std::cout << "Планувальник перезапущено" << std::endl;
  }
}