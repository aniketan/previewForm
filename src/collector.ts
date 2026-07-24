import type {
  FilePolicy,
  FileSummary,
  LabelResolver,
  ReviewEntry,
  ReviewOptions,
  SensitivePolicy
} from "./types";

const CONTROL_TYPES = new Set(["INPUT", "SELECT", "TEXTAREA", "OUTPUT"]);
const SENSITIVE_NAME = /password|passcode|token|secret|card|cvv|cvc|ssn|security/i;

function text(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function titleFromName(name: string): string {
  return text(name.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2"))
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Answer";
}

function labelFor(control: HTMLElement, resolver?: LabelResolver): string {
  const custom = resolver?.(control);
  if (custom) return text(custom);

  const explicit = control.getAttribute("data-preview-label");
  if (explicit) return text(explicit);

  const ariaLabel = control.getAttribute("aria-label");
  if (ariaLabel) return text(ariaLabel);

  const labelledBy = control.getAttribute("aria-labelledby");
  if (labelledBy) {
    const value = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");
    if (text(value)) return text(value);
  }

  const labels = (control as HTMLInputElement).labels;
  const label = labels?.[0]?.textContent;
  if (label && text(label)) return text(label);

  const name = control.getAttribute("name") || control.id;
  return titleFromName(name || "Answer");
}

function sectionFor(control: HTMLElement, enabled: boolean): string | undefined {
  if (!enabled) return undefined;
  const explicit = control.closest<HTMLElement>("[data-preview-section]")?.dataset.previewSection;
  if (explicit) return text(explicit);
  const legend = control.closest("fieldset")?.querySelector("legend")?.textContent;
  return text(legend) || undefined;
}

function isSensitive(control: HTMLElement): boolean {
  const input = control as HTMLInputElement;
  if (input.dataset.previewMask || input.dataset.sensitive !== undefined) return true;
  if (input.type === "password") return true;
  return SENSITIVE_NAME.test(input.name || input.id);
}

function mask(value: string, strategy: string | undefined): string {
  if (!value) return "Not provided";
  if (strategy === "last4") return `${"•".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
  if (value.includes("@")) {
    const [local, domain] = value.split("@", 2);
    return `${local.slice(0, 1)}••••@${domain}`;
  }
  return "••••••";
}

function fileSummaries(input: HTMLInputElement): FileSummary[] {
  return Array.from(input.files ?? []).map((file) => ({
    name: file.name,
    type: file.type || "Unknown type",
    size: file.size
  }));
}

function formatFiles(files: FileSummary[], policy: FilePolicy): string {
  if (policy === "filename") return files.map((file) => file.name).join(", ");
  return files
    .map((file) => `${file.name} (${file.type}, ${Math.ceil(file.size / 1024)} KB)`)
    .join(", ");
}

function selectedValue(control: HTMLElement): { raw: string; files?: FileSummary[] } {
  const input = control as HTMLInputElement;
  if (input.type === "file") {
    const files = fileSummaries(input);
    return { raw: files.map((file) => file.name).join(", "), files };
  }
  if (input.type === "radio" || input.type === "checkbox") {
    return { raw: input.checked ? input.value || "on" : "" };
  }
  if (control instanceof HTMLSelectElement) {
    return {
      raw: Array.from(control.selectedOptions).map((option) => option.textContent?.trim() || option.value).join(", ")
    };
  }
  return { raw: "value" in input ? input.value : control.textContent?.trim() || "" };
}

function policyFor(options: ReviewOptions): SensitivePolicy {
  return options.sensitiveFields ?? "mask";
}

function isSubmitter(element: HTMLElement | null): element is HTMLButtonElement | HTMLInputElement {
  if (!element) return false;
  if (element instanceof HTMLButtonElement) return ["submit", "button", "reset"].includes(element.type);
  if (element instanceof HTMLInputElement) return ["submit", "image"].includes(element.type);
  return false;
}

function shouldAppendSubmitterFallback(form: HTMLFormElement, submitter: HTMLButtonElement | HTMLInputElement): boolean {
  if (!submitter.name || submitter.disabled || submitter.form !== form) return false;
  if (submitter instanceof HTMLButtonElement) return submitter.type === "submit";
  return submitter.type === "submit";
}

function formDataFor(form: HTMLFormElement, submitter: HTMLElement | null): FormData {
  const nativeSubmitter = isSubmitter(submitter) ? submitter : null;
  if (nativeSubmitter) {
    try {
      return new FormData(form, nativeSubmitter);
    } catch {
      const formData = new FormData(form);
      if (shouldAppendSubmitterFallback(form, nativeSubmitter)) formData.append(nativeSubmitter.name, nativeSubmitter.value);
      return formData;
    }
  }
  return new FormData(form);
}

function isCollectableCheckbox(candidate: Element): candidate is HTMLInputElement {
  const input = candidate as HTMLInputElement;
  return input.type === "checkbox" && !input.disabled && input.dataset.previewIgnore === undefined;
}

function checkboxGroup(form: HTMLFormElement, name: string): HTMLInputElement[] {
  return Array.from(form.elements).filter(
    (candidate) => isCollectableCheckbox(candidate) && ((candidate as HTMLInputElement).name || candidate.id || "answer") === name
  ) as HTMLInputElement[];
}

export function collectEntries(form: HTMLFormElement, options: ReviewOptions = {}): ReviewEntry[] {
  const entries: ReviewEntry[] = [];
  const seenRadioGroups = new Set<string>();
  const seenCheckboxGroups = new Set<string>();

  for (const element of Array.from(form.elements)) {
    const control = element as HTMLElement;
    if (!CONTROL_TYPES.has(control.tagName)) continue;
    const input = control as HTMLInputElement;
    const type = input.type?.toLowerCase();
    if (["submit", "button", "reset", "image"].includes(type)) continue;
    if (input.disabled || control.dataset.previewIgnore !== undefined) continue;
    if (type === "hidden" && control.dataset.previewInclude !== "true") continue;

    const name = input.name || control.id || "answer";
    if (type === "radio") {
      if (seenRadioGroups.has(name)) continue;
      seenRadioGroups.add(name);
      const group = Array.from(form.elements).filter(
        (candidate) => (candidate as HTMLInputElement).type === "radio" && (candidate as HTMLInputElement).name === name
      ) as HTMLInputElement[];
      const checked = group.find((candidate) => candidate.checked);
      if (!checked && !options.includeEmpty) continue;
      const source = checked ?? group[0];
      if (!source) continue;
      const selected = checked ? selectedValue(source) : { raw: "" };
      entries.push(makeEntry(source, name, selected.raw, selected.files, options));
      continue;
    }

    if (type === "checkbox") {
      const group = checkboxGroup(form, name);
      if (group.length > 1) {
        if (seenCheckboxGroups.has(name)) continue;
        seenCheckboxGroups.add(name);
        const checked = group.filter((candidate) => candidate.checked);
        if (!checked.length && !options.includeEmpty) continue;
        const source = checked[0] ?? group[0];
        const raw = checked.map((candidate) => selectedValue(candidate).raw).filter(Boolean).join(", ");
        const label = options.labelResolver || source.getAttribute("data-preview-label") ? undefined : titleFromName(name);
        entries.push(makeEntry(source, name, raw, undefined, options, label));
        continue;
      }
    }

    const selected = selectedValue(control);
    if (selected.files?.length && (options.files ?? "metadata") === "omit") continue;
    if (!selected.raw && !options.includeEmpty) continue;
    if (type === "checkbox" && !input.checked && !options.includeEmpty) continue;
    entries.push(makeEntry(control, name, selected.raw, selected.files, options));
  }

  return entries;
}

function makeEntry(
  control: HTMLElement,
  name: string,
  rawValue: string,
  files: FileSummary[] | undefined,
  options: ReviewOptions,
  labelOverride?: string
): ReviewEntry {
  const sensitive = isSensitive(control);
  const sensitivePolicy = policyFor(options);
  if (sensitive && sensitivePolicy === "omit") {
    return {
      control,
      name,
      label: labelOverride ?? labelFor(control, options.labelResolver),
      value: "",
      rawValue,
      section: sectionFor(control, options.sections !== false),
      sensitive,
      files
    };
  }

  let value = rawValue || "Not provided";
  const input = control as HTMLInputElement;
  if (files?.length) {
    value = formatFiles(files, options.files ?? "metadata");
  } else if (sensitive && sensitivePolicy === "mask") {
    value = mask(rawValue, input.dataset.previewMask);
  }

  const entry: ReviewEntry = {
    control,
    name,
    label: labelOverride ?? labelFor(control, options.labelResolver),
    value,
    rawValue,
    section: sectionFor(control, options.sections !== false),
    sensitive,
    files
  };
  if (options.valueFormatter) entry.value = options.valueFormatter(control, value, entry);
  return entry;
}

export function createContext(
  form: HTMLFormElement,
  submitter: HTMLElement | null,
  options: ReviewOptions
) {
  return {
    form,
    submitter,
    entries: collectEntries(form, options),
    formData: formDataFor(form, submitter)
  };
}
