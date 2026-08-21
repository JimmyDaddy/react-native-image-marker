cmake_minimum_required(VERSION 3.13)
project(image_marker_core LANGUAGES CXX)

add_library(
  image-marker-core
  SHARED
  ImageMarkerCoreJni.cpp
)

target_compile_features(image-marker-core PRIVATE cxx_std_17)
if(ANDROID)
  target_link_options(
    image-marker-core
    PRIVATE
    "-Wl,-z,max-page-size=16384"
    "-Wl,-z,common-page-size=16384"
  )
endif()
target_include_directories(
  image-marker-core
  PRIVATE
  "${CMAKE_CURRENT_SOURCE_DIR}/../../../../cpp"
)
