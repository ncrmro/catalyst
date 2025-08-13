// Mock implementation of @kubernetes/client-node
const KubeConfig = jest.fn();
const AppsV1Api = jest.fn();

module.exports = {
  KubeConfig,
  AppsV1Api,
};