package com.jimmydaddy.imagemarker.base

enum class ErrorCode(val value: String) {
  INVALID_PARAMS("INVALID_PARAMS"),
  LOAD_IMAGE_FAILED("LOAD_IMAGE_FAILED"),
  GET_RESOURCE_FAILED("GET_RESOURCE_FAILED"),
  PARAMS_REQUIRED("PARAMS_REQUIRED"),
  NULL_MAP("NULL_MAP");
}
