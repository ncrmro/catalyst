import { describe, it, expect } from 'vitest';
import { KubernetesError } from './errors';

describe('KubernetesError.fromApiError', () => {
  it('should parse kubernetes client-node error format with escaped JSON body', () => {
    const error = {
      message: `HTTP-Code: 404
Message: Unknown API Status Code!
Body: "{\\"kind\\":\\"Status\\",\\"apiVersion\\":\\"v1\\",\\"metadata\\":{},\\"status\\":\\"Failure\\",\\"message\\":\\"namespaces \\\\\\"nicholas-romero-s-team\\\\\\" not found\\",\\"reason\\":\\"NotFound\\",\\"details\\":{\\"name\\":\\"nicholas-romero-s-team\\",\\"kind\\":\\"namespaces\\"},\\"code\\":404}
"
Headers: {"audit-id":"abc123"}`,
    };

    const k8sError = KubernetesError.fromApiError(error);

    expect(k8sError).toBeInstanceOf(KubernetesError);
    expect(k8sError.code).toBe(404);
    expect(k8sError.reason).toBe('NotFound');
    expect(k8sError.message).toContain('nicholas-romero-s-team');
    expect(k8sError.details).toBeDefined();
    expect(k8sError.details?.name).toBe('nicholas-romero-s-team');
    expect(k8sError.details?.kind).toBe('namespaces');
  });

  it('should correctly identify 404 errors', () => {
    const error = {
      message: `HTTP-Code: 404
Message: Not Found
Body: "{\\"code\\":404,\\"reason\\":\\"NotFound\\",\\"message\\":\\"namespace not found\\"}"
`,
    };

    const k8sError = KubernetesError.fromApiError(error);

    expect(KubernetesError.isNotFound(k8sError)).toBe(true);
  });

  it('should handle error without body gracefully', () => {
    const error = {
      message: `HTTP-Code: 500
Message: Internal Server Error
`,
    };

    const k8sError = KubernetesError.fromApiError(error);

    expect(k8sError.code).toBe(500);
    expect(k8sError.message).toBe('Internal Server Error');
  });

  it('should handle malformed JSON in body gracefully', () => {
    const error = {
      message: `HTTP-Code: 404
Message: Not Found
Body: "not valid json"
`,
    };

    const k8sError = KubernetesError.fromApiError(error);

    expect(k8sError.code).toBe(404);
    expect(k8sError.message).toBe('Not Found');
  });

  it('should handle legacy response format', () => {
    const error = {
      response: {
        statusCode: 404,
        body: {
          message: 'namespace not found',
          reason: 'NotFound',
        },
      },
    };

    const k8sError = KubernetesError.fromApiError(error);

    expect(k8sError.code).toBe(404);
    expect(k8sError.reason).toBe('NotFound');
    expect(KubernetesError.isNotFound(k8sError)).toBe(true);
  });

  it('should handle generic Error objects', () => {
    const error = new Error('Some generic error');

    const k8sError = KubernetesError.fromApiError(error);

    expect(k8sError.code).toBe(500);
    expect(k8sError.message).toBe('Some generic error');
  });
});
