import { collectEntries, createContext } from "./collector";
import type { ReviewContext, ReviewController, ReviewOptions } from "./types";

export * from "./types";
export { collectEntries };

let instanceId = 0;

const defaults: Required<Pick<ReviewOptions, "mode" | "title" | "description" | "confirmLabel" | "cancelLabel" | "editLabel" | "editable" | "includeEmpty" | "sections" | "sensitiveFields" | "files">> = {
  mode: "dialog",
  title: "Review your answers",
  description: "Check your information before sending.",
  confirmLabel: "Send",
  cancelLabel: "Keep editing",
  editLabel: "Change",
  editable: true,
  includeEmpty: true,
  sections: true,
  sensitiveFields: "mask",
  files: "metadata"
};

function mergeOptions(options: ReviewOptions): ReviewOptions {
  return { ...defaults, ...options };
}

function element<T extends keyof HTMLElementTagNameMap>(tag: T, className?: string): HTMLElementTagNameMap[T] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function makeId(prefix: string): string {
  instanceId += 1;
  return `${prefix}-${instanceId}`;
}

function restoreFocus(target: HTMLElement | null) {
  if (!target || !document.contains(target)) return;
  window.setTimeout(() => target.focus(), 0);
}

function isNativeDialog(node: HTMLElement | HTMLDialogElement): node is HTMLDialogElement {
  return typeof HTMLDialogElement !== "undefined" && node instanceof HTMLDialogElement;
}

export function attachReview(form: HTMLFormElement, providedOptions: ReviewOptions = {}): ReviewController {
  if (!(form instanceof HTMLFormElement)) throw new TypeError("attachReview expects an HTMLFormElement");
  const options = mergeOptions(providedOptions);
  let submitter: HTMLElement | null = null;
  let context: ReviewContext | null = null;
  let activeElement: HTMLElement | null = null;
  let bypass = false;
  let destroyed = false;
  let root: HTMLElement | HTMLDialogElement | null = null;
  let titleId = "";
  let descriptionId = "";

  const shouldRunNativeValidation = () => {
    if (form.noValidate) return false;
    if ((submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) && submitter.formNoValidate) return false;
    return true;
  };

  const closeWithoutCallback = () => {
    if (!root) return;
    if (isNativeDialog(root) && root.open) root.close("cancel");
    if (!isNativeDialog(root)) root.hidden = true;
    if (options.mode === "page") form.hidden = false;
  };

  const close = (reason: "cancel" | "confirm" = "cancel") => {
    if (!context) return;
    const current = context;
    closeWithoutCallback();
    context = null;
    if (reason === "cancel") options.onCancel?.(current);
    restoreFocus(activeElement);
  };

  const confirm = () => {
    if (!context) return;
    const current = context;
    if (options.onConfirm?.(current) === false) return;
    closeWithoutCallback();
    context = null;
    bypass = true;
    try {
      const nativeSubmitter = submitter as HTMLButtonElement | HTMLInputElement | null;
      if (typeof form.requestSubmit === "function") form.requestSubmit(nativeSubmitter ?? undefined);
      else HTMLFormElement.prototype.submit.call(form);
    } finally {
      bypass = false;
    }
  };

  const edit = (control: HTMLElement) => {
    closeWithoutCallback();
    context = null;
    restoreFocus(control);
    control.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const render = () => {
    if (!root || !context) return;
    root.replaceChildren();
    const panel = element("div", "pf-review-panel");
    const header = element("header", "pf-review-header");
    const heading = element("h2", "pf-review-title");
    heading.id = titleId;
    heading.textContent = options.title ?? defaults.title;
    const description = element("p", "pf-review-description");
    description.id = descriptionId;
    description.textContent = options.description ?? defaults.description;
    header.append(heading, description);

    const body = element("div", "pf-review-body");
    let currentSection: string | undefined;
    let sectionBody: HTMLElement | null = null;
    for (const entry of context.entries) {
      if (!sectionBody || entry.section !== currentSection) {
        currentSection = entry.section;
        const section = element("section", "pf-review-section");
        if (currentSection) {
          const sectionTitle = element("h3", "pf-review-section-title");
          sectionTitle.textContent = currentSection;
          section.append(sectionTitle);
        }
        const list = element("dl", "pf-review-list");
        section.append(list);
        body.append(section);
        sectionBody = list;
      }
      if (!sectionBody || (entry.sensitive && options.sensitiveFields === "omit")) continue;
      const row = element("div", "pf-review-row");
      const label = element("dt", "pf-review-label");
      label.textContent = entry.label;
      const value = element("dd", "pf-review-value");
      value.textContent = entry.value;
      row.append(label, value);
      if (options.editable) {
        const editButton = element("button", "pf-review-edit");
        editButton.type = "button";
        editButton.textContent = options.editLabel ?? defaults.editLabel;
        editButton.setAttribute("aria-label", `${options.editLabel ?? defaults.editLabel} ${entry.label}`);
        editButton.addEventListener("click", () => edit(entry.control));
        row.append(editButton);
      }
      sectionBody.append(row);
    }

    const footer = element("footer", "pf-review-footer");
    const cancelButton = element("button", "pf-review-cancel");
    cancelButton.type = "button";
    cancelButton.textContent = options.cancelLabel ?? defaults.cancelLabel;
    cancelButton.addEventListener("click", () => close("cancel"));
    const confirmButton = element("button", "pf-review-confirm");
    confirmButton.type = "button";
    confirmButton.textContent = options.confirmLabel ?? defaults.confirmLabel;
    confirmButton.addEventListener("click", confirm);
    footer.append(cancelButton, confirmButton);
    panel.append(header, body, footer);
    root.append(panel);
    confirmButton.focus();
  };

  const ensureRoot = () => {
    if (root) return;
    titleId = makeId("pf-review-title");
    descriptionId = makeId("pf-review-description");
    const supportsDialog = typeof HTMLDialogElement !== "undefined" && typeof HTMLDialogElement.prototype.showModal === "function";
    if (options.mode === "dialog" && supportsDialog) {
      const dialog = element("dialog", "pf-review-dialog");
      dialog.setAttribute("aria-labelledby", titleId);
      dialog.setAttribute("aria-describedby", descriptionId);
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        close("cancel");
      });
      root = dialog;
      document.body.append(dialog);
    } else {
      const overlay = element("div", "pf-review-overlay");
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", titleId);
      overlay.setAttribute("aria-describedby", descriptionId);
      overlay.hidden = true;
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close("cancel");
          return;
        }
        if (event.key !== "Tab") return;
        const focusable = Array.from(overlay.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
      root = overlay;
      document.body.append(overlay);
    }
  };

  const open = () => {
    if (destroyed || bypass) return;
    ensureRoot();
    activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (shouldRunNativeValidation() && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    context = createContext(form, submitter, options);
    render();
    if (options.mode === "page") {
      form.hidden = true;
      root!.hidden = false;
    } else if (isNativeDialog(root!)) {
      root.hidden = false;
      root.showModal();
    } else {
      root!.hidden = false;
    }
    root?.querySelector<HTMLElement>(".pf-review-confirm")?.focus();
    options.onOpen?.(context);
  };

  const refresh = () => {
    if (!context) return;
    context = createContext(form, submitter, options);
    render();
  };

  const onSubmit = (event: SubmitEvent) => {
    if (bypass) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submitter = (event.submitter as HTMLElement | null) ?? null;
    open();
  };
  form.addEventListener("submit", onSubmit, true);

  return {
    open,
    close: () => close("cancel"),
    refresh,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      form.removeEventListener("submit", onSubmit, true);
      closeWithoutCallback();
      root?.remove();
      root = null;
      context = null;
    },
    getContext: () => context
  };
}

export default attachReview;
