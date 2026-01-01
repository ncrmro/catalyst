import { Factory, faker } from "@/lib/factories";

/**
 * Agent Run represents execution data for agents running within environments
 *
 * TODO: These will eventually come from the EnvironmentCR status field when
 * agents are integrated into the CR schema.
 *
 * Usage:
 *   const run = agentRunFactory.build();
 *   const running = agentRunFactory.running().build();
 *   const failed = agentRunFactory.failed().build();
 */

export interface AgentRun {
  id: string;
  agent: string;
  goal: string;
  status: "running" | "completed" | "failed" | "pending";
  startTime: string;
  duration: string;
  logs: string;
}

class AgentRunFactory extends Factory<AgentRun> {
  // Status traits
  running() {
    return this.params({
      status: "running",
      duration: `${faker.number.int({ min: 1, max: 15 })}m ${faker.number.int({ min: 0, max: 59 })}s`,
      logs: this.generateRunningLogs(),
    });
  }

  completed() {
    return this.params({
      status: "completed",
      duration: `${faker.number.int({ min: 1, max: 30 })}m ${faker.number.int({ min: 0, max: 59 })}s`,
      logs: this.generateCompletedLogs(),
    });
  }

  failed() {
    return this.params({
      status: "failed",
      duration: `${faker.number.int({ min: 1, max: 20 })}m ${faker.number.int({ min: 0, max: 59 })}s`,
      logs: this.generateFailedLogs(),
    });
  }

  pending() {
    return this.params({
      status: "pending",
      duration: "0m 0s",
      logs: "[Waiting to start...]",
    });
  }

  // Agent type traits
  implementationAgent() {
    return this.params({
      agent: "implementation-agent",
      goal: `Implement ${faker.hacker.verb()} ${faker.hacker.noun()} based on requirements`,
    });
  }

  reviewAgent() {
    return this.params({
      agent: "review-agent",
      goal: `Review code changes for ${faker.hacker.adjective()} ${faker.hacker.noun()}`,
    });
  }

  testAgent() {
    return this.params({
      agent: "test-agent",
      goal: `Run test suite and validate ${faker.hacker.noun()}`,
    });
  }

  refactorAgent() {
    return this.params({
      agent: "refactor-agent",
      goal: `Refactor ${faker.hacker.noun()} for better ${faker.hacker.adjective()} performance`,
    });
  }

  // Helper methods for generating realistic logs
  private generateRunningLogs(): string {
    const startTime = faker.date.recent().toLocaleTimeString();
    const steps = faker.number.int({ min: 2, max: 5 });
    let logs = `[${startTime}] Agent initialized\n`;

    for (let i = 0; i < steps; i++) {
      const stepTime = faker.date.recent().toLocaleTimeString();
      logs += `[${stepTime}] ${faker.hacker.verb()} ${faker.hacker.noun()}...\n`;
    }

    logs += `[${faker.date.recent().toLocaleTimeString()}] 🔄 Processing...`;
    return logs;
  }

  private generateCompletedLogs(): string {
    const startTime = faker.date.recent().toLocaleTimeString();
    const steps = faker.number.int({ min: 3, max: 8 });
    let logs = `[${startTime}] Agent initialized\n`;

    for (let i = 0; i < steps; i++) {
      const stepTime = faker.date.recent().toLocaleTimeString();
      const action = faker.hacker.verb();
      const target = faker.hacker.noun();
      logs += `[${stepTime}] ${action} ${target}...\n`;
      logs += `[${stepTime}] ✓ ${action.charAt(0).toUpperCase() + action.slice(1)}ed ${target} successfully\n`;
    }

    logs += `[${faker.date.recent().toLocaleTimeString()}] Running validation...\n`;
    logs += `[${faker.date.recent().toLocaleTimeString()}] ✓ All checks passed\n`;
    logs += `[${faker.date.recent().toLocaleTimeString()}] ✅ Task completed successfully`;
    return logs;
  }

  private generateFailedLogs(): string {
    const startTime = faker.date.recent().toLocaleTimeString();
    const steps = faker.number.int({ min: 2, max: 4 });
    let logs = `[${startTime}] Agent initialized\n`;

    for (let i = 0; i < steps; i++) {
      const stepTime = faker.date.recent().toLocaleTimeString();
      logs += `[${stepTime}] ${faker.hacker.verb()} ${faker.hacker.noun()}...\n`;

      if (i === steps - 1) {
        // Fail on the last step
        logs += `[${stepTime}] ❌ Error: ${faker.lorem.sentence()}\n`;
        logs += `[${stepTime}] Stack trace:\n`;
        logs += `  at ${faker.system.fileName()} (${faker.system.filePath()}:${faker.number.int({ min: 1, max: 999 })})\n`;
        logs += `  at ${faker.system.fileName()} (${faker.system.filePath()}:${faker.number.int({ min: 1, max: 999 })})\n`;
      } else {
        logs += `[${stepTime}] ✓ Completed\n`;
      }
    }

    logs += `[${faker.date.recent().toLocaleTimeString()}] ⚠️ Agent execution failed`;
    return logs;
  }
}

export const agentRunFactory = AgentRunFactory.define(() => {
  const agentTypes = [
    "implementation-agent",
    "review-agent",
    "test-agent",
    "refactor-agent",
    "deployment-agent",
  ];

  const status = faker.helpers.arrayElement([
    "completed",
    "running",
    "failed",
    "pending",
  ]);

  const agentType = faker.helpers.arrayElement(agentTypes);

  return {
    id: faker.string.uuid(),
    agent: agentType,
    goal: faker.hacker.phrase(),
    status,
    startTime: faker.date.recent({ days: 1 }).toLocaleString(),
    duration: `${faker.number.int({ min: 1, max: 30 })}m ${faker.number.int({ min: 0, max: 59 })}s`,
    logs: faker.lorem.paragraphs(5, "\n"),
  };
});
