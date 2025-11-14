#!/bin/bash

# Test Runner Script for NNH AI Studio
# This script provides a convenient interface for running various test suites

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if dependencies are installed
check_dependencies() {
    if ! [ -x "$(command -v node)" ]; then
        print_error "Node.js is not installed."
        exit 1
    fi

    if ! [ -f "node_modules/.bin/jest" ]; then
        print_warning "Jest not found. Installing dependencies..."
        npm install
    fi

    if ! [ -f "node_modules/.bin/playwright" ]; then
        print_warning "Playwright not found. Installing dependencies..."
        npm install
    fi
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    npm test
}

# Function to run unit tests with coverage
run_coverage() {
    print_status "Running unit tests with coverage..."
    npm run test:coverage
    
    # Check coverage thresholds
    if [ $? -eq 0 ]; then
        print_status "Coverage thresholds met! ✅"
        
        # Open coverage report if on macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            print_status "Opening coverage report..."
            open coverage/lcov-report/index.html
        else
            print_status "Coverage report available at: coverage/lcov-report/index.html"
        fi
    else
        print_error "Coverage thresholds not met! ❌"
        exit 1
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    print_status "Running E2E tests..."
    
    # Check if Playwright browsers are installed
    if ! [ -d "~/.cache/ms-playwright" ] && ! [ -d "~/Library/Caches/ms-playwright" ]; then
        print_warning "Playwright browsers not found. Installing..."
        npm run test:e2e:install
    fi
    
    # Start the dev server in the background
    print_status "Starting development server..."
    npm run dev &
    DEV_SERVER_PID=$!
    
    # Wait for server to be ready
    print_status "Waiting for server to be ready..."
    sleep 10
    
    # Run E2E tests
    npm run test:e2e
    E2E_EXIT_CODE=$?
    
    # Stop the dev server
    print_status "Stopping development server..."
    kill $DEV_SERVER_PID
    
    if [ $E2E_EXIT_CODE -ne 0 ]; then
        print_error "E2E tests failed! ❌"
        exit 1
    fi
    
    print_status "E2E tests passed! ✅"
}

# Function to run specific test file
run_specific_test() {
    local test_file=$1
    print_status "Running test: $test_file"
    npm test -- "$test_file"
}

# Function to run tests in watch mode
run_watch_mode() {
    print_status "Running tests in watch mode..."
    npm run test:watch
}

# Function to run all tests
run_all_tests() {
    print_status "Running all tests..."
    
    # Run unit tests with coverage
    run_coverage
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    # Run E2E tests
    run_e2e_tests
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    print_status "All tests passed! 🎉"
}

# Function to generate test report
generate_report() {
    print_status "Generating test report..."
    
    # Create report directory
    mkdir -p test-results/reports
    
    # Generate timestamp
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    
    # Run tests with JSON reporter
    npm test -- --json --outputFile="test-results/reports/unit-tests-${TIMESTAMP}.json"
    
    # Generate summary
    echo "Test Report - ${TIMESTAMP}" > "test-results/reports/summary-${TIMESTAMP}.txt"
    echo "=========================" >> "test-results/reports/summary-${TIMESTAMP}.txt"
    echo "" >> "test-results/reports/summary-${TIMESTAMP}.txt"
    
    # Add coverage summary if exists
    if [ -f "coverage/coverage-summary.json" ]; then
        echo "Coverage Summary:" >> "test-results/reports/summary-${TIMESTAMP}.txt"
        cat coverage/coverage-summary.json | jq -r '.total' >> "test-results/reports/summary-${TIMESTAMP}.txt"
    fi
    
    print_status "Report generated: test-results/reports/summary-${TIMESTAMP}.txt"
}

# Main menu
show_menu() {
    echo ""
    echo "NNH AI Studio - Test Runner"
    echo "==========================="
    echo "1. Run unit tests"
    echo "2. Run unit tests with coverage"
    echo "3. Run E2E tests"
    echo "4. Run all tests"
    echo "5. Run tests in watch mode"
    echo "6. Run specific test file"
    echo "7. Generate test report"
    echo "8. Exit"
    echo ""
    read -p "Select an option: " choice
    
    case $choice in
        1)
            run_unit_tests
            ;;
        2)
            run_coverage
            ;;
        3)
            run_e2e_tests
            ;;
        4)
            run_all_tests
            ;;
        5)
            run_watch_mode
            ;;
        6)
            read -p "Enter test file path: " test_file
            run_specific_test "$test_file"
            ;;
        7)
            generate_report
            ;;
        8)
            print_status "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid option"
            show_menu
            ;;
    esac
    
    # Show menu again after command completes
    show_menu
}

# Parse command line arguments
if [ $# -eq 0 ]; then
    # No arguments, show interactive menu
    check_dependencies
    show_menu
else
    # Handle command line arguments
    case $1 in
        unit)
            check_dependencies
            run_unit_tests
            ;;
        coverage)
            check_dependencies
            run_coverage
            ;;
        e2e)
            check_dependencies
            run_e2e_tests
            ;;
        all)
            check_dependencies
            run_all_tests
            ;;
        watch)
            check_dependencies
            run_watch_mode
            ;;
        report)
            check_dependencies
            generate_report
            ;;
        *)
            if [ -f "$1" ]; then
                check_dependencies
                run_specific_test "$1"
            else
                print_error "Unknown command or file not found: $1"
                echo ""
                echo "Usage: ./scripts/run-tests.sh [command]"
                echo "Commands:"
                echo "  unit     - Run unit tests"
                echo "  coverage - Run unit tests with coverage"
                echo "  e2e      - Run E2E tests"
                echo "  all      - Run all tests"
                echo "  watch    - Run tests in watch mode"
                echo "  report   - Generate test report"
                echo "  [file]   - Run specific test file"
                echo ""
                echo "Or run without arguments for interactive menu."
                exit 1
            fi
            ;;
    esac
fi
