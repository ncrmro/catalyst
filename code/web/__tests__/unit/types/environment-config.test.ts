import { describe, it, expect } from "vitest";
import {
  EnvironmentConfigSchema,
  HelmConfigSchema,
  DockerConfigSchema,
  ManifestsConfigSchema,
  isHelmConfig,
  isDockerConfig,
  isManifestsConfig,
  type EnvironmentConfig,
  type HelmConfig,
  type DockerConfig,
  type ManifestsConfig,
} from "@/types/environment-config";

describe("EnvironmentConfigSchema", () => {
  describe("Helm config", () => {
    it("parses valid helm config with required fields only", () => {
      const config = {
        method: "helm",
        chartPath: "./charts/my-app",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method).toBe("helm");
        expect((result.data as HelmConfig).chartPath).toBe("./charts/my-app");
      }
    });

    it("parses valid helm config with all fields", () => {
      const config = {
        method: "helm",
        chartPath: "./charts/my-app",
        valuesPath: "./charts/my-app/values.yaml",
        managedServices: {
          postgres: { enabled: true },
          redis: { enabled: false },
          opensearch: { enabled: false },
        },
        envVars: [{ name: "NODE_ENV", value: "production" }],
        devCommand: "npm run dev",
        workdir: "web",
        packageManager: "pnpm",
        projectType: "nodejs",
        autoDetect: false,
        confidence: "high",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method).toBe("helm");
        expect((result.data as HelmConfig).chartPath).toBe("./charts/my-app");
        expect((result.data as HelmConfig).valuesPath).toBe(
          "./charts/my-app/values.yaml",
        );
        expect(result.data.managedServices?.postgres?.enabled).toBe(true);
        expect(result.data.devCommand).toBe("npm run dev");
        expect(result.data.workdir).toBe("web");
        expect(result.data.packageManager).toBe("pnpm");
        expect(result.data.projectType).toBe("nodejs");
        expect(result.data.autoDetect).toBe(false);
        expect(result.data.confidence).toBe("high");
      }
    });

    it("fails when chartPath is missing", () => {
      const config = {
        method: "helm",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("fails when chartPath is empty", () => {
      const config = {
        method: "helm",
        chartPath: "",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Docker config", () => {
    it("parses valid docker config with required fields only", () => {
      const config = {
        method: "docker",
        dockerfilePath: "./Dockerfile",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method).toBe("docker");
        expect((result.data as DockerConfig).dockerfilePath).toBe(
          "./Dockerfile",
        );
      }
    });

    it("parses valid docker config with all fields", () => {
      const config = {
        method: "docker",
        dockerfilePath: "./Dockerfile.dev",
        context: "./app",
        managedServices: {
          postgres: { enabled: false },
          redis: { enabled: true },
          opensearch: { enabled: false },
        },
        devCommand: "make dev",
        projectType: "dockerfile",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method).toBe("docker");
        expect((result.data as DockerConfig).dockerfilePath).toBe(
          "./Dockerfile.dev",
        );
        expect((result.data as DockerConfig).context).toBe("./app");
        expect(result.data.managedServices?.redis?.enabled).toBe(true);
        expect(result.data.devCommand).toBe("make dev");
      }
    });

    it("fails when dockerfilePath is missing", () => {
      const config = {
        method: "docker",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Manifests config", () => {
    it("parses valid manifests config with required fields only", () => {
      const config = {
        method: "manifests",
        directory: "./k8s",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method).toBe("manifests");
        expect((result.data as ManifestsConfig).directory).toBe("./k8s");
      }
    });

    it("parses valid manifests config with detection fields", () => {
      const config = {
        method: "manifests",
        directory: "./kubernetes",
        devCommand: "kubectl apply -k .",
        autoDetect: true,
        confidence: "medium",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method).toBe("manifests");
        expect(result.data.devCommand).toBe("kubectl apply -k .");
        expect(result.data.confidence).toBe("medium");
      }
    });

    it("fails when directory is missing", () => {
      const config = {
        method: "manifests",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Invalid configs", () => {
    it("fails with invalid method", () => {
      const config = {
        method: "invalid",
        chartPath: "./charts/my-app",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("fails with missing method", () => {
      const config = {
        chartPath: "./charts/my-app",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("fails with invalid packageManager", () => {
      const config = {
        method: "helm",
        chartPath: "./charts/my-app",
        packageManager: "invalid",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("fails with invalid projectType", () => {
      const config = {
        method: "docker",
        dockerfilePath: "./Dockerfile",
        projectType: "invalid",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("fails with invalid confidence", () => {
      const config = {
        method: "manifests",
        directory: "./k8s",
        confidence: "very-high",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Detection fields are optional", () => {
    it("helm config works without detection fields", () => {
      const config = {
        method: "helm",
        chartPath: "./charts/app",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.devCommand).toBeUndefined();
        expect(result.data.workdir).toBeUndefined();
        expect(result.data.packageManager).toBeUndefined();
        expect(result.data.projectType).toBeUndefined();
      }
    });

    it("docker config works without detection fields", () => {
      const config = {
        method: "docker",
        dockerfilePath: "./Dockerfile",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.devCommand).toBeUndefined();
        // autoDetect has a default of true, so it will be defined even if not provided
        expect(result.data.autoDetect).toBe(true);
      }
    });

    it("manifests config works without detection fields", () => {
      const config = {
        method: "manifests",
        directory: "./k8s",
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.confidence).toBeUndefined();
      }
    });

    it("detection fields can be null", () => {
      const config = {
        method: "helm",
        chartPath: "./charts/app",
        devCommand: null,
        workdir: null,
        packageManager: null,
        projectType: null,
        confidence: null,
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.devCommand).toBeNull();
        expect(result.data.workdir).toBeNull();
        expect(result.data.packageManager).toBeNull();
        expect(result.data.projectType).toBeNull();
        expect(result.data.confidence).toBeNull();
      }
    });
  });

  describe("envVars validation", () => {
    it("accepts valid envVars array", () => {
      const config = {
        method: "helm",
        chartPath: "./charts/app",
        envVars: [
          { name: "NODE_ENV", value: "production" },
          { name: "API_KEY", value: "secret123", isSecret: true },
        ],
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.envVars).toHaveLength(2);
        expect(result.data.envVars?.[0].name).toBe("NODE_ENV");
        expect(result.data.envVars?.[1].isSecret).toBe(true);
      }
    });

    it("fails with empty envVar name", () => {
      const config = {
        method: "helm",
        chartPath: "./charts/app",
        envVars: [{ name: "", value: "test" }],
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("managedServices validation", () => {
    it("accepts valid managedServices", () => {
      const config = {
        method: "docker",
        dockerfilePath: "./Dockerfile",
        managedServices: {
          postgres: { enabled: true },
          redis: { enabled: true },
          opensearch: { enabled: false },
        },
      };

      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.managedServices?.postgres?.enabled).toBe(true);
        expect(result.data.managedServices?.redis?.enabled).toBe(true);
        expect(result.data.managedServices?.opensearch?.enabled).toBe(false);
      }
    });
  });
});

describe("Type guards", () => {
  const helmConfig: EnvironmentConfig = {
    method: "helm",
    chartPath: "./charts/app",
  };

  const dockerConfig: EnvironmentConfig = {
    method: "docker",
    dockerfilePath: "./Dockerfile",
  };

  const manifestsConfig: EnvironmentConfig = {
    method: "manifests",
    directory: "./k8s",
  };

  describe("isHelmConfig", () => {
    it("returns true for helm config", () => {
      expect(isHelmConfig(helmConfig)).toBe(true);
    });

    it("returns false for docker config", () => {
      expect(isHelmConfig(dockerConfig)).toBe(false);
    });

    it("returns false for manifests config", () => {
      expect(isHelmConfig(manifestsConfig)).toBe(false);
    });
  });

  describe("isDockerConfig", () => {
    it("returns true for docker config", () => {
      expect(isDockerConfig(dockerConfig)).toBe(true);
    });

    it("returns false for helm config", () => {
      expect(isDockerConfig(helmConfig)).toBe(false);
    });

    it("returns false for manifests config", () => {
      expect(isDockerConfig(manifestsConfig)).toBe(false);
    });
  });

  describe("isManifestsConfig", () => {
    it("returns true for manifests config", () => {
      expect(isManifestsConfig(manifestsConfig)).toBe(true);
    });

    it("returns false for helm config", () => {
      expect(isManifestsConfig(helmConfig)).toBe(false);
    });

    it("returns false for docker config", () => {
      expect(isManifestsConfig(dockerConfig)).toBe(false);
    });
  });

  describe("Type narrowing", () => {
    it("allows accessing method-specific fields after type guard", () => {
      const config: EnvironmentConfig = {
        method: "helm",
        chartPath: "./charts/app",
        valuesPath: "./values.yaml",
      };

      expect(isHelmConfig(config)).toBe(true);
      if (isHelmConfig(config)) {
        expect(config.chartPath).toBe("./charts/app");
        expect(config.valuesPath).toBe("./values.yaml");
      }
    });
  });
});

describe("Individual method schemas", () => {
  describe("HelmConfigSchema", () => {
    it("can be used independently", () => {
      const config = {
        method: "helm",
        chartPath: "./charts/app",
      };

      const result = HelmConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("DockerConfigSchema", () => {
    it("can be used independently", () => {
      const config = {
        method: "docker",
        dockerfilePath: "./Dockerfile",
      };

      const result = DockerConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("ManifestsConfigSchema", () => {
    it("can be used independently", () => {
      const config = {
        method: "manifests",
        directory: "./k8s",
      };

      const result = ManifestsConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });
});
