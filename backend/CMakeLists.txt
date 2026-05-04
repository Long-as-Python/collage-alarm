cmake_minimum_required(VERSION 3.10)
project(collage-alarm)

# nlohmann_json's upstream CMake project still declares an older minimum, so
# CMake 4.x needs this compatibility hint when FetchContent configures it.
set(CMAKE_POLICY_VERSION_MINIMUM 3.5)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

include(FetchContent)
FetchContent_Declare(
  json
  URL https://github.com/nlohmann/json/releases/download/v3.11.2/json.tar.xz
)
FetchContent_MakeAvailable(json)

FetchContent_Declare(
  httplib
  URL https://github.com/yhirose/cpp-httplib/archive/refs/tags/v0.18.3.tar.gz
)
FetchContent_MakeAvailable(httplib)

set(SOURCES
  src/main.cpp
  src/server.cpp
  src/authService.cpp
  src/scheduleService.cpp
  src/alarmService.cpp
)

add_executable(collage-alarm ${SOURCES})

target_link_libraries(collage-alarm PRIVATE nlohmann_json::nlohmann_json)
target_include_directories(collage-alarm PRIVATE 
  ${CMAKE_CURRENT_SOURCE_DIR}/include
  ${nlohmann_json_SOURCE_DIR}/include
  ${httplib_SOURCE_DIR}
)
