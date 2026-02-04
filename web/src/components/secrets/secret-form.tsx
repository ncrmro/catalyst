"use client";

/**
 * Secret Form Component
 *
 * Form for creating or editing secrets.
 * Validates name format and handles submission.
 */

import { useState, useEffect } from "react";
import type { CreateSecretInput, UpdateSecretInput } from "@/types/secrets";
import { SECRET_NAME_REGEX } from "@/schemas/secrets";

interface SecretFormProps {
  mode: "create" | "edit";
  initialData?: {
    name: string;
    description?: string | null;
  };
  onSubmit: (data: CreateSecretInput | UpdateSecretInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SecretForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: SecretFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [nameError, setNameError] = useState("");
  const [valueError, setValueError] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || "");
    }
  }, [initialData]);

  const validateName = (name: string): boolean => {
    if (!name) {
      setNameError("Secret name is required");
      return false;
    }
    if (!SECRET_NAME_REGEX.test(name)) {
      setNameError(
        "Name must start with a letter or underscore and contain only uppercase letters, numbers, and underscores",
      );
      return false;
    }
    if (name.length > 253) {
      setNameError("Name must be 253 characters or less");
      return false;
    }
    setNameError("");
    return true;
  };

  const validateValue = (value: string): boolean => {
    if (mode === "create" && !value) {
      setValueError("Secret value is required");
      return false;
    }
    if (value && value.length > 10000) {
      setValueError("Value must be 10000 characters or less");
      return false;
    }
    setValueError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameValid = validateName(name);
    const valueValid = validateValue(value);

    if (!nameValid || !valueValid) {
      return;
    }

    if (mode === "create") {
      await onSubmit({
        name,
        value,
        description: description || undefined,
      } as CreateSecretInput);
    } else {
      await onSubmit({
        value: value || undefined,
        description: description || undefined,
      } as UpdateSecretInput);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Secret Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-on-surface mb-2"
        >
          Secret Name *
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value.toUpperCase());
            setNameError("");
          }}
          onBlur={() => validateName(name)}
          disabled={mode === "edit" || isSubmitting}
          placeholder="GITHUB_APP_ID"
          className={`w-full px-4 py-2 bg-surface border ${
            nameError ? "border-error" : "border-outline"
          } rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed font-mono`}
        />
        {nameError && (
          <p className="mt-1 text-sm text-error">{nameError}</p>
        )}
        <p className="mt-1 text-xs text-on-surface-variant">
          Uppercase letters, numbers, and underscores only. Must start with a
          letter or underscore.
        </p>
      </div>

      {/* Secret Value */}
      <div>
        <label
          htmlFor="value"
          className="block text-sm font-medium text-on-surface mb-2"
        >
          Secret Value {mode === "create" && "*"}
        </label>
        <textarea
          id="value"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setValueError("");
          }}
          onBlur={() => validateValue(value)}
          disabled={isSubmitting}
          placeholder={
            mode === "edit"
              ? "Leave empty to keep current value"
              : "Enter secret value..."
          }
          rows={4}
          className={`w-full px-4 py-2 bg-surface border ${
            valueError ? "border-error" : "border-outline"
          } rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm`}
        />
        {valueError && (
          <p className="mt-1 text-sm text-error">{valueError}</p>
        )}
        <p className="mt-1 text-xs text-on-surface-variant">
          {mode === "edit"
            ? "Leave empty to keep the existing value"
            : "This value will be encrypted before storage"}
        </p>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-on-surface mb-2"
        >
          Description (Optional)
        </label>
        <input
          type="text"
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          placeholder="Brief description of this secret..."
          className="w-full px-4 py-2 bg-surface border border-outline rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-outline rounded-lg text-on-surface hover:bg-surface-variant disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Create Secret"
              : "Update Secret"}
        </button>
      </div>
    </form>
  );
}
