// vitest.global-setup.ts
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import os from "os";

export async function setup() {
  // Load environment variables from .env file
  dotenv.config();

  // Display a message that environment variables are loaded
  console.log("Vitest global setup: Environment variables loaded from .env");

  // Log that KUBECONFIG_PRIMARY is available (without revealing contents)
  if (process.env.KUBECONFIG_PRIMARY) {
    console.log(
      "Vitest global setup: KUBECONFIG_PRIMARY environment variable is available",
    );

    // Create a temporary kubeconfig file
    const kubeConfigContent = Buffer.from(
      process.env.KUBECONFIG_PRIMARY,
      "base64",
    ).toString("utf-8");
    const tempKubeConfigPath = path.join(
      os.tmpdir(),
      `catalyst-test-kubeconfig-${Date.now()}.yaml`,
    );
    fs.writeFileSync(tempKubeConfigPath, kubeConfigContent);

    try {
      const projectRoot = path.resolve(process.cwd(), "..");
      // Use system kubectl directly. The wrapper at ../bin/kubectl enforces a specific
      // kubeconfig path which breaks when using KUBECONFIG_PRIMARY in CI.
      const kubectl = "kubectl";

      console.log(`Checking for CRDs using ${kubectl}...`);

      try {
        const crds = execSync(
          `${kubectl} get crds --kubeconfig "${tempKubeConfigPath}"`,
          { stdio: "pipe" },
        ).toString();

        if (
          !crds.includes("projects.catalyst.catalyst.dev") ||
          !crds.includes("environments.catalyst.catalyst.dev")
        ) {
          console.log("CRDs missing. Installing...");
          const crdPath = path.join(
            projectRoot,
            "operator",
            "config",
            "crd",
            "bases",
          );

          if (fs.existsSync(crdPath)) {
            execSync(
              `${kubectl} apply -f "${crdPath}" --kubeconfig "${tempKubeConfigPath}"`,
              { stdio: "inherit" },
            );
            console.log("CRDs installed successfully. Waiting for them to be established...");

            // Wait for CRDs to be established using kubectl wait
            try {
              execSync(
                `${kubectl} wait --for=condition=established crd/projects.catalyst.catalyst.dev crd/environments.catalyst.catalyst.dev --timeout=10s --kubeconfig "${tempKubeConfigPath}"`,
                { stdio: "inherit" },
              );
              console.log("CRDs are established and ready.");
            } catch (waitError) {
              console.warn(
                "Warning: Timed out waiting for CRDs to be established, but proceeding anyway.",
              );
            }
          } else {
            console.error(`CRD path not found: ${crdPath}`);
          }
        } else {
          console.log("Required CRDs already exist.");
        }
      } catch (e: any) {
        console.warn(
          "Failed to check/install CRDs (kubectl might be missing or cluster unreachable):",
          e.message,
        );
      }
    } finally {
      // Cleanup
      if (fs.existsSync(tempKubeConfigPath)) {
        fs.unlinkSync(tempKubeConfigPath);
      }
    }
  } else {
    console.warn(
      "Vitest global setup: KUBECONFIG_PRIMARY environment variable is NOT available",
    );
  }
}

export function teardown() {
  console.log("Vitest global teardown: Cleaning up...");
}
