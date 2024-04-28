import type { JSX } from "../../utils/index.js";
import type { PageEvent } from "../events.js";

export class UrlMapping<Model = any> {
    url: string;

    model: Model;

    template: RenderTemplate<PageEvent<Model>>;

    constructor(
        url: string,
        model: Model,
        template: RenderTemplate<PageEvent<Model>>,
    ) {
        this.url = url;
        this.model = model;
        this.template = template;
    }
}

export type RenderTemplate<T> = (data: T) => JSX.Element | string;
