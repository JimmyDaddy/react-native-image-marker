require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

# Cross-platform version detection for iOS configuration
def detect_react_native_version
  # Try to read from package.json in current project
  package_json_paths = [
    File.join(__dir__, "package.json"),
    File.join(__dir__, "..", "package.json"),
    File.join(__dir__, "..", "..", "package.json")
  ]
  
  package_json_paths.each do |path|
    if File.exist?(path)
      begin
        package_data = JSON.parse(File.read(path))
        rn_version = package_data.dig("dependencies", "react-native") || 
                    package_data.dig("devDependencies", "react-native")
        
        if rn_version
          # Remove version prefixes like ^, ~, >=
          clean_version = rn_version.gsub(/^[\^~>=<]+/, '')
          # Extract major.minor.patch format
          version_match = clean_version.match(/(\d+\.\d+\.\d+)/)
          return version_match[1] if version_match
          
          # Extract major.minor format and add .0
          short_version_match = clean_version.match(/(\d+\.\d+)/)
          return "#{short_version_match[1]}.0" if short_version_match
        end
      rescue JSON::ParserError
        # Continue to next path
      end
    end
  end
  
  # Try to read from node_modules/react-native/package.json
  node_modules_paths = [
    File.join(__dir__, "node_modules", "react-native", "package.json"),
    File.join(__dir__, "..", "node_modules", "react-native", "package.json"),
    File.join(__dir__, "..", "..", "node_modules", "react-native", "package.json")
  ]
  
  node_modules_paths.each do |path|
    if File.exist?(path)
      begin
        rn_package = JSON.parse(File.read(path))
        return rn_package["version"] if rn_package["version"]
      rescue JSON::ParserError
        # Continue to next path
      end
    end
  end
  
  # Default fallback version
  "0.73.0"
end

# Get iOS configuration based on React Native version
def get_ios_config_for_version(version)
  major_minor = version[0, 4] # e.g., "0.73", "0.81"
  
  case major_minor
  when "0.73"
    {
      deployment_target: "13.0",
      swift_version: "5.0",
      xcode_version: "15.0",
      cocoapods_version: "1.12.0"
    }
  when "0.81"
    {
      deployment_target: "13.4",
      swift_version: "5.9",
      xcode_version: "15.3",
      cocoapods_version: "1.15.0"
    }
  else
    # For 0.8x and newer versions
    if version.start_with?("0.8")
      {
        deployment_target: "14.0",
        swift_version: "5.10",
        xcode_version: "16.0",
        cocoapods_version: "1.16.0"
      }
    else
      # Default to latest strategy for unknown versions
      {
        deployment_target: "14.0",
        swift_version: "5.10",
        xcode_version: "16.0",
        cocoapods_version: "1.16.0"
      }
    end
  end
end

# Detect current React Native version and get configuration
rn_version = detect_react_native_version
ios_config = get_ios_config_for_version(rn_version)

puts "Detected React Native version: #{rn_version}"
puts "Using iOS deployment target: #{ios_config[:deployment_target]}"

Pod::Spec.new do |s|
  s.name         = "react-native-image-marker"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  # Use version-specific iOS deployment target
  s.platforms    = { :ios => ios_config[:deployment_target] }
  s.source       = { :git => "https://github.com/JimmyDaddy/react-native-image-marker.git", :tag => "#{s.version}" }

  # Version-specific Swift version requirement
  s.swift_version = ios_config[:swift_version]

  # Conditional source files based on architecture
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    s.source_files = "ios/**/*.{h,m,mm,swift}", "specs/**/*.{h,cpp,mm}"
  else
    s.source_files = "ios/RCTImageMarker/**/*.{h,m,mm,swift}"
  end

  s.dependency "React-Core"

  # New Architecture configuration with version-specific dependencies
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    s.compiler_flags = folly_compiler_flags + " -DRCT_NEW_ARCH_ENABLED=1"
    
    # Version-specific pod target configuration
    base_config = {
      "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\" \"$(PODS_ROOT)/DoubleConversion\" \"$(PODS_ROOT)/RCT-Folly\" \"$(PODS_ROOT)/Headers/Private/React-Core\"",
      "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1",
      "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
      "DEFINES_MODULE" => "YES",
      "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "react-native-image-marker-Swift.h",
      "SWIFT_VERSION" => ios_config[:swift_version]
    }
    
    # Add version-specific configurations
    if rn_version.start_with?("0.81") || rn_version.start_with?("0.8")
      base_config["CLANG_CXX_LANGUAGE_STANDARD"] = "c++20"
      base_config["OTHER_CPLUSPLUSFLAGS"] += " -std=c++20"
    end
    
    s.pod_target_xcconfig = base_config
    
    # TurboModule dependencies - version specific
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
    
    # Version-specific additional dependencies
    if rn_version.start_with?("0.81") || rn_version.start_with?("0.8")
      s.dependency "React-featureflags"
      s.dependency "React-rendererdebug"
    end
  else
    # Legacy architecture configuration with version-specific settings
    base_legacy_config = {
      "DEFINES_MODULE" => "YES",
      "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "react-native-image-marker-Swift.h",
      "SWIFT_VERSION" => ios_config[:swift_version]
    }
    
    s.pod_target_xcconfig = base_legacy_config
  end

  # Version-specific Codegen configuration for new architecture
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
    # Determine codegen script based on React Native version
    codegen_script = if rn_version.start_with?("0.73")
      # React Native 0.73 codegen script
      'WITH_ENVIRONMENT="../node_modules/react-native/scripts/xcode/with-environment.sh"
       CODEGEN_REPO_PATH="$REACT_NATIVE_PATH/packages/react-native-codegen"
       CODEGEN_NPM_PATH="$REACT_NATIVE_PATH/../react-native-codegen"
       CODEGEN_CLI_PATH=""
       
       if [ -d "$CODEGEN_REPO_PATH" ]; then
         CODEGEN_CLI_PATH=$(cd "$CODEGEN_REPO_PATH" && pwd)
       elif [ -d "$CODEGEN_NPM_PATH" ]; then
         CODEGEN_CLI_PATH=$(cd "$CODEGEN_NPM_PATH" && pwd)
       else
         echo "error: Could not determine react-native-codegen location for RN 0.73. Try running \'yarn install\' or \'npm install\' in your project root."
         exit 1
       fi
       
       "$WITH_ENVIRONMENT" "$CODEGEN_CLI_PATH/lib/cli/combine/combine-js-to-schema-cli.js" "$GENERATED_SRCS_DIR" ./specs/'
    elsif rn_version.start_with?("0.81")
      # React Native 0.81 codegen script
      'WITH_ENVIRONMENT="../node_modules/react-native/scripts/xcode/with-environment.sh"
       CODEGEN_REPO_PATH="$REACT_NATIVE_PATH/packages/react-native-codegen"
       CODEGEN_NPM_PATH="../node_modules/@react-native/codegen"
       CODEGEN_CLI_PATH=""
       
       if [ -d "$CODEGEN_NPM_PATH" ]; then
         CODEGEN_CLI_PATH=$(cd "$CODEGEN_NPM_PATH" && pwd)
       elif [ -d "$CODEGEN_REPO_PATH" ]; then
         CODEGEN_CLI_PATH=$(cd "$CODEGEN_REPO_PATH" && pwd)
       else
         echo "error: Could not determine react-native-codegen location for RN 0.81. Try running \'yarn install\' or \'npm install\' in your project root."
         exit 1
       fi
       
       "$WITH_ENVIRONMENT" "$CODEGEN_CLI_PATH/lib/cli/combine/combine-js-to-schema-cli.js" "$GENERATED_SRCS_DIR" ./specs/'
    else
      # React Native 0.8x and newer codegen script
      'WITH_ENVIRONMENT="../node_modules/react-native/scripts/xcode/with-environment.sh"
       CODEGEN_NPM_PATH="../node_modules/@react-native/codegen"
       CODEGEN_CLI_PATH=""
       
       if [ -d "$CODEGEN_NPM_PATH" ]; then
         CODEGEN_CLI_PATH=$(cd "$CODEGEN_NPM_PATH" && pwd)
       else
         echo "error: Could not determine @react-native/codegen location for RN 0.8x. Try running \'yarn install\' or \'npm install\' in your project root."
         exit 1
       fi
       
       "$WITH_ENVIRONMENT" "$CODEGEN_CLI_PATH/lib/cli/combine/combine-js-to-schema-cli.js" "$GENERATED_SRCS_DIR" ./specs/'
    end
    
    s.script_phase = {
      :name => 'Generate Specs',
      :script => codegen_script,
      :execution_position => :before_compile,
      :input_files => ["$(SRCROOT)/../specs/NativeImageMarker.ts"],
      :output_files => ["$(DERIVED_FILE_DIR)/react-native-image-marker-generated.mm"],
      :show_env_vars_in_log => true
    }
  end

  # Version compatibility checks
  s.prepare_command = <<-CMD
    echo "Configuring react-native-image-marker for React Native #{rn_version}"
    echo "iOS deployment target: #{ios_config[:deployment_target]}"
    echo "Swift version: #{ios_config[:swift_version]}"
    echo "Recommended Xcode version: #{ios_config[:xcode_version]}"
    echo "Recommended CocoaPods version: #{ios_config[:cocoapods_version]}"
    
    # Check CocoaPods version compatibility
    current_cocoapods_version=$(pod --version 2>/dev/null || echo "unknown")
    if [ "$current_cocoapods_version" != "unknown" ]; then
      echo "Current CocoaPods version: $current_cocoapods_version"
      # Add version compatibility warnings if needed
      case "#{rn_version}" in
        0.73*)
          if [ "$(printf '%s\n' "1.12.0" "$current_cocoapods_version" | sort -V | head -n1)" != "1.12.0" ]; then
            echo "Warning: CocoaPods version $current_cocoapods_version may not be fully compatible with React Native #{rn_version}. Recommended: #{ios_config[:cocoapods_version]} or later."
          fi
          ;;
        0.81*)
          if [ "$(printf '%s\n' "1.15.0" "$current_cocoapods_version" | sort -V | head -n1)" != "1.15.0" ]; then
            echo "Warning: CocoaPods version $current_cocoapods_version may not be fully compatible with React Native #{rn_version}. Recommended: #{ios_config[:cocoapods_version]} or later."
          fi
          ;;
        0.8*)
          if [ "$(printf '%s\n' "1.16.0" "$current_cocoapods_version" | sort -V | head -n1)" != "1.16.0" ]; then
            echo "Warning: CocoaPods version $current_cocoapods_version may not be fully compatible with React Native #{rn_version}. Recommended: #{ios_config[:cocoapods_version]} or later."
          fi
          ;;
      esac
    fi
  CMD
end
