import { Factory, faker, db } from "@/lib/factories";
import { upsertRepos, type InsertRepo } from "@/models/repos";

class RepoFactory extends Factory<InsertRepo> {
  /**
   * Trait: Private repository
   */
  private() {
    return this.params({ isPrivate: true });
  }

  /**
   * Trait: Public repository
   */
  public() {
    return this.params({ isPrivate: false });
  }

  /**
   * Create and persist repo to database using model layer
   */
  async create(params?: Partial<InsertRepo>) {
    const repo = this.build(params);
    const [created] = await upsertRepos([repo]);
    return created;
  }
}

export const repoFactory = RepoFactory.define(({ sequence }) => ({
  githubId: faker.number.int({ min: 100000, max: 999999 }),
  name: faker.lorem.slug(),
  fullName: `${faker.internet.username()}/${faker.lorem.slug()}`,
  description: faker.company.catchPhrase(),
  url: faker.internet.url(),
  isPrivate: false,
  language: faker.helpers.arrayElement([
    "TypeScript",
    "JavaScript",
    "Python",
    "Go",
    "Rust",
  ]),
  stargazersCount: faker.number.int({ min: 0, max: 1000 }),
  forksCount: faker.number.int({ min: 0, max: 100 }),
  openIssuesCount: faker.number.int({ min: 0, max: 50 }),
  ownerLogin: faker.internet.username(),
  ownerType: "User" as const,
  ownerAvatarUrl: faker.image.avatar(),
  // teamId will need to be provided when building
  teamId: "",
  pushedAt: faker.date.recent(),
}));
