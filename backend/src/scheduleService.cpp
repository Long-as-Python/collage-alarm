#include "scheduleService.h"

namespace
{
json makeSlot(int id, const std::string& startTime, const std::string& endTime, const std::string& soundType = "bell")
{
  return json{{"id", id}, {"startTime", startTime}, {"endTime", endTime}, {"soundType", soundType}};
}
}

ScheduleService::ScheduleService()
{
}

json ScheduleService::getFullSchedule()
{
  json schedule = json::array();

  schedule.push_back(makeSlot(1, "08:30", "09:50"));
  schedule.push_back(makeSlot(2, "10:00", "11:20"));
  schedule.push_back(makeSlot(3, "11:50", "13:10"));
  schedule.push_back(makeSlot(4, "13:20", "14:40"));
  schedule.push_back(makeSlot(5, "15:00", "16:20"));
  schedule.push_back(makeSlot(6, "16:30", "17:50"));
  schedule.push_back(makeSlot(7, "18:00", "19:20"));

  return schedule;
}

json ScheduleService::getShortSchedule()
{
  json schedule = json::array();

  schedule.push_back(makeSlot(1, "08:30", "09:30"));
  schedule.push_back(makeSlot(2, "09:40", "10:40"));
  schedule.push_back(makeSlot(3, "10:50", "11:50"));
  schedule.push_back(makeSlot(4, "12:00", "13:00"));
  schedule.push_back(makeSlot(5, "13:10", "14:10"));
  schedule.push_back(makeSlot(6, "14:20", "15:20"));
  schedule.push_back(makeSlot(7, "15:30", "16:30"));
  schedule.push_back(makeSlot(8, "16:40", "17:40"));

  return schedule;
}

json ScheduleService::getScheduleByType(const std::string& scheduleType)
{
  if (scheduleType == "short")
  {
    return getShortSchedule();
  }

  return getFullSchedule();
}

json ScheduleService::getAllSchedules()
{
  json allSchedules = json::object();
  allSchedules["full"] = getFullSchedule();
  allSchedules["short"] = getShortSchedule();
  return allSchedules;
}