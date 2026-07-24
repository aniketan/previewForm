import { collectEntries } from "./collector";
import type { ReviewController, ReviewOptions } from "./types";
export * from "./types";
export { collectEntries };
export declare function attachReview(form: HTMLFormElement, providedOptions?: ReviewOptions): ReviewController;
export default attachReview;
