#!/bin/bash

# Script to create React Native 0.81 example app
# This script automates the creation of a new example app with dual architecture support

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Creating React Native 0.81 Example App                 ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if example-0.81 already exists
if [ -d "example-0.81" ]; then
    echo -e "${YELLOW}⚠ example-0.81 directory already exists${NC}"
    read -p "Do you want to remove it and create a new one? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Removing existing example-0.81...${NC}"
        rm -rf example-0.81
    else
        echo -e "${RED}✗ Aborted${NC}"
        exit 1
    fi
fi

# Step 1: Initialize React Native 0.81 project
echo -e "${GREEN}Step 1: Initializing React Native 0.81 project...${NC}"
npx react-native@0.81.0 init ImageMarkerExample081 --version 0.81.0 --skip-install

# Rename to example-0.81
mv ImageMarkerExample081 example-0.81

# Step 2: Update package.json
echo -e "${GREEN}Step 2: Updating package.json...${NC}"
cd example-0.81

# Create a temporary package.json with our dependencies
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update name
pkg.name = 'ImageMarkerExample081';

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

# Step 3: Copy demo app from example-0.73
echo -e "${GREEN}Step 3: Copying demo app from example-0.73...${NC}"
cp -r ../example-0.73/src ./
cp -r ../example-0.73/assets ./

# Step 4: Install dependencies
echo -e "${GREEN}Step 4: Installing dependencies...${NC}"
npm install

# Step 5: Configure Android
echo -e "${GREEN}Step 5: Configuring Android...${NC}"

# Update gradle.properties
cat >> android/gradle.properties << 'EOF'

# React Native New Architecture
newArchEnabled=false

# Kotlin version
kotlin_version=1.9.0
EOF

# Step 6: Configure iOS
echo -e "${GREEN}Step 6: Configuring iOS...${NC}"

# Create .xcode.env.local
cat > ios/.xcode.env.local << 'EOF'
# React Native New Architecture
export RCT_NEW_ARCH_ENABLED=0
EOF

# Update Podfile - add ENV variable after require statements
if ! grep -q "ENV\['RCT_NEW_ARCH_ENABLED'\]" ios/Podfile; then
    # Find the line number after the last require statement
    line_num=$(grep -n "require" ios/Podfile | tail -1 | cut -d: -f1)
    
    # Insert the ENV variable
    sed -i.bak "${line_num}a\\
\\
# React Native New Architecture\\
ENV['RCT_NEW_ARCH_ENABLED'] = '0'\\
" ios/Podfile
    
    rm ios/Podfile.bak
fi

# Step 7: Install iOS pods
echo -e "${GREEN}Step 7: Installing iOS pods...${NC}"
cd ios
pod install
cd ..

# Step 8: Create ARCHITECTURE.md
echo -e "${GREEN}Step 8: Creating documentation...${NC}"
cp ../example-0.73/ARCHITECTURE.md ./ARCHITECTURE.md

# Update version references
sed -i.bak 's/0\.73/0.81/g' ARCHITECTURE.md
rm ARCHITECTURE.md.bak

# Step 9: Configure architecture using our script
echo -e "${GREEN}Step 9: Configuring architecture...${NC}"
cd ..
node scripts/switch-architecture.js legacy example-0.81

# Step 10: Verify setup
echo -e "${GREEN}Step 10: Verifying setup...${NC}"
node scripts/check-architecture.js example-0.81

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ React Native 0.81 Example App Created Successfully!  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo -e "  ${GREEN}Android:${NC}"
echo -e "    cd example-0.81"
echo -e "    npm run android"
echo ""
echo -e "  ${GREEN}iOS:${NC}"
echo -e "    cd example-0.81"
echo -e "    npm run ios"
echo ""
echo -e "  ${GREEN}Switch to New Architecture:${NC}"
echo -e "    npm run arch:new example-0.81"
echo -e "    cd example-0.81"
echo -e "    npm run pods  # iOS only"
echo -e "    npm run android  # or npm run ios"
echo ""
