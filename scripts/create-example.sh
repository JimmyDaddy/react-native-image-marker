#!/bin/bash

# Script to create React Native example app with specified version
# Usage: ./scripts/create-example.sh [version] [architecture]
# Example: ./scripts/create-example.sh 0.81.0 legacy
# Example: ./scripts/create-example.sh 0.73.0 new

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
RN_VERSION="${1:-0.81.0}"
ARCHITECTURE="${2:-legacy}"
EXAMPLE_DIR="example-${RN_VERSION%.*}"  # Remove patch version (0.81.0 -> 0.81)

# Validate architecture
if [[ "$ARCHITECTURE" != "legacy" && "$ARCHITECTURE" != "new" ]]; then
    echo -e "${RED}✗ Invalid architecture: $ARCHITECTURE${NC}"
    echo -e "${YELLOW}Usage: $0 [version] [architecture]${NC}"
    echo -e "${YELLOW}  version: React Native version (e.g., 0.81.0, 0.73.0)${NC}"
    echo -e "${YELLOW}  architecture: 'legacy' or 'new' (default: legacy)${NC}"
    exit 1
fi

# Set architecture flags
if [[ "$ARCHITECTURE" == "new" ]]; then
    NEW_ARCH_ENABLED="true"
    RCT_NEW_ARCH_ENABLED="1"
else
    NEW_ARCH_ENABLED="false"
    RCT_NEW_ARCH_ENABLED="0"
fi

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Creating React Native $RN_VERSION Example App          ${NC}"
echo -e "${GREEN}║   Architecture: $ARCHITECTURE                             ${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if example directory already exists
if [ -d "$EXAMPLE_DIR" ]; then
    echo -e "${YELLOW}⚠ $EXAMPLE_DIR directory already exists${NC}"
    read -p "Do you want to remove it and create a new one? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Removing existing $EXAMPLE_DIR...${NC}"
        rm -rf "$EXAMPLE_DIR"
    else
        echo -e "${RED}✗ Aborted${NC}"
        exit 1
    fi
fi

# Step 1: Initialize React Native project
echo -e "${GREEN}Step 1: Initializing React Native $RN_VERSION project...${NC}"
APP_NAME="ImageMarkerExample${RN_VERSION//./}"  # Remove dots from version
npx @react-native-community/cli@latest init "$APP_NAME" --version "$RN_VERSION" --skip-install

# Rename to example directory
mv "$APP_NAME" "$EXAMPLE_DIR"

# Step 2: Update package.json
echo -e "${GREEN}Step 2: Updating package.json...${NC}"
cd "$EXAMPLE_DIR"

# Create a temporary package.json with our dependencies
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update name
pkg.name = '$APP_NAME';

// Add our dependencies
pkg.dependencies = {
  ...pkg.dependencies,
  'react-native-image-marker': 'file:../',
  '@expo/react-native-action-sheet': '^4.0.1',
  'filesize': '^10.1.0',
  'react-native-blob-util': '^0.19.2',
  'react-native-image-picker': '^5.6.0',
  'react-native-reanimated-table': '^0.0.2',
  'react-native-toast-message': '^2.1.6'
};

// Add scripts
pkg.scripts = {
  ...pkg.scripts,
  'pods': 'pod-install',
  'm1-pods': 'cd ios && pod install'
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# Step 3: Copy demo app from example-0.73 if it exists
echo -e "${GREEN}Step 3: Copying demo app...${NC}"
if [ -d "../example-0.73/src" ]; then
    cp -r ../example-0.73/src ./
    cp -r ../example-0.73/assets ./
    echo -e "${BLUE}  ✓ Copied demo app from example-0.73${NC}"
else
    echo -e "${YELLOW}  ⚠ example-0.73/src not found, skipping demo app copy${NC}"
fi

# Step 4: Install dependencies
echo -e "${GREEN}Step 4: Installing dependencies...${NC}"
npm install

# Step 5: Configure Android
echo -e "${GREEN}Step 5: Configuring Android...${NC}"

# Update gradle.properties
cat >> android/gradle.properties << EOF

# React Native New Architecture
newArchEnabled=$NEW_ARCH_ENABLED

# Kotlin version
kotlin_version=1.9.0
EOF

echo -e "${BLUE}  ✓ Android configured (newArchEnabled=$NEW_ARCH_ENABLED)${NC}"

# Step 6: Configure iOS
echo -e "${GREEN}Step 6: Configuring iOS...${NC}"

# Create .xcode.env.local
cat > ios/.xcode.env.local << EOF
# React Native New Architecture
export RCT_NEW_ARCH_ENABLED=$RCT_NEW_ARCH_ENABLED
EOF

# Update Podfile - add ENV variable at the beginning
if ! grep -q "ENV\['RCT_NEW_ARCH_ENABLED'\]" ios/Podfile; then
    # Prepend ENV variable to the beginning of Podfile
    echo "# React Native New Architecture
ENV['RCT_NEW_ARCH_ENABLED'] = '$RCT_NEW_ARCH_ENABLED'
" | cat - ios/Podfile > ios/Podfile.tmp
    mv ios/Podfile.tmp ios/Podfile
fi

echo -e "${BLUE}  ✓ iOS configured (RCT_NEW_ARCH_ENABLED=$RCT_NEW_ARCH_ENABLED)${NC}"

# Step 7: Install iOS pods
echo -e "${GREEN}Step 7: Installing iOS pods...${NC}"
cd ios
pod install
cd ..

# Step 8: Create ARCHITECTURE.md if example-0.73 exists
if [ -f "../example-0.73/ARCHITECTURE.md" ]; then
    echo -e "${GREEN}Step 8: Creating documentation...${NC}"
    cp ../example-0.73/ARCHITECTURE.md ./ARCHITECTURE.md
    
    # Update version references
    sed -i.bak "s/0\.73/${RN_VERSION%.*}/g" ARCHITECTURE.md
    rm ARCHITECTURE.md.bak
    echo -e "${BLUE}  ✓ Documentation created${NC}"
else
    echo -e "${YELLOW}Step 8: Skipping documentation (example-0.73/ARCHITECTURE.md not found)${NC}"
fi

# Step 9: Verify setup
echo -e "${GREEN}Step 9: Verifying setup...${NC}"
cd ..

# Check if verification script exists
if [ -f "scripts/check-architecture.js" ]; then
    node scripts/check-architecture.js "$EXAMPLE_DIR"
else
    echo -e "${YELLOW}  ⚠ scripts/check-architecture.js not found, skipping verification${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ React Native $RN_VERSION Example App Created!        ${NC}"
echo -e "${GREEN}║   Directory: $EXAMPLE_DIR                                 ${NC}"
echo -e "${GREEN}║   Architecture: $ARCHITECTURE                             ${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo -e "  ${GREEN}Android:${NC}"
echo -e "    cd $EXAMPLE_DIR"
echo -e "    npm run android"
echo ""
echo -e "  ${GREEN}iOS:${NC}"
echo -e "    cd $EXAMPLE_DIR"
echo -e "    npm run ios"
echo ""
if [[ "$ARCHITECTURE" == "legacy" ]]; then
    echo -e "  ${GREEN}Switch to New Architecture:${NC}"
    echo -e "    npm run arch:new $EXAMPLE_DIR"
    echo -e "    cd $EXAMPLE_DIR"
    echo -e "    npm run pods  # iOS only"
    echo -e "    npm run android  # or npm run ios"
else
    echo -e "  ${GREEN}Switch to Legacy Architecture:${NC}"
    echo -e "    npm run arch:legacy $EXAMPLE_DIR"
    echo -e "    cd $EXAMPLE_DIR"
    echo -e "    npm run pods  # iOS only"
    echo -e "    npm run android  # or npm run ios"
fi
echo ""
