import {
    ReflectionKind,
    DeclarationReflection,
    type DeclarationHierarchy,
    ProjectReflection,
    Reflection,
} from "../../models/reflections/index.js";
import { Type, ReferenceType } from "../../models/types.js";
import { Component, ConverterComponent } from "../components.js";
import { Converter } from "../converter.js";
import type { Context } from "../context.js";
import { ApplicationEvents } from "../../application-events.js";

/**
 * Responsible for adding `implementedBy` / `implementedFrom`
 */
@Component({ name: "type" })
export class TypePlugin extends ConverterComponent {
    reflections = new Set<DeclarationReflection>();

    /**
     * Create a new TypeHandler instance.
     */
    override initialize() {
        this.listenTo(this.owner, {
            [Converter.EVENT_RESOLVE]: this.onResolve,
            [Converter.EVENT_RESOLVE_END]: this.onResolveEnd,
            [Converter.EVENT_END]: () => this.reflections.clear(),
        });
        this.listenTo(this.application, {
            [ApplicationEvents.REVIVE]: this.onRevive,
        });
    }

    private onRevive(project: ProjectReflection) {
        for (const id in project.reflections) {
            this.resolve(
                project,
                project.reflections[id],
                /* create links */ false,
            );
        }
        this.finishResolve(project);
        this.reflections.clear();
    }

    private onResolve(context: Context, reflection: DeclarationReflection) {
        this.resolve(context.project, reflection);
    }

    private resolve(
        project: ProjectReflection,
        reflection: Reflection,
        createLinks = true,
    ) {
        if (!(reflection instanceof DeclarationReflection)) return;

        if (reflection.kindOf(ReflectionKind.ClassOrInterface)) {
            this.postpone(reflection);

            walk(reflection.implementedTypes, (target) => {
                this.postpone(target);
                target.implementedBy ||= [];
                if (createLinks) {
                    target.implementedBy.push(
                        ReferenceType.createResolvedReference(
                            reflection.name,
                            reflection,
                            project,
                        ),
                    );
                }
            });

            walk(reflection.extendedTypes, (target) => {
                this.postpone(target);
                target.extendedBy ||= [];

                if (createLinks) {
                    target.extendedBy.push(
                        ReferenceType.createResolvedReference(
                            reflection.name,
                            reflection,
                            project,
                        ),
                    );
                }
            });
        }

        function walk(
            types: Type[] | undefined,
            callback: { (declaration: DeclarationReflection): void },
        ) {
            if (!types) {
                return;
            }
            types.forEach((type) => {
                if (!(type instanceof ReferenceType)) {
                    return;
                }
                if (
                    !type.reflection ||
                    !(type.reflection instanceof DeclarationReflection)
                ) {
                    return;
                }
                callback(type.reflection);
            });
        }
    }

    private postpone(reflection: DeclarationReflection) {
        this.reflections.add(reflection);
    }

    private onResolveEnd(context: Context) {
        this.finishResolve(context.project);
    }

    private finishResolve(project: ProjectReflection) {
        this.reflections.forEach((reflection) => {
            if (reflection.implementedBy) {
                reflection.implementedBy.sort((a, b) => {
                    if (a.name === b.name) {
                        return 0;
                    }
                    return a.name > b.name ? 1 : -1;
                });
            }

            let root!: DeclarationHierarchy;
            let hierarchy!: DeclarationHierarchy;
            function push(types: Type[]) {
                const level: DeclarationHierarchy = { types: types };
                if (hierarchy) {
                    hierarchy.next = level;
                    hierarchy = level;
                } else {
                    root = hierarchy = level;
                }
            }

            if (reflection.extendedTypes) {
                push(reflection.extendedTypes);
            }

            push([
                ReferenceType.createResolvedReference(
                    reflection.name,
                    reflection,
                    project,
                ),
            ]);
            hierarchy.isTarget = true;

            if (reflection.extendedBy) {
                push(reflection.extendedBy);
            }

            // No point setting up a hierarchy if there is no hierarchy to display
            if (root.next) {
                reflection.typeHierarchy = root;
            }
        });
    }
}
