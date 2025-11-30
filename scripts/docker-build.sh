#!/bin/bash
# SafeFlow AU - Local Docker Build and Test Script
# Usage: ./scripts/docker-build.sh [build|run|test]

set -e

SERVICE_NAME="safeflow"
IMAGE_TAG="${SERVICE_NAME}:local"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

case "$1" in
    "build")
        echo -e "${YELLOW}Building Docker image...${NC}"
        docker build -t ${IMAGE_TAG} .
        echo -e "${GREEN}Build complete: ${IMAGE_TAG}${NC}"
        ;;
    "run")
        echo -e "${YELLOW}Running container...${NC}"
        docker run -d \
            --name ${SERVICE_NAME} \
            -p 3000:8080 \
            -e NODE_ENV=production \
            ${IMAGE_TAG}
        echo -e "${GREEN}Container started at http://localhost:3000${NC}"
        ;;
    "stop")
        echo -e "${YELLOW}Stopping container...${NC}"
        docker stop ${SERVICE_NAME} || true
        docker rm ${SERVICE_NAME} || true
        echo -e "${GREEN}Container stopped${NC}"
        ;;
    "test")
        echo -e "${YELLOW}Building and testing...${NC}"
        docker build -t ${IMAGE_TAG} .

        # Run container
        docker run -d \
            --name ${SERVICE_NAME}-test \
            -p 3001:8080 \
            -e NODE_ENV=production \
            ${IMAGE_TAG}

        # Wait for startup
        echo "Waiting for container to start..."
        sleep 5

        # Health check
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
            echo -e "${GREEN}Health check passed!${NC}"
        else
            echo -e "${YELLOW}Warning: Health check returned non-200 status${NC}"
        fi

        # Cleanup
        docker stop ${SERVICE_NAME}-test
        docker rm ${SERVICE_NAME}-test
        echo -e "${GREEN}Test complete${NC}"
        ;;
    "logs")
        docker logs -f ${SERVICE_NAME}
        ;;
    *)
        echo "Usage: $0 {build|run|stop|test|logs}"
        echo ""
        echo "Commands:"
        echo "  build  - Build the Docker image locally"
        echo "  run    - Run the container on port 3000"
        echo "  stop   - Stop and remove the container"
        echo "  test   - Build, run health check, and cleanup"
        echo "  logs   - View container logs"
        exit 1
        ;;
esac
