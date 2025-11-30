#!/bin/bash
# SafeFlow AU - Cloud Run Deployment Script
# Usage: ./scripts/deploy.sh [PROJECT_ID] [REGION]

set -e

# Configuration
PROJECT_ID="${1:-$(gcloud config get-value project)}"
REGION="${2:-australia-southeast1}"
SERVICE_NAME="safeflow"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}SafeFlow AU - Cloud Run Deployment${NC}"
echo "======================================="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${YELLOW}Warning: Not authenticated with gcloud${NC}"
    echo "Running: gcloud auth login"
    gcloud auth login
fi

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com --project="${PROJECT_ID}"

# Build and deploy using Cloud Build
echo -e "${YELLOW}Building and deploying to Cloud Run...${NC}"
gcloud builds submit \
    --config cloudbuild.yaml \
    --project="${PROJECT_ID}" \
    --substitutions="_REGION=${REGION}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --format="value(status.url)")

echo ""
echo -e "${GREEN}Deployment successful!${NC}"
echo "======================================="
echo -e "Service URL: ${GREEN}${SERVICE_URL}${NC}"
echo ""
echo "Useful commands:"
echo "  View logs: gcloud run services logs read ${SERVICE_NAME} --region=${REGION}"
echo "  Describe:  gcloud run services describe ${SERVICE_NAME} --region=${REGION}"
echo "  Delete:    gcloud run services delete ${SERVICE_NAME} --region=${REGION}"
