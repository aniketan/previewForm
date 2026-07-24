import { attachReview } from "./index";
import type { ReviewController, ReviewOptions } from "./types";

declare global {
  interface Window {
    jQuery?: JQueryStatic;
  }

  interface JQuery {
    previewForm(optionsOrMethod?: Record<string, unknown> | string): this;
  }
}

type PreviewJQuery = JQueryStatic & {
  fn: JQuery & {
    previewForm?: (this: JQuery, optionsOrMethod?: Record<string, unknown> | string) => JQuery;
  };
};

function modernOptions(options: Record<string, unknown>): ReviewOptions {
  const callerFormatter = options.valueFormatter as ReviewOptions["valueFormatter"] | undefined;
  const result: ReviewOptions = {
    ...options,
    title: (options.title as string | undefined) ?? undefined,
    confirmLabel: (options.yes as string | undefined) ?? (options.confirmLabel as string | undefined),
    cancelLabel: (options.no as string | undefined) ?? (options.cancelLabel as string | undefined),
    description: (options.extratext as string | undefined) ?? (options.description as string | undefined),
    sensitiveFields: options.sensitiveFields as ReviewOptions["sensitiveFields"] | undefined
  };
  if (options.show_password === true) {
    result.valueFormatter = (control, value, entry) => {
      const passwordValue = control instanceof HTMLInputElement && control.type === "password"
        ? entry.rawValue || "Not provided"
        : value;
      return callerFormatter ? callerFormatter(control, passwordValue, { ...entry, value: passwordValue }) : passwordValue;
    };
  } else if (callerFormatter) {
    result.valueFormatter = callerFormatter;
  }
  if (options.identifier === "name") result.labelResolver = (control) => control.getAttribute("name") ?? undefined;
  if (options.identifier === "id") result.labelResolver = (control) => control.id || undefined;
  return result;
}

export function installJQueryAdapter($: JQueryStatic = (globalThis as typeof globalThis & { jQuery?: JQueryStatic }).jQuery as JQueryStatic): void {
  if (!$?.fn) throw new Error("jQuery is required to install the PreviewForm adapter");
  const controllers = new WeakMap<HTMLFormElement, ReviewController>();
  const jquery = $ as PreviewJQuery;
  jquery.fn.previewForm = function (this: JQuery, optionsOrMethod?: Record<string, unknown> | string) {
    const $forms = this;
    $forms.each(function () {
      const form = this as HTMLFormElement;
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

export default installJQueryAdapter;
