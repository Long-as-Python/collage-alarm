#ifndef SERVER_H
#define SERVER_H

#include "alarmService.h"
#include "scheduleService.h"
#include "authService.h"

class AppServer
{
private:
  int port;
  AlarmService alarmService;
  ScheduleService scheduleService;
  AuthService authService;

public:
  AppServer(int port);
  void start();
  void setupRoutes();
};

#endif