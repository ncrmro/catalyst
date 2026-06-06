"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

interface NodeGroup {
  name: string;
  instanceType: string;
  min: number;
  max: number;
  desired: number;
  autoscaling: boolean;
  spot: boolean;
}

const INSTANCE_TYPES = [
  "t3.medium",
  "t3.large",
  "m5.large",
  "m5.xlarge",
  "c5.large",
  "c5.xlarge",
] as const;

const defaultGroup: NodeGroup = {
  name: "default",
  instanceType: "t3.large",
  min: 1,
  max: 5,
  desired: 2,
  autoscaling: true,
  spot: false,
};

export function NodeGroupCard() {
  const [groups, setGroups] = useState<NodeGroup[]>([defaultGroup]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInstanceType, setNewInstanceType] = useState<string>(
    INSTANCE_TYPES[0],
  );

  const handleAdd = () => {
    if (!newName) return;
    setGroups((prev) => [
      ...prev,
      {
        name: newName,
        instanceType: newInstanceType,
        min: 1,
        max: 3,
        desired: 1,
        autoscaling: false,
        spot: false,
      },
    ]);
    setNewName("");
    setShowAdd(false);
  };

  const toggleGroupProp = (
    index: number,
    prop: "autoscaling" | "spot",
  ) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [prop]: !g[prop] } : g)),
    );
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-on-surface">Node Groups</h3>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-on-primary bg-primary hover:opacity-90 transition-opacity"
          >
            Add Node Group
          </button>
        </div>

        {showAdd && (
          <div className="p-3 rounded-lg border border-outline/50 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-on-surface-variant">
                  Node Group Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="workers"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-on-surface-variant">
                  Instance Type
                </label>
                <select
                  value={newInstanceType}
                  onChange={(e) => setNewInstanceType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {INSTANCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-on-surface-variant hover:bg-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newName}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-opacity ${
                  newName
                    ? "text-on-primary bg-primary hover:opacity-90"
                    : "bg-surface-variant text-on-surface-variant cursor-not-allowed"
                }`}
              >
                Add
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {groups.map((group, i) => (
            <div
              key={group.name}
              className="p-3 rounded-lg border border-outline/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">
                    {group.name}
                  </p>
                  <p className="text-xs text-on-surface-variant font-mono">
                    {group.instanceType}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                  <span>
                    {group.min}/{group.desired}/{group.max}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-outline/30">
                <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
                  <input
                    type="checkbox"
                    checked={group.autoscaling}
                    onChange={() => toggleGroupProp(i, "autoscaling")}
                    className="rounded border-outline"
                  />
                  Autoscaling
                </label>
                <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
                  <input
                    type="checkbox"
                    checked={group.spot}
                    onChange={() => toggleGroupProp(i, "spot")}
                    className="rounded border-outline"
                  />
                  Spot Instances
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
