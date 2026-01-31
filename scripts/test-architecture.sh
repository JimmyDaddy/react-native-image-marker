#!/bin/bash

# Test script for dual architecture support
# Usage: ./scripts/test-architecture.sh [legacy|new|both]

set -e

ARCHITECTURE=${1:-both}
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)

echo "🚀 Testing React Native Image Marker Architecture Support"
echo "Project root: $PROJECT_ROOT"
echo "Architecture: $ARCHITECTURE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to test architecture
test_architecture() {
    local arch=$1
    print_status $BLUE "Testing $arch architecture..."
    
    if [ "$arch" = "new" ]; then
        export RCT_NEW_ARCH_ENABLED=1
        export newArchEnabled=true
        print_status $YELLOW "Environment: RCT_NEW_ARCH_ENABLED=1"
    else
        export RCT_NEW_ARCH_ENABLED=0
        export newArchEnabled=false
        print_status $YELLOW "Environment: RCT_NEW_ARCH_ENABLED=0"
    fi
    
    # Test TypeScript compilation
    print_status $BLUE "Running TypeScript compilation..."
    npm run typecheck
    print_status $GREEN "✅ TypeScript compilation passed"
    
    # Test unit tests
    print_status $BLUE "Running unit tests..."
    npm test -- --run
    print_status $GREEN "✅ Unit tests passed"
    
    # Test build configuration
    print_status $BLUE "Testing build configuration..."
    npm test -- --run --testNamePattern="Property 6"
    print_status $GREEN "✅ Build configuration tests passed"
    
    # Test architecture detection
    print_status $BLUE "Testing architecture detection..."
    npm test -- --run --testNamePattern="Architecture detection"
    print_status $GREEN "✅ Architecture detection tests passed"
    
    # Build the library
    print_status $BLUE "Building library..."
    npm run prepack
    print_status $GREEN "✅ Library build passed"
    
    echo ""
}

# Function to test iOS configuration
test_ios_config() {
    local arch=$1
    print_status $BLUE "Testing iOS configuration for $arch architecture..."
    
    if [ "$arch" = "new" ]; then
        export RCT_NEW_ARCH_ENABLED=1
    else
        export RCT_NEW_ARCH_ENABLED=0
    fi
    
    # Check if we're on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # Test podspec validation
        if command -v pod &> /dev/null; then
            print_status $BLUE "Validating podspec..."
            pod spec lint react-native-image-marker.podspec --allow-warnings
            print_status $GREEN "✅ iOS podspec validation passed"
        else
            print_status $YELLOW "⚠️  CocoaPods not installed, skipping podspec validation"
        fi
    else
        print_status $YELLOW "⚠️  Not on macOS, skipping iOS configuration tests"
    fi
}

# Function to test Android configuration
test_android_config() {
    local arch=$1
    print_status $BLUE "Testing Android configuration for $arch architecture..."
    
    cd "$PROJECT_ROOT/android"
    
    # Create gradle.properties for testing
    if [ "$arch" = "new" ]; then
        echo "newArchEnabled=true" > gradle.properties.test
    else
        echo "newArchEnabled=false" > gradle.properties.test
    fi
    
    # Test Gradle configuration
    if command -v ./gradlew &> /dev/null; then
        print_status $BLUE "Testing Gradle configuration..."
        cp gradle.properties.test gradle.properties
        ./gradlew help > /dev/null
        rm -f gradle.properties.test gradle.properties
        print_status $GREEN "✅ Android Gradle configuration passed"
    else
        print_status $YELLOW "⚠️  Gradle wrapper not found, skipping Android configuration tests"
    fi
    
    cd "$PROJECT_ROOT"
}

# Function to validate Codegen specs
validate_codegen() {
    print_status $BLUE "Validating Codegen specifications..."
    
    if [ -f "specs/NativeImageMarker.ts" ]; then
        print_status $GREEN "✅ Codegen spec file exists"
        
        # Validate TypeScript syntax
        npx tsc --noEmit specs/NativeImageMarker.ts
        print_status $GREEN "✅ Codegen spec syntax is valid"
    else
        print_status $RED "❌ Codegen spec file missing"
        exit 1
    fi
    
    # Check package.json configuration
    if grep -q "codegenConfig" package.json; then
        print_status $GREEN "✅ Package.json has codegenConfig"
    else
        print_status $RED "❌ Package.json missing codegenConfig"
        exit 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_status $BLUE "Running integration tests..."
    
    # Test library exports
    node -e "
        const lib = require('./lib/commonjs/index.js');
        console.log('Library exports:', Object.keys(lib));
        if (!lib.default) {
            console.error('❌ Default export missing');
            process.exit(1);
        }
        console.log('✅ Library exports validated');
    "
    
    # Test architecture detection in built library
    node -e "
        const { ArchitectureDetector } = require('./lib/commonjs/ArchitectureDetector.js');
        console.log('ArchitectureDetector available');
        const isNewArch = ArchitectureDetector.isNewArchitecture();
        console.log('Architecture detection result:', isNewArch);
        console.log('✅ Architecture detection working');
    "
    
    print_status $GREEN "✅ Integration tests passed"
}

# Main execution
cd "$PROJECT_ROOT"

print_status $BLUE "Installing dependencies..."
npm ci

print_status $BLUE "Validating Codegen specifications..."
validate_codegen

if [ "$ARCHITECTURE" = "both" ]; then
    print_status $BLUE "Testing both architectures..."
    
    test_architecture "legacy"
    test_ios_config "legacy"
    test_android_config "legacy"
    
    echo ""
    print_status $BLUE "Switching to new architecture..."
    echo ""
    
    test_architecture "new"
    test_ios_config "new"
    test_android_config "new"
    
elif [ "$ARCHITECTURE" = "legacy" ] || [ "$ARCHITECTURE" = "new" ]; then
    test_architecture "$ARCHITECTURE"
    test_ios_config "$ARCHITECTURE"
    test_android_config "$ARCHITECTURE"
else
    print_status $RED "❌ Invalid architecture specified. Use 'legacy', 'new', or 'both'"
    exit 1
fi

print_status $BLUE "Running integration tests..."
run_integration_tests

echo ""
print_status $GREEN "🎉 All architecture tests completed successfully!"
print_status $GREEN "✅ Dual architecture support validated"

if [ "$ARCHITECTURE" = "both" ]; then
    print_status $GREEN "✅ Both legacy and new architectures tested"
elif [ "$ARCHITECTURE" = "new" ]; then
    print_status $GREEN "✅ New architecture support validated"
else
    print_status $GREEN "✅ Legacy architecture support validated"
fi

echo ""
print_status $BLUE "Next steps:"
echo "1. Test in a real React Native project with both architectures"
echo "2. Verify iOS and Android builds work correctly"
echo "3. Test image watermarking functionality in both architectures"
echo ""