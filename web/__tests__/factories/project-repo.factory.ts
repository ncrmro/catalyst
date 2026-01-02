import { Factory } from "@/lib/factories";
import {
	createProjectRepoLinks,
	type InsertProjectRepo,
} from "@/models/project-repos";

class ProjectRepoFactory extends Factory<InsertProjectRepo> {
	/**
	 * Trait: Primary repository for project
	 */
	primary() {
		return this.params({ isPrimary: true });
	}

	/**
	 * Trait: Secondary repository for project
	 */
	secondary() {
		return this.params({ isPrimary: false });
	}

	/**
	 * Create and persist project-repo link to database using model layer
	 */
	async create(params?: Partial<InsertProjectRepo>) {
		const link = this.build(params);
		const [created] = await createProjectRepoLinks([link]);
		return created;
	}
}

export const projectRepoFactory = ProjectRepoFactory.define(() => ({
	// projectId and repoId will need to be provided when building
	projectId: "",
	repoId: "",
	isPrimary: false,
}));
