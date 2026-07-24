"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/jquery.ts
var jquery_exports = {};
__export(jquery_exports, {
  default: () => jquery_default,
  installJQueryAdapter: () => installJQueryAdapter
});
module.exports = __toCommonJS(jquery_exports);

// src/collector.ts
var CONTROL_TYPES = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA", "OUTPUT"]);
var SENSITIVE_NAME = /password|passcode|token|secret|card|cvv|cvc|ssn|security/i;
function text(value) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}
function titleFromName(name) {
  return text(name.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")).replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Answer";
}
function labelFor(control, resolver) {
  const custom = resolver?.(control);
  if (custom) return text(custom);
  const explicit = control.getAttribute("data-preview-label");
  if (explicit) return text(explicit);
  const ariaLabel = control.getAttribute("aria-label");
  if (ariaLabel) return text(ariaLabel);
  const labelledBy = control.getAttribute("aria-labelledby");
  if (labelledBy) {
    const value = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
    if (text(value)) return text(value);
  }
  const labels = control.labels;
  const label = labels?.[0]?.textContent;
  if (label && text(label)) return text(label);
  const name = control.getAttribute("name") || control.id;
  return titleFromName(name || "Answer");
}
function sectionFor(control, enabled) {
  if (!enabled) return void 0;
  const explicit = control.closest("[data-preview-section]")?.dataset.previewSection;
  if (explicit) return text(explicit);
  const legend = control.closest("fieldset")?.querySelector("legend")?.textContent;
  return text(legend) || void 0;
}
function isSensitive(control) {
  const input = control;
  if (input.dataset.previewMask || input.dataset.sensitive !== void 0) return true;
  if (input.type === "password") return true;
  return SENSITIVE_NAME.test(input.name || input.id);
}
function mask(value, strategy) {
  if (!value) return "Not provided";
  if (strategy === "last4") return `${"\u2022".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
  if (value.includes("@")) {
    const [local, domain] = value.split("@", 2);
    return `${local.slice(0, 1)}\u2022\u2022\u2022\u2022@${domain}`;
  }
  return "\u2022\u2022\u2022\u2022\u2022\u2022";
}
function fileSummaries(input) {
  return Array.from(input.files ?? []).map((file) => ({
    name: file.name,
    type: file.type || "Unknown type",
    size: file.size
  }));
}
function formatFiles(files, policy) {
  if (policy === "filename") return files.map((file) => file.name).join(", ");
  return files.map((file) => `${file.name} (${file.type}, ${Math.ceil(file.size / 1024)} KB)`).join(", ");
}
function selectedValue(control) {
  const input = control;
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
function policyFor(options) {
  return options.sensitiveFields ?? "mask";
}
function isSubmitter(element2) {
  if (!element2) return false;
  if (element2 instanceof HTMLButtonElement) return ["submit", "button", "reset"].includes(element2.type);
  if (element2 instanceof HTMLInputElement) return ["submit", "image"].includes(element2.type);
  return false;
}
function shouldAppendSubmitterFallback(form, submitter) {
  if (!submitter.name || submitter.disabled || submitter.form !== form) return false;
  if (submitter instanceof HTMLButtonElement) return submitter.type === "submit";
  return submitter.type === "submit";
}
function formDataFor(form, submitter) {
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
function isCollectableCheckbox(candidate) {
  const input = candidate;
  return input.type === "checkbox" && !input.disabled && input.dataset.previewIgnore === void 0;
}
function checkboxGroup(form, name) {
  return Array.from(form.elements).filter(
    (candidate) => isCollectableCheckbox(candidate) && (candidate.name || candidate.id || "answer") === name
  );
}
function collectEntries(form, options = {}) {
  const entries = [];
  const seenRadioGroups = /* @__PURE__ */ new Set();
  const seenCheckboxGroups = /* @__PURE__ */ new Set();
  for (const element2 of Array.from(form.elements)) {
    const control = element2;
    if (!CONTROL_TYPES.has(control.tagName)) continue;
    const input = control;
    const type = input.type?.toLowerCase();
    if (["submit", "button", "reset", "image"].includes(type)) continue;
    if (input.disabled || control.dataset.previewIgnore !== void 0) continue;
    if (type === "hidden" && control.dataset.previewInclude !== "true") continue;
    const name = input.name || control.id || "answer";
    if (type === "radio") {
      if (seenRadioGroups.has(name)) continue;
      seenRadioGroups.add(name);
      const group = Array.from(form.elements).filter(
        (candidate) => candidate.type === "radio" && candidate.name === name
      );
      const checked = group.find((candidate) => candidate.checked);
      if (!checked && !options.includeEmpty) continue;
      const source = checked ?? group[0];
      if (!source) continue;
      const selected2 = checked ? selectedValue(source) : { raw: "" };
      entries.push(makeEntry(source, name, selected2.raw, selected2.files, options));
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
        const label = options.labelResolver || source.getAttribute("data-preview-label") ? void 0 : titleFromName(name);
        entries.push(makeEntry(source, name, raw, void 0, options, label));
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
function makeEntry(control, name, rawValue, files, options, labelOverride) {
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
  const input = control;
  if (files?.length) {
    value = formatFiles(files, options.files ?? "metadata");
  } else if (sensitive && sensitivePolicy === "mask") {
    value = mask(rawValue, input.dataset.previewMask);
  }
  const entry = {
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
function createContext(form, submitter, options) {
  return {
    form,
    submitter,
    entries: collectEntries(form, options),
    formData: formDataFor(form, submitter)
  };
}

// src/index.ts
var instanceId = 0;
var defaults = {
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
function mergeOptions(options) {
  return { ...defaults, ...options };
}
function element(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
function makeId(prefix) {
  instanceId += 1;
  return `${prefix}-${instanceId}`;
}
function restoreFocus(target) {
  if (!target || !document.contains(target)) return;
  window.setTimeout(() => target.focus(), 0);
}
function isNativeDialog(node) {
  return typeof HTMLDialogElement !== "undefined" && node instanceof HTMLDialogElement;
}
function attachReview(form, providedOptions = {}) {
  if (!(form instanceof HTMLFormElement)) throw new TypeError("attachReview expects an HTMLFormElement");
  const options = mergeOptions(providedOptions);
  let submitter = null;
  let context = null;
  let activeElement = null;
  let bypass = false;
  let destroyed = false;
  let root = null;
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
  const close = (reason = "cancel") => {
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
      const nativeSubmitter = submitter;
      if (typeof form.requestSubmit === "function") form.requestSubmit(nativeSubmitter ?? void 0);
      else HTMLFormElement.prototype.submit.call(form);
    } finally {
      bypass = false;
    }
  };
  const edit = (control) => {
    closeWithoutCallback();
    context = null;
    restoreFocus(control);
    if (typeof control.scrollIntoView === "function") control.scrollIntoView({ behavior: "smooth", block: "center" });
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
    let currentSection;
    let sectionBody = null;
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
      if (!sectionBody || entry.sensitive && options.sensitiveFields === "omit") continue;
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
        const focusable = Array.from(overlay.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"));
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
      root.hidden = false;
    } else if (isNativeDialog(root)) {
      root.hidden = false;
      root.showModal();
    } else {
      root.hidden = false;
    }
    root?.querySelector(".pf-review-confirm")?.focus();
    options.onOpen?.(context);
  };
  const refresh = () => {
    if (!context) return;
    context = createContext(form, submitter, options);
    render();
  };
  const onSubmit = (event) => {
    if (bypass) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submitter = event.submitter ?? null;
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

// src/jquery.ts
function modernOptions(options) {
  const callerFormatter = options.valueFormatter;
  const result = {
    ...options,
    title: options.title ?? void 0,
    confirmLabel: options.yes ?? options.confirmLabel,
    cancelLabel: options.no ?? options.cancelLabel,
    description: options.extratext ?? options.description,
    sensitiveFields: options.sensitiveFields
  };
  if (options.show_password === true) {
    result.valueFormatter = (control, value, entry) => {
      const passwordValue = control instanceof HTMLInputElement && control.type === "password" ? entry.rawValue || "Not provided" : value;
      return callerFormatter ? callerFormatter(control, passwordValue, { ...entry, value: passwordValue }) : passwordValue;
    };
  } else if (callerFormatter) {
    result.valueFormatter = callerFormatter;
  }
  if (options.identifier === "name") result.labelResolver = (control) => control.getAttribute("name") ?? void 0;
  if (options.identifier === "id") result.labelResolver = (control) => control.id || void 0;
  return result;
}
function installJQueryAdapter($ = globalThis.jQuery) {
  if (!$?.fn) throw new Error("jQuery is required to install the PreviewForm adapter");
  const controllers = /* @__PURE__ */ new WeakMap();
  const jquery = $;
  jquery.fn.previewForm = function(optionsOrMethod) {
    const $forms = this;
    $forms.each(function() {
      const form = this;
      if (typeof optionsOrMethod === "string") {
        const controller = controllers.get(form);
        if (!controller) return;
        if (optionsOrMethod === "open") controller.open();
        if (optionsOrMethod === "refresh") controller.refresh();
        if (optionsOrMethod === "destroy") {
          controller.destroy();
          controllers.delete(form);
        }
        return;
      }
      controllers.get(form)?.destroy();
      controllers.set(form, attachReview(form, modernOptions(optionsOrMethod ?? {})));
    });
    return $forms;
  };
}
if (typeof window !== "undefined" && window.jQuery) installJQueryAdapter(window.jQuery);
var jquery_default = installJQueryAdapter;
//# sourceMappingURL=jquery.cjs.map
