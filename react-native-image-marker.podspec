require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

Pod::Spec.new do |s|
  s.name         = "react-native-image-marker"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "11.0" }
  s.source       = { :git => "https://github.com/JimmyDaddy/react-native-image-marker.git", :tag => "#{s.version}" }

  # Conditional source files based on architecture
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    s.source_files = "ios/**/*.{h,m,mm,swift}", "specs/**/*.{h,cpp,mm}"
  else
    s.source_files = "ios/RCTImageMarker/**/*.{h,m,mm,swift}"
  end

  s.dependency "React-Core"

  # New Architecture configuration
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    s.compiler_flags = folly_compiler_flags + " -DRCT_NEW_ARCH_ENABLED=1"
    s.pod_target_xcconfig = {
        "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\" \"$(PODS_ROOT)/DoubleConversion\" \"$(PODS_ROOT)/RCT-Folly\" \"$(PODS_ROOT)/Headers/Private/React-Core\"",
        "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1",
        "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
        "DEFINES_MODULE" => "YES",
        "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "react-native-image-marker-Swift.h"
    }
    
    # TurboModule dependencies
    s.dependency "React-Codegen"
    s.dependency "RCT-Folly"
    s.dependency "RCTRequired"
    s.dependency "RCTTypeSafety"
    s.dependency "ReactCommon/turbomodule/core"
    
    # Additional new architecture dependencies
    s.dependency "React-jsi"
    s.dependency "React-logger"
    s.dependency "React-perflogger"
    s.dependency "React-utils"
    
    # Fabric dependencies (for future Fabric integration)
    s.dependency "React-graphics"
    s.dependency "React-debug"
  else
    # Legacy architecture configuration
    s.pod_target_xcconfig = {
        "DEFINES_MODULE" => "YES",
        "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "react-native-image-marker-Swift.h"
    }
  end

  # Codegen configuration for new architecture
  s.script_phase = {
    :name => 'Generate Specs',
    :script => 'WITH_ENVIRONMENT="../node_modules/react-native/scripts/xcode/with-environment.sh"
                CODEGEN_REPO_PATH="$REACT_NATIVE_PATH/packages/react-native-codegen"
                CODEGEN_NPM_PATH="$REACT_NATIVE_PATH/../react-native-codegen"
                CODEGEN_CLI_PATH=""
                
                if [ -d "$CODEGEN_REPO_PATH" ]; then
                  CODEGEN_CLI_PATH=$(cd "$CODEGEN_REPO_PATH" && pwd)
                elif [ -d "$CODEGEN_NPM_PATH" ]; then
                  CODEGEN_CLI_PATH=$(cd "$CODEGEN_NPM_PATH" && pwd)
                else
                  echo "error: Could not determine react-native-codegen location. Try running \'yarn install\' or \'npm install\' in your project root."
                  exit 1
                fi
                
                if [ "$RCT_NEW_ARCH_ENABLED" = "1" ]; then
                  "$WITH_ENVIRONMENT" "$CODEGEN_CLI_PATH/lib/cli/combine/combine-js-to-schema-cli.js" "$GENERATED_SRCS_DIR" ./specs/
                fi',
    :execution_position => :before_compile,
    :input_files => ["$(SRCROOT)/../specs/NativeImageMarker.ts"],
    :output_files => ["$(DERIVED_FILE_DIR)/react-native-image-marker-generated.mm"],
    :show_env_vars_in_log => true
  } if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
end
