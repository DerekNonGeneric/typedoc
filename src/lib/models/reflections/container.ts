import {
    Reflection,
    type TraverseCallback,
    TraverseProperty,
} from "./abstract.js";
import { ReflectionCategory } from "../ReflectionCategory.js";
import { ReflectionGroup } from "../ReflectionGroup.js";
import type { ReflectionKind } from "./kind.js";
import type {
    Serializer,
    JSONOutput,
    Deserializer,
} from "../../serialization/index.js";
import type { DeclarationReflection } from "./declaration.js";

/**
 * @category Reflections
 */
export abstract class ContainerReflection extends Reflection {
    /**
     * The children of this reflection.
     */
    children?: DeclarationReflection[];

    /**
     * All children grouped by their kind.
     */
    groups?: ReflectionGroup[];

    /**
     * All children grouped by their category.
     */
    categories?: ReflectionCategory[];

    /**
     * Return a list of all children of a certain kind.
     *
     * @param kind  The desired kind of children.
     * @returns     An array containing all children with the desired kind.
     */
    getChildrenByKind(kind: ReflectionKind): DeclarationReflection[] {
        return (this.children || []).filter((child) => child.kindOf(kind));
    }

    override traverse(callback: TraverseCallback) {
        for (const child of this.children?.slice() || []) {
            if (callback(child, TraverseProperty.Children) === false) {
                return;
            }
        }
    }

    override toObject(serializer: Serializer): JSONOutput.ContainerReflection {
        return {
            ...super.toObject(serializer),
            children: serializer.toObjectsOptional(this.children),
            groups: serializer.toObjectsOptional(this.groups),
            categories: serializer.toObjectsOptional(this.categories),
        };
    }

    override fromObject(de: Deserializer, obj: JSONOutput.ContainerReflection) {
        super.fromObject(de, obj);
        this.children = de.reviveMany(obj.children, (child) =>
            de.constructReflection(child),
        );
        this.groups = de.reviveMany(
            obj.groups,
            (group) => new ReflectionGroup(group.title, this),
        );
        this.categories = de.reviveMany(
            obj.categories,
            (cat) => new ReflectionCategory(cat.title),
        );
    }
}
