export type ReviewMode = "dialog" | "page";
export type SensitivePolicy = "mask" | "omit" | "reveal";
export type FilePolicy = "omit" | "metadata" | "filename";
export interface FileSummary {
    name: string;
    type: string;
    size: number;
}
export interface ReviewEntry {
    control: HTMLElement;
    name: string;
    label: string;
    value: string;
    rawValue: string;
    section?: string;
    sensitive: boolean;
    files?: FileSummary[];
}
export interface ReviewContext {
    form: HTMLFormElement;
    submitter: HTMLElement | null;
    entries: ReviewEntry[];
    formData: FormData;
}
export type LabelResolver = (control: HTMLElement) => string | undefined;
export type ValueFormatter = (control: HTMLElement, value: string, entry: ReviewEntry) => string;
export interface ReviewOptions {
    mode?: ReviewMode;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    editLabel?: string;
    editable?: boolean;
    includeEmpty?: boolean;
    sections?: boolean;
    sensitiveFields?: SensitivePolicy;
    files?: FilePolicy;
    labelResolver?: LabelResolver;
    valueFormatter?: ValueFormatter;
    onOpen?: (context: ReviewContext) => void;
    onCancel?: (context: ReviewContext) => void;
    onConfirm?: (context: ReviewContext) => void | boolean;
}
export interface ReviewController {
    open(): void;
    close(): void;
    refresh(): void;
    destroy(): void;
    getContext(): ReviewContext | null;
}
