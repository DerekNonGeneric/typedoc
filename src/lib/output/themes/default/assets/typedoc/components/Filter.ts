import { Component, IComponentOptions } from "../Component.js";
import { storage } from "../utils/storage.js";

const style = document.head.appendChild(document.createElement("style"));
style.dataset.for = "filters";

/**
 * Handles sidebar filtering functionality.
 */
export class Filter extends Component<HTMLInputElement> {
    /**
     * The class name & ID by which to store the filter value.
     */
    private readonly key: string;

    /**
     * Current filter value, to keep in sync with checkbox state.
     */
    private value: boolean;

    constructor(options: IComponentOptions) {
        super(options);
        this.key = `filter-${this.el.name}`;
        this.value = this.el.checked;
        this.el.addEventListener("change", () => {
            this.setLocalStorage(this.el.checked);
        });
        this.setLocalStorage(this.fromLocalStorage());

        style.innerHTML += `html:not(.${this.key}) .tsd-is-${this.el.name} { display: none; }\n`;
        this.app.updateIndexVisibility();
    }

    /**
     * Retrieve value from storage.
     */
    private fromLocalStorage(): boolean {
        const fromStorage = storage.getItem(this.key);
        return fromStorage ? fromStorage === "true" : this.el.checked;
    }

    /**
     * Set value to local storage.
     *
     * @param value  Value to set.
     */
    private setLocalStorage(value: boolean): void {
        storage.setItem(this.key, value.toString());
        this.value = value;
        this.handleValueChange();
    }

    /**
     * Synchronize DOM based on value change.
     */
    private handleValueChange(): void {
        this.el.checked = this.value;
        document.documentElement.classList.toggle(this.key, this.value);

        this.app.filterChanged();
        this.app.updateIndexVisibility();
    }
}
