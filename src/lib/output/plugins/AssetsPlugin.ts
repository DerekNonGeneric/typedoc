import { Component, RendererComponent } from "../components.js";
import { RendererEvent } from "../events.js";
import { copySync, writeFileSync } from "../../utils/fs.js";
import { DefaultTheme } from "../themes/default/DefaultTheme.js";
import { getStyles } from "../../utils/highlighter.js";
import { Option } from "../../utils/index.js";
import { existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

/**
 * A plugin that copies the subdirectory ´assets´ from the current themes
 * source folder to the output directory.
 */
@Component({ name: "assets" })
export class AssetsPlugin extends RendererComponent {
    /** @internal */
    @Option("customCss")
    accessor customCss!: string;

    /**
     * Create a new AssetsPlugin instance.
     */
    override initialize() {
        this.listenTo(this.owner, {
            [RendererEvent.END]: this.onRenderEnd,
            [RendererEvent.BEGIN]: (event: RendererEvent) => {
                const dest = join(event.outputDirectory, "assets");

                if (this.customCss) {
                    if (existsSync(this.customCss)) {
                        copySync(this.customCss, join(dest, "custom.css"));
                    } else {
                        this.application.logger.error(
                            this.application.i18n.custom_css_file_0_does_not_exist(
                                this.customCss,
                            ),
                        );
                        event.preventDefault();
                    }
                }
            },
        });
    }

    /**
     * Triggered before the renderer starts rendering a project.
     *
     * @param event  An event object describing the current render operation.
     */
    private onRenderEnd(event: RendererEvent) {
        if (this.owner.theme instanceof DefaultTheme) {
            const src = join(
                fileURLToPath(import.meta.url),
                "../../../../../static",
            );
            const dest = join(event.outputDirectory, "assets");
            copySync(src, dest);

            writeFileSync(join(dest, "highlight.css"), getStyles());
        }
    }
}
