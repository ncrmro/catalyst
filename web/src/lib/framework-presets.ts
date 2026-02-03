/**
 * Framework Presets for Environment Configuration (FR-ENV-030)
 *
 * Presets resolve to explicit Kubernetes-native configuration values before
 * writing to the CRD. The operator never sees preset names — it only operates
 * on the resolved K8s-native config values.
 *
 * Each preset defines concrete values for:
 * - Container image, command, args, working directory
 * - Ports, environment variables, resource requirements
 * - Health probes (liveness, readiness, startup)
 * - Init containers (package installation, migrations)
 * - Managed services (postgres, redis, etc.)
 * - Storage volumes (code, data)
 *
 * See specs/001-environments/plan.full-config.md for design details.
 */

import type {
  EnvironmentConfig as CRDEnvironmentConfig,
  InitContainerSpec,
  ManagedServiceSpec,
  VolumeSpec,
} from "@/types/crd";

export type PresetName =
  | "nextjs"
  | "generic-node"
  | "python"
  | "go"
  | "static"
  | "custom";

/**
 * Framework preset that resolves to K8s-native config
 */
export interface FrameworkPreset {
  name: PresetName;
  displayName: string;
  description: string;
  /**
   * Resolve this preset into explicit CRD configuration.
   * The operator reads these values directly — no preset name is passed.
   */
  resolve: (options?: PresetOptions) => CRDEnvironmentConfig;
}

/**
 * Options for customizing preset resolution
 */
export interface PresetOptions {
  /** Override the default working directory */
  workingDir?: string;
  /** Override the default port */
  port?: number;
  /** Enable/disable managed services */
  enablePostgres?: boolean;
  enableRedis?: boolean;
  /** Storage sizes */
  codeStorageSize?: string;
  dataStorageSize?: string;
}

/**
 * Next.js preset (development mode with hot reload)
 */
export const NEXTJS_PRESET: FrameworkPreset = {
  name: "nextjs",
  displayName: "Next.js",
  description:
    "Next.js with Turbopack hot reload, PostgreSQL, and health checks",
  resolve: (options = {}) => {
    const {
      workingDir = "/code/web",
      port = 3000,
      enablePostgres = true,
      codeStorageSize = "5Gi",
      dataStorageSize = "1Gi",
    } = options;

    const config: CRDEnvironmentConfig = {
      image: "node:22-slim",
      command: ["./node_modules/.bin/next", "dev", "--turbopack"],
      workingDir,
      ports: [{ containerPort: port }],
      env: [
        { name: "WATCHPACK_POLLING", value: "true" },
        { name: "PORT", value: String(port) },
      ],
      resources: {
        requests: {
          cpu: "200m",
          memory: "512Mi",
        },
        limits: {
          cpu: "1",
          memory: "2Gi", // next dev --turbopack requires 2Gi (OOMKilled at 1Gi)
        },
      },
      livenessProbe: {
        httpGet: {
          path: "/api/health/liveness",
          port,
        },
        periodSeconds: 15,
        failureThreshold: 3,
      },
      readinessProbe: {
        httpGet: {
          path: "/api/health/readiness",
          port,
        },
        periodSeconds: 10,
        failureThreshold: 3,
      },
      startupProbe: {
        httpGet: {
          path: "/api/health/liveness",
          port,
        },
        periodSeconds: 5,
        failureThreshold: 30, // 150 seconds total startup time
      },
      volumeMounts: [{ name: "code", mountPath: "/code" }],
      initContainers: [],
      services: [],
      volumes: [],
    };

    // Init containers (operator handles git-clone, only define app-level containers)
    const initContainers: InitContainerSpec[] = [
      {
        name: "npm-install",
        image: "node:22-slim",
        command: ["npm", "ci"],
        workingDir,
        resources: {
          requests: {
            cpu: "100m",
            memory: "256Mi",
          },
          limits: {
            cpu: "500m",
            memory: "1Gi",
          },
        },
        volumeMounts: [{ name: "code", mountPath: "/code" }],
      },
    ];

    // Add db-migrate if postgres is enabled
    if (enablePostgres) {
      initContainers.push({
        name: "db-migrate",
        image: "node:22-slim",
        command: ["sh", "-c", "npm run db:migrate && npm run seed"],
        workingDir,
        env: [
          {
            name: "DATABASE_URL",
            value: "postgresql://postgres:postgres@postgres:5432/catalyst",
          },
        ],
        resources: {
          requests: {
            cpu: "50m",
            memory: "128Mi",
          },
          limits: {
            cpu: "200m",
            memory: "512Mi",
          },
        },
        volumeMounts: [{ name: "code", mountPath: "/code" }],
      });

      // Inject DATABASE_URL into the main container
      config.env?.push({
        name: "DATABASE_URL",
        value: "postgresql://postgres:postgres@postgres:5432/catalyst",
      });
    }

    config.initContainers = initContainers;

    // Managed services
    const services: ManagedServiceSpec[] = [];
    if (enablePostgres) {
      services.push({
        name: "postgres",
        container: {
          image: "postgres:16",
          ports: [{ containerPort: 5432 }],
          env: [
            { name: "POSTGRES_DB", value: "catalyst" },
            { name: "POSTGRES_USER", value: "postgres" },
            { name: "POSTGRES_PASSWORD", value: "postgres" },
          ],
          resources: {
            requests: {
              cpu: "100m",
              memory: "128Mi",
            },
            limits: {
              cpu: "500m",
              memory: "512Mi",
            },
          },
        },
        storage: {
          resources: {
            requests: {
              storage: dataStorageSize,
            },
          },
          accessModes: ["ReadWriteOnce"],
        },
        database: "catalyst",
      });
    }

    config.services = services;

    // Volumes
    const volumes: VolumeSpec[] = [
      {
        name: "code",
        persistentVolumeClaim: {
          resources: {
            requests: {
              storage: codeStorageSize,
            },
          },
          accessModes: ["ReadWriteOnce"],
        },
      },
    ];

    config.volumes = volumes;

    return config;
  },
};

/**
 * Generic Node.js preset (minimal setup)
 */
export const GENERIC_NODE_PRESET: FrameworkPreset = {
  name: "generic-node",
  displayName: "Node.js (Generic)",
  description: "Generic Node.js application with npm start",
  resolve: (options = {}) => {
    const {
      workingDir = "/app",
      port = 3000,
      codeStorageSize = "5Gi",
    } = options;

    return {
      image: "node:22-slim",
      command: ["npm", "start"],
      workingDir,
      ports: [{ containerPort: port }],
      env: [{ name: "PORT", value: String(port) }],
      resources: {
        requests: {
          cpu: "100m",
          memory: "256Mi",
        },
        limits: {
          cpu: "500m",
          memory: "512Mi",
        },
      },
      livenessProbe: {
        httpGet: {
          path: "/healthz",
          port,
        },
        periodSeconds: 15,
      },
      readinessProbe: {
        httpGet: {
          path: "/healthz",
          port,
        },
        periodSeconds: 10,
      },
      volumeMounts: [{ name: "code", mountPath: "/app" }],
      initContainers: [
        {
          name: "npm-install",
          image: "node:22-slim",
          command: ["npm", "ci"],
          workingDir,
          resources: {
            requests: {
              cpu: "100m",
              memory: "256Mi",
            },
            limits: {
              cpu: "500m",
              memory: "1Gi",
            },
          },
          volumeMounts: [{ name: "code", mountPath: "/app" }],
        },
      ],
      services: [],
      volumes: [
        {
          name: "code",
          persistentVolumeClaim: {
            resources: {
              requests: {
                storage: codeStorageSize,
              },
            },
            accessModes: ["ReadWriteOnce"],
          },
        },
      ],
    };
  },
};

/**
 * Python preset (Flask/Django/FastAPI)
 */
export const PYTHON_PRESET: FrameworkPreset = {
  name: "python",
  displayName: "Python",
  description: "Python application with gunicorn",
  resolve: (options = {}) => {
    const {
      workingDir = "/app",
      port = 8000,
      codeStorageSize = "5Gi",
    } = options;

    return {
      image: "python:3.12-slim",
      command: ["gunicorn", "app:app", "--bind", `0.0.0.0:${port}`],
      workingDir,
      ports: [{ containerPort: port }],
      env: [{ name: "PORT", value: String(port) }],
      resources: {
        requests: {
          cpu: "100m",
          memory: "256Mi",
        },
        limits: {
          cpu: "500m",
          memory: "512Mi",
        },
      },
      livenessProbe: {
        httpGet: {
          path: "/health",
          port,
        },
        periodSeconds: 15,
      },
      readinessProbe: {
        httpGet: {
          path: "/health",
          port,
        },
        periodSeconds: 10,
      },
      volumeMounts: [{ name: "code", mountPath: "/app" }],
      initContainers: [
        {
          name: "pip-install",
          image: "python:3.12-slim",
          command: ["pip", "install", "-r", "requirements.txt"],
          workingDir,
          resources: {
            requests: {
              cpu: "100m",
              memory: "256Mi",
            },
            limits: {
              cpu: "500m",
              memory: "512Mi",
            },
          },
          volumeMounts: [{ name: "code", mountPath: "/app" }],
        },
      ],
      services: [],
      volumes: [
        {
          name: "code",
          persistentVolumeClaim: {
            resources: {
              requests: {
                storage: codeStorageSize,
              },
            },
            accessModes: ["ReadWriteOnce"],
          },
        },
      ],
    };
  },
};

/**
 * Go preset
 */
export const GO_PRESET: FrameworkPreset = {
  name: "go",
  displayName: "Go",
  description: "Go application with go run",
  resolve: (options = {}) => {
    const {
      workingDir = "/app",
      port = 8080,
      codeStorageSize = "5Gi",
    } = options;

    return {
      image: "golang:1.22",
      command: ["go", "run", "."],
      workingDir,
      ports: [{ containerPort: port }],
      env: [{ name: "PORT", value: String(port) }],
      resources: {
        requests: {
          cpu: "100m",
          memory: "128Mi",
        },
        limits: {
          cpu: "500m",
          memory: "256Mi",
        },
      },
      livenessProbe: {
        httpGet: {
          path: "/healthz",
          port,
        },
        periodSeconds: 15,
      },
      readinessProbe: {
        httpGet: {
          path: "/healthz",
          port,
        },
        periodSeconds: 10,
      },
      volumeMounts: [{ name: "code", mountPath: "/app" }],
      initContainers: [
        {
          name: "go-mod-download",
          image: "golang:1.22",
          command: ["go", "mod", "download"],
          workingDir,
          resources: {
            requests: {
              cpu: "100m",
              memory: "256Mi",
            },
            limits: {
              cpu: "500m",
              memory: "1Gi",
            },
          },
          volumeMounts: [{ name: "code", mountPath: "/app" }],
        },
      ],
      services: [],
      volumes: [
        {
          name: "code",
          persistentVolumeClaim: {
            resources: {
              requests: {
                storage: codeStorageSize,
              },
            },
            accessModes: ["ReadWriteOnce"],
          },
        },
      ],
    };
  },
};

/**
 * Static site preset (Nginx)
 */
export const STATIC_PRESET: FrameworkPreset = {
  name: "static",
  displayName: "Static Site",
  description: "Static files served by Nginx",
  resolve: (options = {}) => {
    const { port = 80, codeStorageSize = "1Gi" } = options;

    return {
      image: "nginx:alpine",
      // Nginx default command
      command: [],
      workingDir: "/usr/share/nginx/html",
      ports: [{ containerPort: port }],
      env: [],
      resources: {
        requests: {
          cpu: "50m",
          memory: "64Mi",
        },
        limits: {
          cpu: "200m",
          memory: "128Mi",
        },
      },
      livenessProbe: {
        httpGet: {
          path: "/",
          port,
        },
        periodSeconds: 15,
      },
      readinessProbe: {
        httpGet: {
          path: "/",
          port,
        },
        periodSeconds: 10,
      },
      volumeMounts: [
        { name: "code", mountPath: "/usr/share/nginx/html", readOnly: true },
      ],
      initContainers: [],
      services: [],
      volumes: [
        {
          name: "code",
          persistentVolumeClaim: {
            resources: {
              requests: {
                storage: codeStorageSize,
              },
            },
            accessModes: ["ReadWriteOnce"],
          },
        },
      ],
    };
  },
};

/**
 * Custom preset (empty config - user must specify everything)
 */
export const CUSTOM_PRESET: FrameworkPreset = {
  name: "custom",
  displayName: "Custom",
  description: "Custom configuration - specify all fields manually",
  resolve: () => {
    return {
      image: "",
      command: [],
      args: [],
      workingDir: "",
      ports: [],
      env: [],
      resources: undefined,
      livenessProbe: undefined,
      readinessProbe: undefined,
      startupProbe: undefined,
      volumeMounts: [],
      initContainers: [],
      services: [],
      volumes: [],
    };
  },
};

/**
 * All available presets
 */
export const FRAMEWORK_PRESETS: Record<PresetName, FrameworkPreset> = {
  nextjs: NEXTJS_PRESET,
  "generic-node": GENERIC_NODE_PRESET,
  python: PYTHON_PRESET,
  go: GO_PRESET,
  static: STATIC_PRESET,
  custom: CUSTOM_PRESET,
};

/**
 * Get a preset by name
 */
export function getPreset(name: PresetName): FrameworkPreset {
  return FRAMEWORK_PRESETS[name];
}

/**
 * Get preset names for UI selection
 */
export function getPresetNames(): PresetName[] {
  return Object.keys(FRAMEWORK_PRESETS) as PresetName[];
}

/**
 * Resolve a preset name to explicit CRD configuration
 */
export function resolvePreset(
  name: PresetName,
  options?: PresetOptions,
): CRDEnvironmentConfig {
  const preset = getPreset(name);
  return preset.resolve(options);
}
