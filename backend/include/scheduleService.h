#ifndef SCHEDULE_SERVICE_H
#define SCHEDULE_SERVICE_H

#include <nlohmann/json.hpp>
#include <string>
#include <vector>

using json = nlohmann::json;

class ScheduleService
{
public:
  ScheduleService();
  json getFullSchedule();
  json getShortSchedule();
  json getScheduleByType(const std::string& scheduleType);
  json getAllSchedules();
};

#endif
