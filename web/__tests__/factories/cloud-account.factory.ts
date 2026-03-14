import { Factory, faker, db } from "@/lib/factories";
import { cloudAccounts } from "@/db/schema";
import type { InferInsertModel } from "drizzle-orm";

type InsertCloudAccount = InferInsertModel<typeof cloudAccounts>;

class CloudAccountFactory extends Factory<InsertCloudAccount> {
  aws() {
    return this.params({
      provider: "aws",
      externalAccountId: faker.string.numeric(12),
      credentialType: "iam_role",
    });
  }

  gcp() {
    return this.params({
      provider: "gcp",
      externalAccountId: `${faker.word.adjective()}-${faker.word.noun()}-${faker.string.numeric(6)}`,
      credentialType: "service_account",
    });
  }

  azure() {
    return this.params({
      provider: "azure",
      externalAccountId: faker.string.uuid(),
      credentialType: "service_account",
    });
  }

  active() {
    return this.params({
      status: "active",
      lastValidatedAt: new Date(),
    });
  }

  async create(params?: Partial<InsertCloudAccount>) {
    const account = this.build(params);
    const [created] = await db
      .insert(cloudAccounts)
      .values(account)
      .returning();
    return created;
  }
}

export const cloudAccountFactory = CloudAccountFactory.define(() => ({
  teamId: "",
  provider: faker.helpers.arrayElement(["aws", "gcp", "azure"]),
  name: `${faker.company.name()} Cloud`,
  status: "pending",
  externalAccountId: faker.string.numeric(12),
  credentialType: faker.helpers.arrayElement([
    "iam_role",
    "service_account",
    "access_key",
  ]),
  credentialEncrypted: faker.string.hexadecimal({ length: 64 }),
  credentialIv: faker.string.hexadecimal({ length: 32 }),
  credentialAuthTag: faker.string.hexadecimal({ length: 32 }),
  createdBy: "",
}));
