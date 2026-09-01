"use client";

interface WorkspaceIdentitySettingsProps {
  organizationName: string;
  organizationSlug: string;

  onOrganizationNameChange: (
    value: string,
  ) => void;

  onOrganizationSlugChange: (
    value: string,
  ) => void;
}

export default function WorkspaceIdentitySettings({
  organizationName,
  organizationSlug,
  onOrganizationNameChange,
  onOrganizationSlugChange,
}: WorkspaceIdentitySettingsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field
        label="Organization name"
        value={organizationName}
        placeholder="Acme AI"
        onChange={onOrganizationNameChange}
      />

      <Field
        label="Workspace slug"
        value={organizationSlug}
        placeholder="acme-ai"
        onChange={onOrganizationSlugChange}
        mono
      />
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  mono = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className={[
          "mt-2 h-11 w-full rounded-xl",
          "border border-[var(--color-border)]",
          "bg-[var(--color-background)]",
          "px-4",
          "text-[10px] text-[var(--color-foreground)]",
          "outline-none transition",
          "placeholder:text-[var(--color-foreground-muted)]",
          "focus:border-[var(--color-accent)]",
          mono ? "font-mono" : "",
        ].join(" ")}
      />
    </div>
  );
}