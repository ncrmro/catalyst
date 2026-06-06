import { Factory, faker, db } from "@/lib/factories";
import { managedClusters } from "@/db/schema";
import type { InferInsertModel } from "drizzle-orm";

type InsertManagedCluster = InferInsertModel<typeof managedClusters>;

class ManagedClusterFactory extends Factory<InsertManagedCluster> {
  active() {
    return this.params({
      status: "active",
    });
  }

  provisioning() {
    return this.params({
      status: "provisioning",
    });
  }

  async create(params?: Partial<InsertManagedCluster>) {
    const cluster = this.build(params);
    const [created] = await db
      .insert(managedClusters)
      .values(cluster)
      .returning();
    return created;
  }
}

export const managedClusterFactory = ManagedClusterFactory.define(() => ({
  cloudAccountId: "",
  teamId: "",
  name: `cluster-${faker.word.adjective()}-${faker.string.alphanumeric(4)}`,
  status: "provisioning",
  region: faker.helpers.arrayElement([
    "us-east-1",
    "us-west-2",
    "eu-west-1",
    "ap-southeast-1",
  ]),
  kubernetesVersion: faker.helpers.arrayElement(["1.28", "1.29", "1.30"]),
  deletionProtection: true,
  createdBy: "",
}));
