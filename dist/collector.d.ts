import type { ReviewEntry, ReviewOptions } from "./types";
export declare function collectEntries(form: HTMLFormElement, options?: ReviewOptions): ReviewEntry[];
export declare function createContext(form: HTMLFormElement, submitter: HTMLElement | null, options: ReviewOptions): {
    form: HTMLFormElement;
    submitter: HTMLElement | null;
    entries: ReviewEntry[];
    formData: FormData;
};
