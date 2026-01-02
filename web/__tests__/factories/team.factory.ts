import type { InferInsertModel } from "drizzle-orm";
import { teams } from "@/db/schema";
import { db, Factory, faker } from "@/lib/factories";

type InsertTeam = InferInsertModel<typeof teams>;

class TeamFactory extends Factory<InsertTeam> {
	/**
	 * Create and persist team to database
	 */
	async create(params?: Partial<InsertTeam>) {
		const team = this.build(params);
		const [created] = await db.insert(teams).values(team).returning();
		return created;
	}
}

export const teamFactory = TeamFactory.define(() => ({
	name: `${faker.company.name()} Team`,
	description: faker.company.catchPhrase(),
	// ownerId will need to be provided when building
	ownerId: "",
}));
