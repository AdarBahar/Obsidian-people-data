#!/bin/bash

# Simple deployment script for local development
# Usage: ./deploy.sh [test|prod]

if [ "$1" = "test" ]; then
    echo "🚀 Deploying to test vault..."
    npm run build && node deploy-test.mjs
elif [ "$1" = "prod" ]; then
    echo "🚀 Deploying to production vault..."
    npm run build && node deploy-prod.mjs
else
    echo "Usage: ./deploy.sh [test|prod]"
    echo "  test - Deploy to test vault"
    echo "  prod - Deploy to production vault"
fi
