cmake_minimum_required(VERSION 3.10)
project(pdf_editor_api)

set(CMAKE_CXX_STANDARD 17)

find_package(Drogon REQUIRED)

add_executable(pdf_editor_api main.cc)
target_link_libraries(pdf_editor_api Drogon::Drogon)
