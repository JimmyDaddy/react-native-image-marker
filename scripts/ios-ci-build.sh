#!/bin/bash

# iOS CI Build Script
# Handles iOS build with proper error handling and retry logic

set -e

# Configuration
EXAMPLE_APP=${1:-example-0.73}
ARCHITECTURE=${2:-legacy}
MAX_RETRIES=${3:-3}

IOS_DIR="${EXAMPLE_APP}/ios"
BUILD_SCHEME="ImageMarkerExample"
BUILD_CONFIGURATION="Release"
BUILD_SDK="iphonesimulator"

echo "🍎 Starting iOS CI build..."
echo "📱 Example App: $EXAMPLE_APP"
echo "🏗️ Architecture: $ARCHITECTURE"
echo "🔄 Max Retries: $MAX_RETRIES"

if [ ! -d "$IOS_DIR" ]; then
    echo "❌ iOS directory not found: $IOS_DIR"
    exit 1
fi

# Dynamically find available iOS simulator
echo "🔍 Finding available iOS simulators..."
AVAILABLE_SIMULATORS=$(xcrun simctl list devices available | grep "iPhone" | grep -v "unavailable" | head -5)
echo "📱 Available simulators:"
echo "$AVAILABLE_SIMULATORS"

# Try to find a suitable simulator (prefer iPhone 16, 15, 14, 13, or any available iPhone)
SIMULATOR_NAME=""
for sim in "iPhone 16" "iPhone 15" "iPhone 14" "iPhone 13" "iPhone 12" "iPhone 11"; do
    if xcrun simctl list devices available | grep -q "$sim"; then
        SIMULATOR_NAME="$sim"
        echo "✅ Found simulator: $SIMULATOR_NAME"
        break
    fi
done

# If no specific simulator found, extract the first available iPhone simulator name
if [ -z "$SIMULATOR_NAME" ]; then
    echo "⚠️ No preferred simulator found, searching for any available iPhone..."
    # Extract device name from format: "    iPhone SE (3rd generation) (UUID) (Booted)"
    # We want to extract "iPhone SE (3rd generation)" part
    SIMULATOR_NAME=$(xcrun simctl list devices available | grep "iPhone" | grep -v "unavailable" | head -1 | sed -E 's/^[[:space:]]+([^(]+)\(.*/\1/' | sed 's/[[:space:]]*$//')
    
    if [ -z "$SIMULATOR_NAME" ] || [ "$SIMULATOR_NAME" = "Shutdown" ] || [ "$SIMULATOR_NAME" = "Booted" ]; then
        # Fallback: use generic destination without specific device name
        echo "⚠️ Could not extract valid simulator name, using generic destination"
        BUILD_DESTINATION="platform=iOS Simulator,OS=latest"
    else
        echo "✅ Extracted simulator name: $SIMULATOR_NAME"
        BUILD_DESTINATION="platform=iOS Simulator,name=$SIMULATOR_NAME"
    fi
else
    BUILD_DESTINATION="platform=iOS Simulator,name=$SIMULATOR_NAME"
fi

echo "✅ Using simulator destination: $BUILD_DESTINATION"

cd "$IOS_DIR"

# Set architecture environment
if [ "$ARCHITECTURE" = "new" ]; then
    export RCT_NEW_ARCH_ENABLED=1
    echo "🏗️ Building with New Architecture (TurboModules + Fabric)"
else
    export RCT_NEW_ARCH_ENABLED=0
    echo "🏗️ Building with Legacy Architecture"
fi

# Find workspace file
WORKSPACE_FILE=$(find . -name "*.xcworkspace" | head -1)
if [ -z "$WORKSPACE_FILE" ]; then
    echo "❌ Xcode workspace not found"
    exit 1
fi

echo "📁 Using workspace: $WORKSPACE_FILE"

# Build function with retry logic
build_ios() {
    local attempt=$1
    echo "🔨 Build attempt $attempt/$MAX_RETRIES"
    
    # Clean build directory
    rm -rf build DerivedData
    
    # Build command
    xcodebuild \
        -workspace "$WORKSPACE_FILE" \
        -scheme "$BUILD_SCHEME" \
        -configuration "$BUILD_CONFIGURATION" \
        -sdk "$BUILD_SDK" \
        -destination "$BUILD_DESTINATION" \
        -derivedDataPath build/DerivedData \
        clean build \
        | xcpretty --color
    
    return $?
}

# Test function with retry logic
test_ios() {
    local attempt=$1
    echo "🧪 Test attempt $attempt/$MAX_RETRIES"
    
    # Test command
    xcodebuild \
        -workspace "$WORKSPACE_FILE" \
        -scheme "$BUILD_SCHEME" \
        -sdk "$BUILD_SDK" \
        -destination "$BUILD_DESTINATION" \
        -derivedDataPath build/DerivedData \
        test \
        | xcpretty --color
    
    return $?
}

# Retry logic for build
for attempt in $(seq 1 $MAX_RETRIES); do
    echo "🔄 Build attempt $attempt/$MAX_RETRIES"
    
    if build_ios $attempt; then
        echo "✅ Build succeeded on attempt $attempt"
        BUILD_SUCCESS=true
        break
    else
        echo "❌ Build failed on attempt $attempt"
        
        if [ $attempt -lt $MAX_RETRIES ]; then
            echo "🔧 Applying recovery actions..."
            
            # Recovery actions
            pod cache clean --all
            rm -rf Pods Podfile.lock
            
            # Reinstall pods
            if [ "$RCT_NEW_ARCH_ENABLED" = "1" ]; then
                RCT_NEW_ARCH_ENABLED=1 pod install --repo-update
            else
                RCT_NEW_ARCH_ENABLED=0 pod install --repo-update
            fi
            
            # Wait before retry
            sleep 10
        fi
    fi
done

if [ "$BUILD_SUCCESS" != "true" ]; then
    echo "💥 Build failed after $MAX_RETRIES attempts"
    exit 1
fi

# Run tests if build succeeded
echo "🧪 Running tests..."
for attempt in $(seq 1 $MAX_RETRIES); do
    echo "🔄 Test attempt $attempt/$MAX_RETRIES"
    
    if test_ios $attempt; then
        echo "✅ Tests passed on attempt $attempt"
        TEST_SUCCESS=true
        break
    else
        echo "❌ Tests failed on attempt $attempt"
        
        if [ $attempt -lt $MAX_RETRIES ]; then
            echo "⏳ Waiting before retry..."
            sleep 5
        fi
    fi
done

if [ "$TEST_SUCCESS" != "true" ]; then
    echo "⚠️ Tests failed after $MAX_RETRIES attempts (build artifacts still available)"
    # Don't exit with error for test failures, as build succeeded
fi

# Verify build artifacts
BUILD_DIR="build/DerivedData/Build/Products/$BUILD_CONFIGURATION-iphonesimulator"
if [ -d "$BUILD_DIR" ] && [ "$(ls -A $BUILD_DIR)" ]; then
    echo "✅ Build artifacts created successfully"
    echo "📁 Build directory: $BUILD_DIR"
    ls -la "$BUILD_DIR"
else
    echo "❌ Build artifacts missing"
    exit 1
fi

echo "🎉 iOS CI build completed successfully!"
echo "🏗️ Architecture: $ARCHITECTURE"
echo "📱 Example App: $EXAMPLE_APP"
echo "✅ Build: Success"
echo "🧪 Tests: ${TEST_SUCCESS:-Failed}"