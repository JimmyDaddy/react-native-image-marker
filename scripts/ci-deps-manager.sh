#!/bin/bash

# CI Dependencies Manager Script
# Handles dependency installation with lockfile management for CI environments

set -e

# Configuration
PROJECT_DIR=${1:-"."}
FORCE_UPDATE=${2:-"false"}
MAX_RETRIES=${3:-3}

echo "🔧 CI Dependencies Manager Starting..."
echo "📁 Project Directory: $PROJECT_DIR"
echo "🔄 Force Update: $FORCE_UPDATE"
echo "🔁 Max Retries: $MAX_RETRIES"

cd "$PROJECT_DIR"

# Function to install dependencies with retry logic
install_deps() {
    local attempt=$1
    local use_frozen=$2
    
    echo "📦 Dependency installation attempt $attempt/$MAX_RETRIES"
    
    if [ "$use_frozen" = "true" ]; then
        echo "🔒 Using frozen lockfile..."
        yarn install --frozen-lockfile
    else
        echo "🔄 Updating lockfile..."
        yarn install
    fi
    
    return $?
}

# Function to check if lockfile needs update
check_lockfile_sync() {
    echo "🔍 Checking lockfile synchronization..."
    
    # Try to install with frozen lockfile first
    if yarn install --frozen-lockfile --dry-run > /dev/null 2>&1; then
        echo "✅ Lockfile is synchronized"
        return 0
    else
        echo "⚠️ Lockfile needs update"
        return 1
    fi
}

# Main installation logic
install_dependencies() {
    local project_name=$(basename "$(pwd)")
    echo "📦 Installing dependencies for: $project_name"
    
    # Check if we should force update
    if [ "$FORCE_UPDATE" = "true" ]; then
        echo "🔄 Force update requested, updating lockfile..."
        for attempt in $(seq 1 $MAX_RETRIES); do
            if install_deps $attempt false; then
                echo "✅ Dependencies installed successfully (attempt $attempt)"
                return 0
            else
                echo "❌ Installation failed (attempt $attempt)"
                if [ $attempt -lt $MAX_RETRIES ]; then
                    echo "⏳ Waiting before retry..."
                    sleep 5
                fi
            fi
        done
        echo "💥 All installation attempts failed"
        return 1
    fi
    
    # Try frozen lockfile first
    for attempt in $(seq 1 $MAX_RETRIES); do
        echo "🔄 Attempt $attempt: Trying frozen lockfile installation..."
        
        if install_deps $attempt true; then
            echo "✅ Dependencies installed with frozen lockfile (attempt $attempt)"
            return 0
        else
            echo "❌ Frozen lockfile installation failed (attempt $attempt)"
            
            if [ $attempt -eq $MAX_RETRIES ]; then
                echo "🔄 All frozen attempts failed, trying with lockfile update..."
                
                # Final attempt with lockfile update
                if install_deps 1 false; then
                    echo "✅ Dependencies installed with lockfile update"
                    echo "⚠️ Lockfile was updated - consider committing changes"
                    return 0
                else
                    echo "💥 Final installation attempt failed"
                    return 1
                fi
            else
                echo "⏳ Waiting before retry..."
                sleep 5
            fi
        fi
    done
}

# Validate environment
validate_environment() {
    echo "🔍 Validating environment..."
    
    # Check if yarn is available
    if ! command -v yarn &> /dev/null; then
        echo "❌ Yarn not found"
        return 1
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo "❌ package.json not found in $(pwd)"
        return 1
    fi
    
    echo "✅ Environment validation passed"
    return 0
}

# Clean cache if needed
clean_cache() {
    echo "🧹 Cleaning yarn cache..."
    yarn cache clean
    echo "✅ Cache cleaned"
}

# Main execution
main() {
    echo "🚀 Starting dependency installation process..."
    
    # Validate environment
    if ! validate_environment; then
        echo "❌ Environment validation failed"
        exit 1
    fi
    
    # Clean cache if this is a retry or force update
    if [ "$FORCE_UPDATE" = "true" ] || [ -n "$CI_RETRY" ]; then
        clean_cache
    fi
    
    # Install dependencies
    if install_dependencies; then
        echo "🎉 Dependency installation completed successfully!"
        
        # Show installed packages info
        echo "📊 Dependency information:"
        echo "  - Node.js: $(node --version)"
        echo "  - Yarn: $(yarn --version)"
        echo "  - Package count: $(yarn list --depth=0 2>/dev/null | grep -c "├─\|└─" || echo "unknown")"
        
        return 0
    else
        echo "💥 Dependency installation failed!"
        
        # Generate diagnostic information
        echo "🔍 Diagnostic information:"
        echo "  - Working directory: $(pwd)"
        echo "  - Package.json exists: $([ -f package.json ] && echo "yes" || echo "no")"
        echo "  - Yarn.lock exists: $([ -f yarn.lock ] && echo "yes" || echo "no")"
        echo "  - Node.js version: $(node --version)"
        echo "  - Yarn version: $(yarn --version)"
        
        return 1
    fi
}

# Handle script arguments
case "${1:-install}" in
    "install")
        main
        ;;
    "check")
        validate_environment && check_lockfile_sync
        ;;
    "clean")
        clean_cache
        ;;
    "help"|"--help"|"-h")
        echo "Usage: $0 [command] [project_dir] [force_update] [max_retries]"
        echo ""
        echo "Commands:"
        echo "  install  - Install dependencies (default)"
        echo "  check    - Check lockfile synchronization"
        echo "  clean    - Clean yarn cache"
        echo "  help     - Show this help message"
        echo ""
        echo "Arguments:"
        echo "  project_dir   - Project directory (default: current directory)"
        echo "  force_update  - Force lockfile update (true/false, default: false)"
        echo "  max_retries   - Maximum retry attempts (default: 3)"
        echo ""
        echo "Examples:"
        echo "  $0 install . false 3"
        echo "  $0 install example true 2"
        echo "  $0 check"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac