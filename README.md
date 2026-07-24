# PreviewForm 2.0

PreviewForm is a dependency-free, accessible review step for native HTML forms. It creates a “check before send” experience without replacing your form’s validation or submission behavior.

## Install

```bash
npm install preview-form
```

```js
import { attachReview } from "preview-form";
import "preview-form/styles.css";

const review = attachReview(document.querySelector("#my-form"), {
  title: "Review your answers",
  confirmLabel: "Send application",
  sensitiveFields: "mask",
  files: "metadata"
});
```

For a CDN build, load `dist/styles.css` and `dist/index.iife.js`, then use `PreviewForm.attachReview(form)`. For the jQuery CDN adapter, load jQuery first and then `dist/jquery.iife.js`; the adapter uses the existing `window.jQuery` and does not bundle another copy.

## Supported behavior

PreviewForm discovers labels, legends, ARIA labels, text inputs, textareas, selects, radio groups, checkbox groups, and file metadata. Values are rendered as text. Passwords and sensitive-looking fields are masked by default, while empty optional fields are shown as `Not provided`.

PreviewForm follows native form validation rules before opening the review. Forms with `novalidate` and submit buttons with `formnovalidate` can still open the review for draft-style flows, while normal invalid required fields continue to use the browser’s validation UI.

The `sensitiveFields` option controls what is displayed in the preview UI. It is not a sanitized security boundary for lifecycle callbacks, `ReviewContext.formData`, or code that directly inspects form controls.

`mode: "page"` is currently a page-takeover flow: it hides the original form while an overlay-style review is visible, then restores the form when the user cancels or chooses a field to edit. A true inline page renderer is planned for a future minor release.

Add field-level policy with `data-preview-ignore`, `data-preview-label`, `data-preview-mask`, and `data-preview-section`.

## jQuery compatibility

Load jQuery 3.7+ or 4.x first, then load `dist/jquery.iife.js`:

```js
$("#my-form").previewForm({
  title: "Please review",
  yes: "Send",
  no: "Keep editing",
  extratext: "Check your information before sending."
});
```

The adapter also supports `open`, `refresh`, and `destroy` methods. `show_password: true` reveals only password controls for legacy compatibility; other sensitive fields remain masked.

For ESM, import `installJQueryAdapter` from `preview-form/jquery`. It uses the jQuery instance already available on the page; it does not import or bundle jQuery itself. TypeScript users should install `@types/jquery`.

## Development

```bash
npm install
npm run build
npm test
```

PreviewForm 2.0 is a clean rewrite. Historical 1.x code remains available from earlier git tags/releases; new applications should use the v2 entry points.
