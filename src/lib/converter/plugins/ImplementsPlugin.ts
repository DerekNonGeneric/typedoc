import ts from "typescript";
import { ApplicationEvents } from "../../application-events.js";
import {
    type ContainerReflection,
    DeclarationReflection,
    type ProjectReflection,
    type Reflection,
    ReflectionFlag,
    ReflectionKind,
    SignatureReflection,
} from "../../models/index.js";
import { ReferenceType, ReflectionType, type SomeType, type Type } from "../../models/types.js";
import { filterMap, type TranslatedString, zip } from "#utils";
import { ConverterComponent } from "../components.js";
import type { Context } from "../context.js";
import { getHumanName } from "../../utils/index.js";
import { ConverterEvents } from "../converter-events.js";
import type { Converter } from "../converter.js";

/**
 * A plugin that detects interface implementations of functions and
 * properties on classes and links them.
 */
export class ImplementsPlugin extends ConverterComponent {
    private resolved = new WeakSet<Reflection>();
    private postponed = new WeakMap<Reflection, Set<DeclarationReflection>>();
    private revivingSerialized = false;

    constructor(owner: Converter) {
        super(owner);
        this.owner.on(
            ConverterEvents.RESOLVE_END,
            this.onResolveEnd.bind(this),
        );
        this.owner.on(
            ConverterEvents.CREATE_DECLARATION,
            this.onDeclaration.bind(this),
            -1000,
        );
        this.owner.on(
            ConverterEvents.CREATE_SIGNATURE,
            this.onSignature.bind(this),
            1000,
        );
        this.application.on(ApplicationEvents.REVIVE, this.onRevive.bind(this));
    }

    /**
     * Mark all members of the given class to be the implementation of the matching interface member.
     */
    private analyzeImplements(
        project: ProjectReflection,
        classReflection: DeclarationReflection,
        interfaceReflection: DeclarationReflection,
    ) {
        this.handleInheritedComments(classReflection, interfaceReflection);
        if (!interfaceReflection.children) {
            return;
        }

        interfaceReflection.children.forEach((interfaceMember) => {
            const classMember = findMatchingMember(
                interfaceMember,
                classReflection,
            );

            if (!classMember) {
                return;
            }

            const interfaceMemberName = interfaceReflection.name + "." + interfaceMember.name;
            classMember.implementationOf = ReferenceType.createResolvedReference(
                interfaceMemberName,
                interfaceMember,
                project,
            );

            const intSigs = interfaceMember.signatures ||
                interfaceMember.type?.visit({
                    reflection: (r) => r.declaration.signatures,
                });

            const clsSigs = classMember.signatures ||
                classMember.type?.visit({
                    reflection: (r) => r.declaration.signatures,
                });

            if (intSigs && clsSigs) {
                for (const [clsSig, intSig] of zip(clsSigs, intSigs)) {
                    if (clsSig.implementationOf) {
                        const target = intSig.parent.kindOf(
                                ReflectionKind.FunctionOrMethod,
                            )
                            ? intSig
                            : intSig.parent.parent!;
                        clsSig.implementationOf = ReferenceType.createResolvedReference(
                            clsSig.implementationOf.name,
                            target,
                            project,
                        );
                    }
                }
            }

            this.handleInheritedComments(classMember, interfaceMember);
        });
    }

    private analyzeInheritance(
        project: ProjectReflection,
        reflection: DeclarationReflection,
    ) {
        if (!reflection.extendedTypes) return;

        const extendedTypes = filterMap(
            reflection.extendedTypes,
            (type) => {
                return type instanceof ReferenceType &&
                        type.reflection instanceof DeclarationReflection
                    ? (type as ReferenceType & {
                        reflection: DeclarationReflection;
                    })
                    : void 0;
            },
        );

        for (const parent of extendedTypes) {
            this.handleInheritedComments(reflection, parent.reflection);

            for (const parentMember of parent.reflection.children ?? []) {
                const child = findMatchingMember(parentMember, reflection);

                if (child) {
                    const key = child.overwrites
                        ? "overwrites"
                        : "inheritedFrom";

                    for (
                        const [childSig, parentSig] of zip(
                            child.signatures ?? [],
                            parentMember.signatures ?? [],
                        )
                    ) {
                        // If we're already pointing at something because TS said we should reference
                        // it, then don't overwrite the reference.
                        if (!childSig[key]?.reflection) {
                            childSig[key] = ReferenceType.createResolvedReference(
                                `${parent.name}.${parentMember.name}`,
                                parentSig,
                                project,
                            );
                        }
                    }

                    if (!child[key]?.reflection) {
                        child[key] = ReferenceType.createResolvedReference(
                            `${parent.name}.${parentMember.name}`,
                            parentMember,
                            project,
                        );
                    }

                    this.handleInheritedComments(child, parentMember);
                }
            }
        }

        // #2978, this is very unfortunate. If a child's parent links are broken at this point,
        // we replace them with an intentionally broken link so that they won't ever be resolved.
        // This is done because if we don't do it then we run into issues where we have a link which
        // points to some ReflectionSymbolId which might not exist now, but once we've gone through
        // serialization/deserialization, might point to an unexpected location. (See the mixin
        // converter tests, I suspect this might actually be an indication of something else slightly
        // broken there, but don't want to spend more time with this right now.)
        // #2982, even more unfortunately, we only want to keep the link if it is pointing to a reflection
        // which will receive a link during rendering.
        const isValidRef = (ref: ReferenceType) =>
            ref.reflection && !ref.reflection.parent?.kindOf(ReflectionKind.TypeLiteral);

        for (const child of reflection.children || []) {
            if (child.inheritedFrom && !isValidRef(child.inheritedFrom)) {
                child.inheritedFrom = ReferenceType.createBrokenReference(child.inheritedFrom.name, project);
            }
            if (child.overwrites && !isValidRef(child.overwrites)) {
                child.overwrites = ReferenceType.createBrokenReference(child.overwrites.name, project);
            }

            for (const childSig of child.getAllSignatures()) {
                if (childSig.inheritedFrom && !isValidRef(childSig.inheritedFrom)) {
                    childSig.inheritedFrom = ReferenceType.createBrokenReference(childSig.inheritedFrom.name, project);
                }
                if (childSig.overwrites && !isValidRef(childSig.overwrites)) {
                    childSig.overwrites = ReferenceType.createBrokenReference(childSig.overwrites.name, project);
                }
            }
        }
    }

    private onResolveEnd(context: Context) {
        this.resolve(context.project);
    }

    private onRevive(project: ProjectReflection) {
        this.revivingSerialized = true;
        this.resolve(project);
        this.revivingSerialized = false;
    }

    private resolve(project: ProjectReflection) {
        for (const id in project.reflections) {
            const refl = project.reflections[id];
            if (refl instanceof DeclarationReflection) {
                this.tryResolve(project, refl);
            }
        }
    }

    private tryResolve(
        project: ProjectReflection,
        reflection: DeclarationReflection,
    ) {
        const requirements = filterMap(
            [
                ...(reflection.implementedTypes ?? []),
                ...(reflection.extendedTypes ?? []),
            ],
            (type) => {
                return type instanceof ReferenceType ? type.reflection : void 0;
            },
        );

        if (requirements.every((req) => this.resolved.has(req))) {
            this.doResolve(project, reflection);
            this.resolved.add(reflection);

            for (const refl of this.postponed.get(reflection) ?? []) {
                this.tryResolve(project, refl);
            }
            this.postponed.delete(reflection);
        } else {
            for (const req of requirements) {
                const future = this.postponed.get(req) ?? new Set();
                future.add(reflection);
                this.postponed.set(req, future);
            }
        }
    }

    private doResolve(
        project: ProjectReflection,
        reflection: DeclarationReflection,
    ) {
        if (
            reflection.kindOf(ReflectionKind.Class) &&
            reflection.implementedTypes
        ) {
            reflection.implementedTypes.forEach((type: Type) => {
                if (!(type instanceof ReferenceType)) {
                    return;
                }

                if (
                    type.reflection &&
                    type.reflection.kindOf(ReflectionKind.ClassOrInterface)
                ) {
                    this.analyzeImplements(
                        project,
                        reflection,
                        type.reflection as DeclarationReflection,
                    );
                }
            });
        }

        // Remove hidden classes/interfaces which we inherit from
        if (reflection.kindOf(ReflectionKind.ClassOrInterface)) {
            const notHiddenType = (t: SomeType) =>
                !(t instanceof ReferenceType) ||
                !t.symbolId ||
                !project.symbolIdHasBeenRemoved(t.symbolId);
            reflection.implementedTypes = reflection.implementedTypes?.filter(notHiddenType);
            if (!reflection.implementedTypes?.length) delete reflection.implementedTypes;
            reflection.extendedTypes = reflection.extendedTypes?.filter(notHiddenType);
            if (!reflection.extendedTypes?.length) delete reflection.extendedTypes;
        }

        if (
            reflection.kindOf(ReflectionKind.ClassOrInterface) &&
            reflection.extendedTypes
        ) {
            this.analyzeInheritance(project, reflection);
        }
    }

    private getExtensionInfo(
        context: Context,
        reflection: Reflection | undefined,
    ) {
        if (!reflection || !reflection.kindOf(ReflectionKind.Inheritable)) {
            return;
        }

        // Need this because we re-use reflections for type literals.
        if (!reflection.parent?.kindOf(ReflectionKind.ClassOrInterface)) {
            return;
        }

        const symbol = context.getSymbolFromReflection(
            reflection.parent,
        );
        if (!symbol) {
            return;
        }

        const declaration = symbol
            .getDeclarations()
            ?.find(
                (n): n is ts.ClassDeclaration | ts.InterfaceDeclaration =>
                    ts.isClassDeclaration(n) || ts.isInterfaceDeclaration(n),
            );
        if (!declaration) {
            return;
        }

        return { symbol, declaration };
    }

    private onSignature(context: Context, reflection: SignatureReflection) {
        this.onDeclaration(context, reflection.parent);
    }

    /**
     * Responsible for setting the {@link DeclarationReflection.inheritedFrom},
     * {@link DeclarationReflection.overwrites}, and {@link DeclarationReflection.implementationOf}
     * properties on the provided reflection temporarily, these links will be replaced
     * during the resolve step with links which actually point to the right place.
     */
    private onDeclaration(context: Context, reflection: DeclarationReflection) {
        const info = this.getExtensionInfo(context, reflection);
        if (!info) {
            return;
        }

        if (reflection.kind === ReflectionKind.Constructor) {
            const ctor = (
                info.declaration.members as ReadonlyArray<
                    ts.ClassElement | ts.TypeElement
                >
            ).find(ts.isConstructorDeclaration);
            constructorInheritance(context, reflection, info.declaration, ctor);
            return;
        }

        const childType = reflection.flags.isStatic
            ? context.checker.getTypeOfSymbolAtLocation(
                info.symbol,
                info.declaration,
            )
            : context.checker.getDeclaredTypeOfSymbol(info.symbol);

        const property = findProperty(reflection, childType);

        if (!property) {
            // We're probably broken... but I don't think this should be fatal.
            context.logger.warn(
                `Failed to retrieve${reflection.flags.isStatic ? " static" : ""} member "${
                    reflection.escapedName ?? reflection.name
                }" of "${reflection.parent?.name}" for inheritance analysis. Please report a bug.` as TranslatedString,
            );
            return;
        }

        // Need to check both extends and implements clauses.
        out: for (const clause of info.declaration.heritageClauses ?? []) {
            // No point checking implemented types for static members, they won't exist.
            if (
                reflection.flags.isStatic &&
                clause.token === ts.SyntaxKind.ImplementsKeyword
            ) {
                continue;
            }

            for (const expr of clause.types) {
                const parentType = context.checker.getTypeAtLocation(
                    reflection.flags.isStatic ? expr.expression : expr,
                );

                const parentProperty = findProperty(reflection, parentType);
                if (parentProperty) {
                    const isInherit = property
                        .getDeclarations()
                        ?.some((d) => d.parent !== info.declaration) ??
                        true;

                    createLink(
                        context,
                        reflection,
                        clause,
                        expr,
                        parentProperty,
                        isInherit,
                    );

                    // Can't always break because we need to also set `implementationOf` if we
                    // inherit from a base class and also implement an interface.
                    if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
                        break out;
                    }
                }
            }
        }
    }

    /**
     * Responsible for copying comments from "parent" reflections defined
     * in either a base class or implemented interface to the child class.
     */
    private handleInheritedComments(
        child: DeclarationReflection,
        parent: DeclarationReflection,
    ) {
        this.copyComment(child, parent);

        if (
            parent.kindOf(ReflectionKind.Property) &&
            child.kindOf(ReflectionKind.Accessor)
        ) {
            if (child.getSignature) {
                this.copyComment(child.getSignature, parent);
                child.getSignature.implementationOf = child.implementationOf;
            }
            if (child.setSignature) {
                this.copyComment(child.setSignature, parent);
                child.setSignature.implementationOf = child.implementationOf;
            }
        }
        if (
            parent.kindOf(ReflectionKind.Accessor) &&
            child.kindOf(ReflectionKind.Accessor)
        ) {
            if (parent.getSignature && child.getSignature) {
                this.copyComment(child.getSignature, parent.getSignature);
            }
            if (parent.setSignature && child.setSignature) {
                this.copyComment(child.setSignature, parent.setSignature);
            }
        }

        if (
            parent.kindOf(ReflectionKind.FunctionOrMethod) &&
            parent.signatures &&
            child.signatures
        ) {
            for (const [cs, ps] of zip(child.signatures, parent.signatures)) {
                this.copyComment(cs, ps);
            }
        } else if (
            parent.kindOf(ReflectionKind.Property) &&
            parent.type instanceof ReflectionType &&
            parent.type.declaration.signatures &&
            child.signatures
        ) {
            for (
                const [cs, ps] of zip(
                    child.signatures,
                    parent.type.declaration.signatures,
                )
            ) {
                this.copyComment(cs, ps);
            }
        }
    }

    /**
     * Copy the comment of the source reflection to the target reflection with a JSDoc style copy
     * function. The TSDoc copy function is in the InheritDocPlugin.
     */
    private copyComment(target: Reflection, source: Reflection) {
        if (!shouldCopyComment(target, source, this.revivingSerialized)) {
            return;
        }

        target.comment = source.comment!.clone();

        if (
            target instanceof DeclarationReflection &&
            source instanceof DeclarationReflection
        ) {
            for (
                const [tt, ts] of zip(
                    target.typeParameters || [],
                    source.typeParameters || [],
                )
            ) {
                this.copyComment(tt, ts);
            }
        }
        if (
            target instanceof SignatureReflection &&
            source instanceof SignatureReflection
        ) {
            for (
                const [tt, ts] of zip(
                    target.typeParameters || [],
                    source.typeParameters || [],
                )
            ) {
                this.copyComment(tt, ts);
            }
            for (
                const [pt, ps] of zip(
                    target.parameters || [],
                    source.parameters || [],
                )
            ) {
                this.copyComment(pt, ps);
            }
        }
    }
}

function constructorInheritance(
    context: Context,
    reflection: DeclarationReflection,
    childDecl: ts.ClassDeclaration | ts.InterfaceDeclaration,
    constructorDecl: ts.ConstructorDeclaration | undefined,
) {
    const extendsClause = childDecl.heritageClauses?.find(
        (cl) => cl.token === ts.SyntaxKind.ExtendsKeyword,
    );

    if (!extendsClause) return;
    const name = `${extendsClause.types[0].getText()}.constructor`;

    const key = constructorDecl ? "overwrites" : "inheritedFrom";

    reflection[key] ??= ReferenceType.createBrokenReference(
        name,
        context.project,
    );

    for (const sig of reflection.signatures ?? []) {
        sig[key] ??= ReferenceType.createBrokenReference(name, context.project);
    }
}

function findProperty(reflection: DeclarationReflection, parent: ts.Type) {
    return parent.getProperties().find((prop) => {
        return reflection.escapedName
            ? prop.escapedName === reflection.escapedName as ts.__String
            : prop.name === reflection.name;
    });
}

function createLink(
    context: Context,
    reflection: DeclarationReflection,
    clause: ts.HeritageClause,
    expr: ts.ExpressionWithTypeArguments,
    symbol: ts.Symbol,
    isInherit: boolean,
) {
    const name = `${expr.expression.getText()}.${getHumanName(symbol.name)}`;

    // We should always have rootSymbols, but check just in case. We use the first
    // symbol here as TypeDoc's models don't have multiple symbols for the parent
    // reference. This is technically wrong because symbols might be declared in
    // multiple locations (interface declaration merging), but that's an uncommon
    // enough use case that it doesn't seem worthwhile to complicate the rest of the
    // world to deal with it.
    // Note that we also need to check that the root symbol isn't this symbol.
    // This seems to happen sometimes when dealing with interface inheritance.
    const rootSymbols = context.checker.getRootSymbols(symbol);
    const ref = rootSymbols.length && rootSymbols[0] != symbol
        ? context.createSymbolReference(rootSymbols[0], context, name)
        : ReferenceType.createBrokenReference(name, context.project);

    link(reflection);
    link(reflection.getSignature);
    link(reflection.setSignature);
    for (const sig of reflection.indexSignatures || []) {
        link(sig);
    }
    for (const sig of reflection.signatures ?? []) {
        link(sig);
    }

    function link(
        target: DeclarationReflection | SignatureReflection | undefined,
    ) {
        if (!target) return;

        if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
            target.implementationOf ??= ref;
            return;
        }

        if (isInherit) {
            target.setFlag(ReflectionFlag.Inherited);
            target.inheritedFrom ??= ref;
        } else {
            target.overwrites ??= ref;
        }
    }
}

function shouldCopyComment(
    target: Reflection,
    source: Reflection,
    revivingSerialized: boolean,
) {
    if (!source.comment) {
        return false;
    }

    if (target.comment) {
        // If we're reviving, then the revived project might have a better comment
        // on source, so copy it.
        if (revivingSerialized && source.comment.similarTo(target.comment)) {
            return true;
        }

        // We might still want to copy, if the child has a JSDoc style inheritDoc tag.
        const tag = target.comment.getTag("@inheritDoc");
        if (!tag || tag.name) {
            return false;
        }
    }

    return true;
}

function findMatchingMember(
    toMatch: Reflection,
    container: ContainerReflection,
) {
    return container.children?.find(
        (child) =>
            child.name == toMatch.name &&
            child.flags.isStatic === toMatch.flags.isStatic,
    );
}
