#include "server.h"
#include <cstdlib>
#include <iostream>

namespace
{
std::string getEnvValue(const char* name, const char* fallback)
{
#ifdef _MSC_VER
  char* buffer = nullptr;
  size_t bufferSize = 0;
  if (_dupenv_s(&buffer, &bufferSize, name) == 0 && buffer != nullptr)
  {
    std::string value(buffer);
    free(buffer);
    return value.empty() ? fallback : value;
  }

  if (buffer != nullptr)
  {
    free(buffer);
  }

  return fallback;
#else
  const char* value = std::getenv(name);
  return (value != nullptr && value[0] != '\0') ? value : fallback;
#endif
}

int getPortFromEnv()
{
  return std::atoi(getEnvValue("PORT", "4000").c_str());
}
}

int main()
{
  try
  {
    AppServer server(getPortFromEnv());
    server.start();
  }
  catch (const std::exception& e)
  {
    std::cerr << "Помилка: " << e.what() << std::endl;
    return 1;
  }

  return 0;
}