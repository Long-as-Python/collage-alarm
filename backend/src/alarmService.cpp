#include "alarmService.h"
#include <iostream>
#include <ctime>
#include <chrono>
#include <cstdlib>
#include <httplib.h>
#ifdef _WIN32
#include <windows.h>
#endif

namespace
{
std::string currentDateTimeKey()
{
  std::time_t now = std::time(nullptr);
  std::tm localTime{};
#ifdef _WIN32
  localtime_s(&localTime, &now);
#else
  localTime = *std::localtime(&now);
#endif

  char buffer[32];
  std::strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M", &localTime);
  return buffer;
}

std::string currentTimeHHMM()
{
  std::time_t now = std::time(nullptr);
  std::tm localTime{};
#ifdef _WIN32
  localtime_s(&localTime, &now);
#else
  localTime = *std::localtime(&now);
#endif

  char buffer[16];
  std::strftime(buffer, sizeof(buffer), "%H:%M", &localTime);
  return buffer;
}

bool lessonStartsNow(const json& lesson, const std::string& nowTime)
{
  return lesson.contains("startTime") && lesson["startTime"].is_string() && lesson["startTime"].get<std::string>() == nowTime;
}
}

namespace
{
json makeSlot(int id, const std::string& startTime, const std::string& endTime, const std::string& soundType)
{
  return json{{"id", id}, {"startTime", startTime}, {"endTime", endTime}, {"soundType", soundType}};
}

json makeDefaultFullSchedule()
{
  json schedule = json::array();
  schedule.push_back(makeSlot(1, "08:30", "09:50", "bell"));
  schedule.push_back(makeSlot(2, "10:00", "11:20", "bell"));
  schedule.push_back(makeSlot(3, "11:50", "13:10", "bell"));
  schedule.push_back(makeSlot(4, "13:20", "14:40", "bell"));
  schedule.push_back(makeSlot(5, "15:00", "16:20", "bell"));
  schedule.push_back(makeSlot(6, "16:30", "17:50", "bell"));
  schedule.push_back(makeSlot(7, "18:00", "19:20", "bell"));
  schedule.push_back(makeSlot(8, "19:30", "20:50", "bell"));
  return schedule;
}

json makeDefaultShortSchedule()
{
  json schedule = json::array();
  schedule.push_back(makeSlot(1, "08:30", "09:30", "bell"));
  schedule.push_back(makeSlot(2, "09:40", "10:40", "bell"));
  schedule.push_back(makeSlot(3, "10:50", "11:50", "bell"));
  schedule.push_back(makeSlot(4, "12:00", "13:00", "bell"));
  schedule.push_back(makeSlot(5, "13:10", "14:10", "bell"));
  schedule.push_back(makeSlot(6, "14:20", "15:20", "bell"));
  schedule.push_back(makeSlot(7, "15:30", "16:30", "bell"));
  schedule.push_back(makeSlot(8, "16:40", "17:40", "bell"));
  return schedule;
}
}

AlarmService::AlarmService()
  : schedulerRunning(true)
{
  alarmConfig = json::object();
  alarmConfig["isEnabled"] = true;
  alarmConfig["scheduleType"] = "full";
  const char* mainSoftApiUrl = std::getenv("MAIN_SOFT_API_URL");
  alarmConfig["mainSoftApiUrl"] = mainSoftApiUrl != nullptr ? mainSoftApiUrl : "";
  alarmConfig["schedules"] = json::object();
  alarmConfig["schedules"]["full"] = makeDefaultFullSchedule();
  alarmConfig["schedules"]["short"] = makeDefaultShortSchedule();
  alarmConfig["lessons"] = alarmConfig["schedules"]["full"];
  restartScheduler();
  schedulerThread = std::thread(&AlarmService::schedulerLoop, this);
}

AlarmService::~AlarmService()
{
  schedulerRunning = false;
  if (schedulerThread.joinable())
  {
    schedulerThread.join();
  }
}

json AlarmService::getConfig()
{
  std::lock_guard<std::mutex> lock(alarmMutex);
  return alarmConfig;
}

void AlarmService::setConfig(const json& config)
{
  std::lock_guard<std::mutex> lock(alarmMutex);
  alarmConfig = config;
  normalizeConfig();
  restartScheduler();
}

void AlarmService::setScheduleType(const std::string& scheduleType)
{
  std::lock_guard<std::mutex> lock(alarmMutex);
  alarmConfig["scheduleType"] = scheduleType;
  if (alarmConfig.contains("schedules") && alarmConfig["schedules"].is_object())
  {
    auto& schedules = alarmConfig["schedules"];
    if (schedules.contains(scheduleType) && schedules[scheduleType].is_array())
    {
      alarmConfig["lessons"] = schedules[scheduleType];
    }
  }
  normalizeConfig();
}

void AlarmService::playAlarm()
{
  std::cout << "[SOUND] Дзвінок" << std::endl;
#ifdef _WIN32
  Beep(880, 500);
#else
  std::cout << '\a' << std::flush;
#endif
}

void AlarmService::playHymn()
{
  std::cout << "[SOUND] Гімн України" << std::endl;
#ifdef _WIN32
  Beep(523, 250);
  Beep(659, 250);
  Beep(784, 500);
#else
  std::cout << '\a' << std::flush;
#endif
}

void AlarmService::restartScheduler()
{
  if (alarmConfig["isEnabled"])
  {
    std::cout << "Планувальник перезапущено" << std::endl;
  }
}

void AlarmService::normalizeConfig()
{
  if (!alarmConfig.contains("scheduleType") || !alarmConfig["scheduleType"].is_string())
  {
    alarmConfig["scheduleType"] = "full";
  }

  if (!alarmConfig.contains("schedules") || !alarmConfig["schedules"].is_object())
  {
    alarmConfig["schedules"] = json::object();
  }

  const auto scheduleType = alarmConfig["scheduleType"].get<std::string>();
  auto& schedules = alarmConfig["schedules"];

  if (alarmConfig.contains("lessons") && alarmConfig["lessons"].is_array())
  {
    schedules[scheduleType] = alarmConfig["lessons"];
  }
  else if (schedules.contains(scheduleType) && schedules[scheduleType].is_array())
  {
    alarmConfig["lessons"] = schedules[scheduleType];
  }
  else if (scheduleType == "short")
  {
    schedules["short"] = makeDefaultShortSchedule();
    alarmConfig["lessons"] = schedules["short"];
  }
  else
  {
    schedules["full"] = makeDefaultFullSchedule();
    alarmConfig["lessons"] = schedules["full"];
  }
}

void AlarmService::triggerLesson(const json& lesson)
{
  const auto soundType = lesson.value("soundType", "bell");

  if (soundType == "hymn")
  {
    playHymn();
    sendTriggerToMainSoft(lesson);
    return;
  }

  playAlarm();
  sendTriggerToMainSoft(lesson);
}

void AlarmService::sendTriggerToMainSoft(const json& lesson)
{
  const auto apiUrl = alarmConfig.value("mainSoftApiUrl", "");
  if (apiUrl.empty())
  {
    std::cout << "[API] Main soft URL not configured, local trigger only" << std::endl;
    return;
  }

  std::cout << "[API] Trigger sent to main soft: " << apiUrl << std::endl;
  std::cout << "[API] Lesson start: " << lesson.value("startTime", "") << std::endl;
}

void AlarmService::schedulerLoop()
{
  while (schedulerRunning)
  {
    try
    {
      json configSnapshot;
      {
        std::lock_guard<std::mutex> lock(alarmMutex);
        configSnapshot = alarmConfig;
      }

      if (configSnapshot.value("isEnabled", true) && configSnapshot.contains("lessons") && configSnapshot["lessons"].is_array())
      {
        const auto nowTime = currentTimeHHMM();
        const auto nowKey = currentDateTimeKey();

        for (const auto& lesson : configSnapshot["lessons"])
        {
          const auto lessonKey = nowKey + "|" + lesson.value("startTime", "");

          if (lessonStartsNow(lesson, nowTime) && lastTriggeredKey != lessonKey)
          {
            lastTriggeredKey = lessonKey;
            triggerLesson(lesson);
          }
        }
      }
    }
    catch (const std::exception& e)
    {
      std::cout << "Помилка планувальника: " << e.what() << std::endl;
    }

    std::this_thread::sleep_for(std::chrono::seconds(20));
  }
}