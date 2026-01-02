import { Factory, faker } from "@/lib/factories";
import {
	type InsertPullRequest,
	upsertPullRequests,
} from "@/models/pull-requests";

class PullRequestFactory extends Factory<InsertPullRequest> {
	/**
	 * Trait: Draft pull request
	 */
	draft() {
		return this.params({ status: "draft" });
	}

	/**
	 * Trait: Ready for review pull request
	 */
	ready() {
		return this.params({ status: "ready" });
	}

	/**
	 * Trait: Merged pull request
	 */
	merged() {
		return this.params({
			state: "merged",
			mergedAt: faker.date.recent(),
			closedAt: faker.date.recent(),
		});
	}

	/**
	 * Trait: Closed pull request
	 */
	closed() {
		return this.params({
			state: "closed",
			closedAt: faker.date.recent(),
		});
	}

	/**
	 * Create and persist pull request to database using model layer
	 */
	async create(params?: Partial<InsertPullRequest>) {
		const pr = this.build(params);
		const [created] = await upsertPullRequests(pr);
		return created.pullRequest;
	}
}

export const pullRequestFactory = PullRequestFactory.define(() => ({
	number: faker.number.int({ min: 1, max: 9999 }),
	title: `${faker.hacker.verb()} ${faker.hacker.noun()}`,
	status: "ready" as const,
	provider: "github",
	url: faker.internet.url(),
	// repoId will need to be provided when building
	repoId: "",
	providerPrId: String(faker.number.int({ min: 1, max: 99999 })),
	state: "open" as const,
	authorLogin: faker.internet.username(),
	authorAvatarUrl: faker.image.avatar(),
	headBranch: `feature/${faker.lorem.slug()}`,
	baseBranch: "main",
	body: faker.lorem.paragraph(),
	commentsCount: faker.number.int({ min: 0, max: 20 }),
	reviewsCount: faker.number.int({ min: 0, max: 5 }),
	changedFilesCount: faker.number.int({ min: 1, max: 50 }),
	additionsCount: faker.number.int({ min: 1, max: 500 }),
	deletionsCount: faker.number.int({ min: 0, max: 200 }),
	// JSON fields stored as strings - will be serialized by model layer
	labels: JSON.stringify([faker.lorem.word(), faker.lorem.word()]),
	assignees: JSON.stringify([faker.internet.username()]),
	reviewers: JSON.stringify([faker.internet.username()]),
	createdAt: faker.date.past(),
	updatedAt: faker.date.recent(),
}));
