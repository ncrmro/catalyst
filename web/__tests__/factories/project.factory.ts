import { Factory, faker } from "@/lib/factories";
import { generateSlug } from "@/lib/slug";
import { createProjects, type InsertProject } from "@/models/projects";

class ProjectFactory extends Factory<InsertProject> {
	/**
	 * Trait: Project with preview environments
	 */
	withEnvironments(count: number = 3) {
		return this.params({ previewEnvironmentsCount: count });
	}

	/**
	 * Create and persist project to database using model layer
	 */
	async create(params?: Partial<InsertProject>) {
		const project = this.build(params);
		const [created] = await createProjects(project);
		return created;
	}
}

export const projectFactory = ProjectFactory.define(() => {
	const name = faker.company.name();
	return {
		name,
		slug: generateSlug(name),
		fullName: `${faker.internet.username()}/${faker.lorem.slug()}`,
		description: faker.company.catchPhrase(),
		ownerLogin: faker.internet.username(),
		ownerType: "User" as const,
		ownerAvatarUrl: faker.image.avatar(),
		previewEnvironmentsCount: 0,
		// teamId will need to be provided when building
		teamId: "",
	};
});
