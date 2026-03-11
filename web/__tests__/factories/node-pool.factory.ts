import { Factory, faker, db } from "@/lib/factories";
import { nodePools } from "@/db/schema";
import type { InferInsertModel } from "drizzle-orm";

type InsertNodePool = InferInsertModel<typeof nodePools>;

class NodePoolFactory extends Factory<InsertNodePool> {
  async create(params?: Partial<InsertNodePool>) {
    const pool = this.build(params);
    const [created] = await db.insert(nodePools).values(pool).returning();
    return created;
  }
}

export const nodePoolFactory = NodePoolFactory.define(() => ({
  clusterId: "",
  name: `pool-${faker.word.adjective()}`,
  instanceType: faker.helpers.arrayElement([
    "t3.medium",
    "t3.large",
    "m5.xlarge",
    "c5.2xlarge",
  ]),
  minNodes: 1,
  maxNodes: 3,
  currentNodes: 0,
  spotEnabled: false,
  status: "provisioning",
}));
