"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import { SetupWizard, WizardData } from "./setup-wizard";

interface ConfigurePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function ConfigurePage({ params }: ConfigurePageProps) {
  const { slug } = use(params);
  const router = useRouter();

  const handleComplete = (data: WizardData) => {
    console.log("Wizard completed:", data);
    // TODO: Save configuration and create environment
    router.push(`/projects/${slug}`);
  };

  const handleCancel = () => {
    router.push(`/projects/${slug}`);
  };

  return (
    <SetupWizard
      project={{
        slug,
        name: slug,
        fullName: slug,
      }}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
