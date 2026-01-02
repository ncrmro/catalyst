import { Factory, faker } from "@/lib/factories";

/**
 * Container represents Kubernetes container status within a pod
 *
 * TODO: These will eventually come from the EnvironmentCR status field when
 * container information is integrated into the CR schema.
 *
 * Usage:
 *   const container = containerFactory.build();
 *   const running = containerFactory.running().build();
 *   const workspace = containerFactory.workspace().running().build();
 */

export interface Container {
	name: string;
	status: "running" | "pending" | "failed";
	restarts: number;
	image?: string;
	ready?: boolean;
}

class ContainerFactory extends Factory<Container> {
	// Status traits
	running() {
		return this.params({
			status: "running",
			ready: true,
			restarts: faker.number.int({ min: 0, max: 2 }),
		});
	}

	pending() {
		return this.params({
			status: "pending",
			ready: false,
			restarts: 0,
		});
	}

	failed() {
		return this.params({
			status: "failed",
			ready: false,
			restarts: faker.number.int({ min: 1, max: 10 }),
		});
	}

	// Container name traits (common container types)
	workspace() {
		return this.params({
			name: "workspace",
			image: `${faker.internet.domainWord()}/workspace:${faker.system.semver()}`,
		});
	}

	sidecar() {
		const sidecarName = faker.helpers.arrayElement([
			"proxy",
			"logger",
			"metrics",
			"cache",
		]);
		return this.params({
			name: sidecarName,
			image: `${faker.internet.domainWord()}/${sidecarName}:${faker.system.semver()}`,
		});
	}

	initContainer() {
		const initName = faker.helpers.arrayElement([
			"init-config",
			"init-db",
			"init-volumes",
			"setup",
		]);
		return this.params({
			name: initName,
			image: `${faker.internet.domainWord()}/${initName}:${faker.system.semver()}`,
		});
	}

	// Helper trait for containers with high restart counts
	unstable() {
		return this.params({
			restarts: faker.number.int({ min: 5, max: 50 }),
		});
	}

	// Helper trait for containers with custom images
	withImage(image: string) {
		return this.params({
			image,
		});
	}
}

export const containerFactory = ContainerFactory.define(() => {
	const containerNames = [
		"workspace",
		"proxy",
		"logger",
		"metrics",
		"cache",
		"init-config",
	];

	const name = faker.helpers.arrayElement(containerNames);
	const status = faker.helpers.weightedArrayElement([
		{ value: "running" as const, weight: 8 },
		{ value: "pending" as const, weight: 1 },
		{ value: "failed" as const, weight: 1 },
	]);

	return {
		name,
		status,
		restarts:
			status === "failed"
				? faker.number.int({ min: 1, max: 10 })
				: faker.number.int({ min: 0, max: 2 }),
		image: `${faker.internet.domainWord()}/${name}:${faker.system.semver()}`,
		ready: status === "running",
	};
});
