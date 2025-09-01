import {
    Comment,
    type CommentDisplayPart,
    type DeclarationReflection,
    Reflection,
    ReflectionKind,
    type SignatureReflection,
} from "../../../../models/index.js";
import type { ReferenceType, SomeType, TypeVisitor } from "../../../../models/types.js";
import { assert, i18n, JSX, type TagString } from "#utils";
import { classNames, getKindClass } from "../../lib.js";
import type { DefaultThemeRenderContext } from "../DefaultThemeRenderContext.js";
import { anchorTargetIfPresent } from "./anchor-icon.js";

function renderingTypeDetailsIsUseful(
    container: Reflection,
    type: SomeType,
    notRenderedTags: readonly TagString[],
): boolean {
    const isUsefulVisitor: Partial<TypeVisitor<boolean>> = {
        array(type) {
            return renderingTypeDetailsIsUseful(container, type.elementType, notRenderedTags);
        },
        intersection(type) {
            return type.types.some(t => renderingTypeDetailsIsUseful(container, t, notRenderedTags));
        },
        union(type) {
            return !!type.elementSummaries ||
                type.types.some(t => renderingTypeDetailsIsUseful(container, t, notRenderedTags));
        },
        reflection(type) {
            return renderingChildIsUseful(type.declaration, notRenderedTags);
        },
        reference(type) {
            return shouldExpandReference(container, type);
        },
    };

    return type.visit(isUsefulVisitor) ?? false;
}

export function typeDeclaration(
    context: DefaultThemeRenderContext,
    reflectionOwningType: Reflection,
    type: SomeType,
): JSX.Children {
    assert(
        reflectionOwningType instanceof Reflection,
        "typeDeclaration(reflectionOwningType, type) called incorrectly",
    );

    if (renderingTypeDetailsIsUseful(reflectionOwningType, type, context.options.getValue("notRenderedTags"))) {
        return (
            <div class="tsd-type-declaration">
                <h4>{i18n.theme_type_declaration()}</h4>
                {context.typeDetails(reflectionOwningType, type, true)}
            </div>
        );
    }
    return null;
}

type ExpandTypeInfo = { expandType: Set<string>; preventExpand: Set<string> };
const expandTypeCache = new WeakMap<Reflection, ExpandTypeInfo>();

function getExpandTypeInfo(refl: Reflection): ExpandTypeInfo {
    const cache = expandTypeCache.get(refl);
    if (cache) return cache;

    const expandType = new Set<string>();
    const preventExpand = new Set<string>();
    if (!refl.isProject()) {
        const info = getExpandTypeInfo(refl.parent!);
        for (const item of info.expandType) {
            expandType.add(item);
        }
        for (const item of info.preventExpand) {
            preventExpand.add(item);
        }
    }

    for (const tag of refl.comment?.blockTags || []) {
        if (tag.tag === "@expandType") {
            const name = Comment.combineDisplayParts(tag.content);
            expandType.add(name);
            preventExpand.delete(name);
        } else if (tag.tag === "@preventExpand") {
            const name = Comment.combineDisplayParts(tag.content);
            preventExpand.add(name);
            expandType.delete(name);
        }
    }

    expandTypeCache.set(refl, { expandType, preventExpand });
    return { expandType, preventExpand };
}

const expanded = new Set<Reflection>();
function shouldExpandReference(container: Reflection, reference: ReferenceType) {
    const target = reference.reflection;
    if (!target) {
        // If it doesn't exist, expand only if there are specific properties
        // which the user annotated. Assume they know what they're doing.
        return reference.highlightedProperties !== undefined;
    }

    // Prevent expansion of non-types
    if (!target.kindOf(ReflectionKind.TypeAlias | ReflectionKind.Interface)) return false;

    // Prevent recursive expand
    if (expanded.has(target)) return false;

    const info = getExpandTypeInfo(container);

    // Expand if the user explicitly requested it with @param or @expand
    if (reference.highlightedProperties || target.comment?.hasModifier("@expand") || info.expandType.has(target.name)) {
        return !info.preventExpand.has(target.name);
    }

    return false;
}

export function typeDetails(
    context: DefaultThemeRenderContext,
    reflectionOwningType: Reflection,
    type: SomeType,
    renderAnchors: boolean,
): JSX.Children {
    return typeDetailsImpl(context, reflectionOwningType, type, renderAnchors);
}

export function typeDetailsImpl(
    context: DefaultThemeRenderContext,
    reflectionOwningType: Reflection,
    type: SomeType,
    renderAnchors: boolean,
    highlighted?: Map<string, CommentDisplayPart[]>,
): JSX.Children {
    const result = type.visit<JSX.Children>({
        array(type) {
            return context.typeDetails(reflectionOwningType, type.elementType, renderAnchors);
        },
        intersection(type) {
            return type.types.map((t) => context.typeDetails(reflectionOwningType, t, renderAnchors));
        },
        union(type) {
            const result: JSX.Children = [];
            for (let i = 0; i < type.types.length; ++i) {
                result.push(
                    <li>
                        {context.type(type.types[i])}
                        {context.displayParts(type.elementSummaries?.[i])}
                        {context.typeDetailsIfUseful(reflectionOwningType, type.types[i])}
                    </li>,
                );
            }
            return <ul>{result}</ul>;
        },
        reflection(type) {
            const declaration = type.declaration;
            if (highlighted) {
                return highlightedDeclarationDetails(context, declaration, renderAnchors, highlighted);
            }
            return declarationDetails(context, declaration, renderAnchors);
        },
        reference(reference) {
            if (shouldExpandReference(reflectionOwningType, reference)) {
                const target = reference.reflection;
                if (!target?.isDeclaration()) {
                    return highlightedPropertyDetails(context, reference.highlightedProperties);
                }

                // Ensure we don't go into an infinite loop here
                expanded.add(target);
                const details = target.type
                    ? context.typeDetails(reflectionOwningType, target.type, renderAnchors)
                    : declarationDetails(context, target, renderAnchors);
                expanded.delete(target);
                return details;
            }
        },
        // tuple??
    });

    if (!result && highlighted) {
        return highlightedPropertyDetails(context, highlighted);
    }

    return result;
}

export function typeDetailsIfUseful(
    context: DefaultThemeRenderContext,
    reflectionOwningType: Reflection,
    type: SomeType | undefined,
): JSX.Children {
    assert(
        reflectionOwningType instanceof Reflection,
        "typeDetailsIfUseful(reflectionOwningType, type) called incorrectly",
    );

    if (type && renderingTypeDetailsIsUseful(reflectionOwningType, type, context.options.getValue("notRenderedTags"))) {
        return context.typeDetails(reflectionOwningType, type, false);
    }
}

function highlightedPropertyDetails(
    context: DefaultThemeRenderContext,
    highlighted?: Map<string, CommentDisplayPart[]>,
) {
    if (!highlighted?.size) return;

    return (
        <ul class="tsd-parameters">
            {Array.from(highlighted.entries(), ([name, parts]) => {
                return (
                    <li class="tsd-parameter">
                        <h5>
                            <span>{name}</span>
                        </h5>
                        {context.displayParts(parts)}
                    </li>
                );
            })}
        </ul>
    );
}

function highlightedDeclarationDetails(
    context: DefaultThemeRenderContext,
    declaration: DeclarationReflection,
    renderAnchors: boolean,
    highlightedProperties?: Map<string, CommentDisplayPart[]>,
) {
    return (
        <ul class="tsd-parameters">
            {declaration
                .getProperties()
                ?.map(
                    (child) =>
                        highlightedProperties?.has(child.name) &&
                        renderChild(context, child, renderAnchors, highlightedProperties.get(child.name)),
                )}
        </ul>
    );
}

function declarationDetails(
    context: DefaultThemeRenderContext,
    declaration: DeclarationReflection,
    renderAnchors: boolean,
): JSX.Children {
    return (
        <>
            {context.commentSummary(declaration)}
            <ul class="tsd-parameters">
                {declaration.signatures && (
                    <li class="tsd-parameter-signature">
                        <ul class={classNames({ "tsd-signatures": true }, context.getReflectionClasses(declaration))}>
                            {declaration.signatures.map((item) => {
                                const anchor = context.router.hasUrl(item) ? context.getAnchor(item) : undefined;

                                return (
                                    <>
                                        <li class="tsd-signature" id={anchor}>
                                            {context.memberSignatureTitle(item, {
                                                hideName: true,
                                            })}
                                        </li>
                                        <li class="tsd-description">
                                            {context.memberSignatureBody(item, {
                                                hideSources: true,
                                            })}
                                        </li>
                                    </>
                                );
                            })}
                        </ul>
                    </li>
                )}
                {declaration.indexSignatures?.map((index) => renderIndexSignature(context, index))}
                {declaration.getProperties()?.map((child) => renderChild(context, child, renderAnchors))}
            </ul>
        </>
    );
}

function renderChild(
    context: DefaultThemeRenderContext,
    child: DeclarationReflection,
    renderAnchors: boolean,
    highlight?: CommentDisplayPart[],
) {
    if (child.signatures) {
        return (
            <li class="tsd-parameter">
                <h5 id={anchorTargetIfPresent(context, child)}>
                    {!!child.flags.isRest && <span class="tsd-signature-symbol">...</span>}
                    <span class={getKindClass(child)}>{child.name}</span>
                    <span class="tsd-signature-symbol">{!!child.flags.isOptional && "?"}:</span> function
                </h5>

                {context.memberSignatures(child)}
            </li>
        );
    }

    function highlightOrComment(refl: Reflection) {
        if (highlight) {
            return context.displayParts(highlight);
        }
        return (
            <>
                {context.commentSummary(refl)}
                {context.commentTags(refl)}
            </>
        );
    }

    // standard type
    if (child.type) {
        const notRenderedTags = context.options.getValue("notRenderedTags");

        return (
            <li class="tsd-parameter">
                <h5 id={anchorTargetIfPresent(context, child)}>
                    {context.reflectionFlags(child)}
                    {!!child.flags.isRest && <span class="tsd-signature-symbol">...</span>}
                    <span class={getKindClass(child)}>{child.name}</span>
                    <span class="tsd-signature-symbol">
                        {!!child.flags.isOptional && "?"}
                        {": "}
                    </span>
                    {context.type(child.type)}
                </h5>
                {highlightOrComment(child)}
                {child.getProperties().some(prop => renderingChildIsUseful(prop, notRenderedTags)) && (
                    <ul class="tsd-parameters">
                        {child.getProperties().map((c) => renderChild(context, c, renderAnchors))}
                    </ul>
                )}
            </li>
        );
    }

    // getter/setter
    return (
        <>
            {child.getSignature && (
                <li class="tsd-parameter">
                    <h5 id={anchorTargetIfPresent(context, child)}>
                        {context.reflectionFlags(child.getSignature)}
                        <span class="tsd-signature-keyword">get</span>{" "}
                        <span class={getKindClass(child)}>{child.name}</span>
                        <span class="tsd-signature-symbol">():</span> {context.type(child.getSignature.type)}
                    </h5>

                    {highlightOrComment(child.getSignature)}
                </li>
            )}
            {child.setSignature && (
                <li class="tsd-parameter">
                    <h5 id={!child.getSignature ? anchorTargetIfPresent(context, child) : undefined}>
                        {context.reflectionFlags(child.setSignature)}
                        <span class="tsd-signature-keyword">set</span>{" "}
                        <span class={getKindClass(child)}>{child.name}</span>
                        <span class="tsd-signature-symbol">(</span>
                        {child.setSignature.parameters?.map((item) => (
                            <>
                                {item.name}
                                <span class="tsd-signature-symbol">:</span> {context.type(item.type)}
                            </>
                        ))}
                        <span class="tsd-signature-symbol">):</span> {context.type(child.setSignature.type)}
                    </h5>

                    {highlightOrComment(child.setSignature)}
                </li>
            )}
        </>
    );
}

function renderIndexSignature(context: DefaultThemeRenderContext, index: SignatureReflection) {
    return (
        <li class="tsd-parameter-index-signature">
            <h5>
                {index.flags.isReadonly && (
                    <>
                        <span class="tsd-signature-keyword">readonly</span>
                        {" "}
                    </>
                )}
                <span class="tsd-signature-symbol">[</span>
                {index.parameters!.map((item) => (
                    <>
                        <span class={getKindClass(item)}>{item.name}</span>
                        {": "}
                        {context.type(item.type)}
                    </>
                ))}
                <span class="tsd-signature-symbol">]:</span> {context.type(index.type)}
            </h5>
            {context.commentSummary(index)}
            {context.commentTags(index)}
            {context.typeDeclaration(index, index.type!)}
        </li>
    );
}

function renderingChildIsUseful(refl: DeclarationReflection, notRenderedTags: readonly TagString[]) {
    // Object types directly under a variable/type alias will always be considered useful.
    // This probably isn't ideal, but it is an easy thing to check when assigning URLs
    // in the default theme, so we'll make the assumption that those properties ought to always
    // be rendered.
    // This should be kept in sync with the DefaultTheme.applyAnchorUrl function.
    if (
        refl.kindOf(ReflectionKind.TypeLiteral) &&
        refl.parent?.kindOf(ReflectionKind.SomeExport) &&
        (refl.parent as DeclarationReflection).type?.type === "reflection"
    ) {
        return true;
    }

    if (renderingThisChildIsUseful(refl, notRenderedTags)) {
        return true;
    }

    return refl.getProperties().some(prop => renderingThisChildIsUseful(prop, notRenderedTags));
}

function renderingThisChildIsUseful(refl: DeclarationReflection, notRenderedTags: readonly TagString[]) {
    if (refl.hasComment(notRenderedTags)) return true;

    const declaration = refl.type?.type === "reflection" ? refl.type.declaration : refl;
    if (declaration.hasComment(notRenderedTags)) return true;

    return declaration.getAllSignatures().some((sig) => {
        return sig.hasComment(notRenderedTags) || sig.parameters?.some((p) => p.hasComment(notRenderedTags));
    });
}
