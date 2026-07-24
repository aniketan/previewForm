import { beforeEach, describe, expect, it, vi } from "vitest";
import { attachReview, collectEntries } from "../src/index";

beforeEach(() => { document.body.innerHTML = ""; });

describe("collectEntries", () => {
  it("collects native controls, labels, sections and masks sensitive values", () => {
    document.body.innerHTML = `<form id="f"><fieldset><legend>Contact</legend>
      <label for="name">Name</label><input id="name" name="name" value="Ada">
      <label>Email <input name="email" value="ada@example.com"></label>
      <label for="password">Password</label><input id="password" name="password" type="password" value="secret">
      <label><input name="updates" type="checkbox" value="yes" checked> Updates</label>
    </fieldset></form>`;
    const form = document.querySelector("form")!;
    const entries = collectEntries(form, { includeEmpty: true });
    expect(entries.map((entry) => entry.label)).toEqual(["Name", "Email", "Password", "Updates"]);
    expect(entries.find((entry) => entry.name === "password")?.value).toBe("••••••");
    expect(entries[0].section).toBe("Contact");
  });

  it("does not create HTML from user-controlled values", () => {
    document.body.innerHTML = `<form><label for="name">Name</label><input id="name" name="name"><button>Send</button></form>`;
    const form = document.querySelector("form")!;
    form.querySelector<HTMLInputElement>("input")!.value = "<img src=x onerror=alert(1)>";
    const controller = attachReview(form);
    controller.open();
    const value = document.querySelector(".pf-review-value")!;
    expect(value.textContent).toContain("<img");
    expect(value.querySelector("img")).toBeNull();
  });

  it("formats multi-select values and file metadata", () => {
    document.body.innerHTML = `<form><label for="topics">Topics</label><select id="topics" name="topics" multiple><option selected>Forms</option><option selected>Accessibility</option></select><label for="attachment">Attachment</label><input id="attachment" name="attachment" type="file"></form>`;
    const form = document.querySelector("form")!;
    const fileInput = form.querySelector<HTMLInputElement>("input[type=file]")!;
    Object.defineProperty(fileInput, "files", { configurable: true, value: [new File(["x"], "resume.pdf", { type: "application/pdf" })] });
    const entries = collectEntries(form, { includeEmpty: true });
    expect(entries.find((entry) => entry.name === "topics")?.value).toBe("Forms, Accessibility");
    expect(entries.find((entry) => entry.name === "attachment")?.value).toContain("resume.pdf");
  });
});

describe("attachReview", () => {
  it("prevents invalid submission and opens a review for valid forms", () => {
    document.body.innerHTML = `<form><label for="name">Name</label><input id="name" name="name" required><button type="submit">Send</button></form>`;
    const form = document.querySelector("form")!;
    const controller = attachReview(form);
    const input = form.querySelector("input")!;
    controller.open();
    expect(document.querySelector(".pf-review-panel")).toBeNull();
    input.value = "Grace";
    controller.open();
    expect(document.querySelector(".pf-review-panel")).not.toBeNull();
    expect(controller.getContext()?.entries[0].value).toBe("Grace");
  });

  it("respects form-level novalidate when opening the review", () => {
    document.body.innerHTML = `<form novalidate><label for="name">Name</label><input id="name" name="name" required><button type="submit">Save draft</button></form>`;
    const form = document.querySelector("form")!;
    const submitter = form.querySelector<HTMLButtonElement>("button")!;
    attachReview(form);
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true, submitter }));
    expect(document.querySelector(".pf-review-panel")).not.toBeNull();
    expect(document.querySelector(".pf-review-value")?.textContent).toBe("Not provided");
  });

  it("respects submitter-level formnovalidate when opening the review", () => {
    document.body.innerHTML = `<form><label for="name">Name</label><input id="name" name="name" required><button type="submit">Send</button><button type="submit" formnovalidate>Save draft</button></form>`;
    const form = document.querySelector("form")!;
    const submitter = form.querySelectorAll<HTMLButtonElement>("button")[1];
    attachReview(form);
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true, submitter }));
    expect(document.querySelector(".pf-review-panel")).not.toBeNull();
    expect(document.querySelector(".pf-review-value")?.textContent).toBe("Not provided");
  });

  it("still reports native validation for a normal invalid submitter", () => {
    document.body.innerHTML = `<form><label for="name">Name</label><input id="name" name="name" required><button type="submit">Send</button></form>`;
    const form = document.querySelector("form")!;
    const submitter = form.querySelector<HTMLButtonElement>("button")!;
    const reportValidity = vi.spyOn(form, "reportValidity");
    attachReview(form);
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true, submitter }));
    expect(document.querySelector(".pf-review-panel")).toBeNull();
    expect(reportValidity).toHaveBeenCalledOnce();
  });

  it("supports independent controllers for multiple forms", () => {
    document.body.innerHTML = `<form id="a"><input name="a" value="one"><button>Send A</button></form><form id="b"><input name="b" value="two"><button>Send B</button></form>`;
    const first = attachReview(document.querySelector("#a")!);
    const second = attachReview(document.querySelector("#b")!);
    first.open();
    expect(first.getContext()?.entries[0].value).toBe("one");
    first.close();
    second.open();
    expect(second.getContext()?.entries[0].value).toBe("two");
  });

  it("can reopen the review after closing it", () => {
    document.body.innerHTML = `<form><input name="name" value="Ada"><button type="submit">Send</button></form>`;
    const controller = attachReview(document.querySelector("form")!);
    controller.open();
    controller.close();
    controller.open();
    expect(document.querySelector(".pf-review-panel")).not.toBeNull();
  });

  it("allows application submit handlers only after confirmation", () => {
    document.body.innerHTML = `<form><input name="name" value="Ada"><button type="submit">Send</button></form>`;
    const form = document.querySelector("form")!;
    const submitter = form.querySelector("button")!;
    let applicationSubmits = 0;
    form.addEventListener("submit", () => { applicationSubmits += 1; });
    attachReview(form);
    Object.defineProperty(form, "requestSubmit", {
      configurable: true,
      value: (button?: HTMLElement) => form.dispatchEvent(new SubmitEvent("submit", {
        bubbles: true,
        cancelable: true,
        submitter: button as HTMLButtonElement | null
      }))
    });
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true, submitter }));
    expect(applicationSubmits).toBe(0);
    document.querySelector<HTMLButtonElement>(".pf-review-confirm")!.click();
    expect(applicationSubmits).toBe(1);
  });
});
