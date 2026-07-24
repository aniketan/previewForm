import { beforeEach, describe, expect, it } from "vitest";
import $ from "jquery";
import installJQueryAdapter from "../src/jquery";

beforeEach(() => {
  document.body.innerHTML = "<form id='form'><input name='name' value='Ada'><button type='submit'>Send</button></form>";
  installJQueryAdapter($);
});

describe("jQuery compatibility adapter", () => {
  it("initializes controllers and exposes lifecycle methods", () => {
    const form = $("#form").previewForm({ title: "Legacy title", yes: "Confirm", no: "Back" });
    expect(form.length).toBe(1);
    $("#form").previewForm("open");
    expect(document.querySelector(".pf-review-title")?.textContent).toBe("Legacy title");
    $("#form").previewForm("refresh");
    $("#form").previewForm("destroy");
    expect(document.querySelector(".pf-review-panel")).toBeNull();
  });

  it("keeps non-password sensitive fields masked for the legacy show_password option", () => {
    document.body.innerHTML = `<form id='form'><input name='password' type='password' value='secret'><input name='api_token' value='token-value'><button type='submit'>Send</button></form>`;
    $("#form").previewForm({ show_password: true });
    $("#form").previewForm("open");
    const values = Array.from(document.querySelectorAll<HTMLElement>(".pf-review-value")).map((node) => node.textContent);
    expect(values).toContain("secret");
    expect(values).toContain("••••••");
    expect(values).not.toContain("token-value");
  });
});
