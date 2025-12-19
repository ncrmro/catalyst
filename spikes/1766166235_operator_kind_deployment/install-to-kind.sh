#!/usr/bin/env bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Catalyst Helm Chart Installation Test${NC}"
echo "========================================"
echo ""

# Configuration
CLUSTER_NAME="catalyst-test"
NAMESPACE="catalyst"
RELEASE_NAME="catalyst"
CHART_PATH="../../charts/catalyst"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v kind &> /dev/null; then
    echo -e "${RED}Error: kind is not installed${NC}"
    echo "Install from: https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
    exit 1
fi

if ! command -v helm &> /dev/null; then
    echo -e "${RED}Error: helm is not installed${NC}"
    echo "Install from: https://helm.sh/docs/intro/install/"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Check if cluster exists
echo -e "${YELLOW}Checking for existing kind cluster...${NC}"
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    echo -e "${YELLOW}Cluster '${CLUSTER_NAME}' already exists${NC}"
    read -p "Delete and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deleting cluster...${NC}"
        kind delete cluster --name "${CLUSTER_NAME}"
    else
        echo -e "${GREEN}Using existing cluster${NC}"
    fi
fi

# Create cluster if it doesn't exist
if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    echo -e "${YELLOW}Creating kind cluster '${CLUSTER_NAME}'...${NC}"
    kind create cluster --name "${CLUSTER_NAME}"
    echo -e "${GREEN}✓ Cluster created${NC}"
fi

# Set kubectl context
kubectl config use-context "kind-${CLUSTER_NAME}"
echo ""

# Add Helm repositories
echo -e "${YELLOW}Adding Helm repositories...${NC}"
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
echo -e "${GREEN}✓ Helm repositories updated${NC}"
echo ""

# Update chart dependencies
echo -e "${YELLOW}Updating chart dependencies...${NC}"
cd "${CHART_PATH}"
helm dependency update
cd - > /dev/null
echo -e "${GREEN}✓ Dependencies updated${NC}"
echo ""

# Lint the chart
echo -e "${YELLOW}Linting chart...${NC}"
if helm lint "${CHART_PATH}"; then
    echo -e "${GREEN}✓ Chart linting passed${NC}"
else
    echo -e "${RED}✗ Chart linting failed${NC}"
    exit 1
fi
echo ""

# Template the chart (dry-run)
echo -e "${YELLOW}Templating chart (dry-run)...${NC}"
if helm template "${RELEASE_NAME}" "${CHART_PATH}" > /dev/null; then
    echo -e "${GREEN}✓ Chart templating successful${NC}"
else
    echo -e "${RED}✗ Chart templating failed${NC}"
    exit 1
fi
echo ""

# Install the chart
echo -e "${YELLOW}Installing chart...${NC}"
helm install "${RELEASE_NAME}" "${CHART_PATH}" \
    --create-namespace \
    --namespace "${NAMESPACE}" \
    --wait \
    --timeout 10m

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Chart installed successfully${NC}"
else
    echo -e "${RED}✗ Chart installation failed${NC}"
    exit 1
fi
echo ""

# Verify installation
echo -e "${YELLOW}Verifying installation...${NC}"
echo ""

echo "Web application pods:"
kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/component=web

echo ""
echo "PostgreSQL pods:"
kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/name=postgresql

echo ""
echo "Operator pods:"
kubectl get pods -n catalyst-system -l app.kubernetes.io/component=operator

echo ""
echo "CRDs:"
kubectl get crds | grep catalyst

echo ""
echo -e "${GREEN}Installation verification complete!${NC}"
echo ""

# Print next steps
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test the operator by creating a sample Project:"
echo "   kubectl apply -f - <<EOF"
echo "   apiVersion: catalyst.catalyst.dev/v1alpha1"
echo "   kind: Project"
echo "   metadata:"
echo "     name: test-project"
echo "     namespace: catalyst-system"
echo "   spec:"
echo "     source:"
echo "       repositoryUrl: 'https://github.com/example/repo'"
echo "       branch: 'main'"
echo "     deployment:"
echo "       type: 'helm'"
echo "       path: './charts/app'"
echo "     resources:"
echo "       defaultQuota:"
echo "         cpu: '1'"
echo "         memory: '2Gi'"
echo "   EOF"
echo ""
echo "2. Check operator logs:"
echo "   kubectl logs -n catalyst-system -l app.kubernetes.io/component=operator -f"
echo ""
echo "3. Port-forward to access the web app:"
echo "   kubectl port-forward -n ${NAMESPACE} svc/${RELEASE_NAME}-web 3000:3000"
echo "   Then visit: http://localhost:3000"
echo ""
echo "4. Cleanup when done:"
echo "   helm uninstall ${RELEASE_NAME} -n ${NAMESPACE}"
echo "   kind delete cluster --name ${CLUSTER_NAME}"
