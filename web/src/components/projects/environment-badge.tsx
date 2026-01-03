type Environment = {
  id: string;
  projectId: string;
  repoId: string;
  environment: string;
  latestDeployment: string | null;
  createdAt: Date;
  updatedAt: Date;
  name?: string;
  type?: string;
  branch?: string;
  cronSchedule?: string;
  status?: string;
  url?: string;
};

export function EnvironmentBadge({
  environment,
}: {
  environment: Environment;
}) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "deploying":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-green-100 text-green-800"; // Default to active
    }
  };

  const getTypeIcon = (type?: string) => {
    if (!type) return "🔄";
    return type === "branch_push" ? "🔄" : "⏰";
  };

  const getTypeDescription = (env: Environment) => {
    if (env.type === "branch_push") {
      return env.branch ? `on ${env.branch}` : "branch push";
    } else {
      return env.cronSchedule ? `cron: ${env.cronSchedule}` : "scheduled";
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(environment.status)}`}
      >
        {getTypeIcon(environment.type)}
        {environment.name || environment.environment}
      </span>
      <span className="text-gray-500 text-xs">
        {getTypeDescription(environment)}
      </span>
    </div>
  );
}
