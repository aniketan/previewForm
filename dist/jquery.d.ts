declare global {
    interface Window {
        jQuery?: JQueryStatic;
    }
    interface JQuery {
        previewForm(optionsOrMethod?: Record<string, unknown> | string): this;
    }
}
export declare function installJQueryAdapter($?: JQueryStatic): void;
export default installJQueryAdapter;
