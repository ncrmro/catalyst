"use server";

import { auth } from "@/auth";
import { isUserTeamMember } from "@/lib/team-auth";
import {
  getCloudAccounts,
  createCloudAccount as createCloudAccountModel,
  deleteCloudAccount as deleteCloudAccountModel,
} from "@/models/cloud-accounts";
import {
  createProviderConfig,
  deleteProviderConfig,
} from "@/models/crossplane-bridge";

import { revalidatePath } from "next/cache";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface CloudAccountSummary {
  id: string;
  teamId: string;
  provider: string;
  name: string;
  status: string;
  externalAccountId: string;
  credentialType: string;
  resourcePrefix: string | null;
  lastValidatedAt: Date | null;
  lastError: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkCloudAccountInput {
  provider: string;
  name: string;
  externalAccountId: string;
  credentialType: string;
  credential: string;
  resourcePrefix?: string;
}

export async function getCloudAccount(
  teamId: string,
  accountId: string,
): Promise<ActionResult<CloudAccountSummary>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const isMember = await isUserTeamMember(teamId);
  if (!isMember) {
    return { success: false, error: "Not authorized to view cloud account" };
  }

  try {
    const accounts = await getCloudAccounts({
      ids: [accountId],
      teamIds: [teamId],
    });

    if (accounts.length === 0) {
      return { success: false, error: "Cloud account not found" };
    }

    const a = accounts[0];
    const summary: CloudAccountSummary = {
      id: a.id,
      teamId: a.teamId,
      provider: a.provider,
      name: a.name,
      status: a.status,
      externalAccountId: a.externalAccountId,
      credentialType: a.credentialType,
      resourcePrefix: a.resourcePrefix,
      lastValidatedAt: a.lastValidatedAt,
      lastError: a.lastError,
      createdBy: a.createdBy,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };

    return { success: true, data: summary };
  } catch (error) {
    console.error("Failed to get cloud account:", error);
    return { success: false, error: "Failed to get cloud account" };
  }
}

export async function listCloudAccounts(
  teamId: string,
): Promise<ActionResult<CloudAccountSummary[]>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const isMember = await isUserTeamMember(teamId);
  if (!isMember) {
    return { success: false, error: "Not authorized to view cloud accounts" };
  }

  try {
    const accounts = await getCloudAccounts({ teamIds: [teamId] });

    const summaries: CloudAccountSummary[] = accounts.map((a) => ({
      id: a.id,
      teamId: a.teamId,
      provider: a.provider,
      name: a.name,
      status: a.status,
      externalAccountId: a.externalAccountId,
      credentialType: a.credentialType,
      resourcePrefix: a.resourcePrefix,
      lastValidatedAt: a.lastValidatedAt,
      lastError: a.lastError,
      createdBy: a.createdBy,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    return { success: true, data: summaries };
  } catch (error) {
    console.error("Failed to list cloud accounts:", error);
    return { success: false, error: "Failed to list cloud accounts" };
  }
}

export async function linkCloudAccount(
  teamId: string,
  input: LinkCloudAccountInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const isMember = await isUserTeamMember(teamId);
  if (!isMember) {
    return { success: false, error: "Not authorized to link cloud accounts" };
  }

  try {
    const account = await createCloudAccountModel({
      teamId,
      provider: input.provider,
      name: input.name,
      externalAccountId: input.externalAccountId,
      credentialType: input.credentialType,
      credential: input.credential,
      resourcePrefix: input.resourcePrefix,
      createdBy: session.user.id,
    });

    // Create Crossplane ProviderConfig
    await createProviderConfig(account.id);

    revalidatePath("/platform/cloud-accounts");

    return { success: true, data: { id: account.id } };
  } catch (error) {
    console.error("Failed to link cloud account:", error);
    return { success: false, error: "Failed to link cloud account" };
  }
}

export async function unlinkCloudAccount(
  teamId: string,
  accountId: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const isMember = await isUserTeamMember(teamId);
  if (!isMember) {
    return { success: false, error: "Not authorized to unlink cloud accounts" };
  }

  try {
    // Delete Crossplane ProviderConfig before DB record
    await deleteProviderConfig(accountId);

    const account = await deleteCloudAccountModel(accountId);
    revalidatePath("/platform/cloud-accounts");
    return { success: true, data: { id: account.id } };
  } catch (error) {
    console.error("Failed to unlink cloud account:", error);
    return { success: false, error: "Failed to unlink cloud account" };
  }
}
