import { type EnumKeys, i18n } from "#utils";

/**
 * Defines the available reflection kinds.
 * @category Reflections
 */
export enum ReflectionKind {
    Project = 0x1,
    Module = 0x2,
    Namespace = 0x4,
    Enum = 0x8,
    EnumMember = 0x10,
    Variable = 0x20,
    Function = 0x40,
    Class = 0x80,
    Interface = 0x100,
    Constructor = 0x200,
    Property = 0x400,
    Method = 0x800,
    CallSignature = 0x1000,
    IndexSignature = 0x2000,
    ConstructorSignature = 0x4000,
    Parameter = 0x8000,
    TypeLiteral = 0x10000,
    TypeParameter = 0x20000,
    Accessor = 0x40000,
    GetSignature = 0x80000,
    SetSignature = 0x100000,
    TypeAlias = 0x200000,
    Reference = 0x400000,
    /**
     * Generic non-ts content to be included in the generated docs as its own page.
     */
    Document = 0x800000,
}

/** @category Reflections */
export namespace ReflectionKind {
    export type KindString = EnumKeys<typeof ReflectionKind>;

    /** @internal */
    export const All = ReflectionKind.Reference * 2 - 1;

    /** @internal */
    export const ClassOrInterface = ReflectionKind.Class | ReflectionKind.Interface;
    /** @internal */
    export const VariableOrProperty = ReflectionKind.Variable | ReflectionKind.Property;
    /** @internal */
    export const FunctionOrMethod = ReflectionKind.Function | ReflectionKind.Method;
    /** @internal */
    export const ClassMember = ReflectionKind.Accessor |
        ReflectionKind.Constructor |
        ReflectionKind.Method |
        ReflectionKind.Property;
    /** @internal */
    export const SomeSignature = ReflectionKind.CallSignature |
        ReflectionKind.IndexSignature |
        ReflectionKind.ConstructorSignature |
        ReflectionKind.GetSignature |
        ReflectionKind.SetSignature;
    /** @internal */
    export const SomeModule = ReflectionKind.Namespace | ReflectionKind.Module;
    /** @internal */
    export const SomeType = ReflectionKind.Interface |
        ReflectionKind.TypeLiteral |
        ReflectionKind.TypeParameter |
        ReflectionKind.TypeAlias;
    /** @internal */
    export const SomeValue = ReflectionKind.Variable | ReflectionKind.Function;
    /** @internal */
    export const SomeMember = ReflectionKind.EnumMember |
        ReflectionKind.Property |
        ReflectionKind.Method |
        ReflectionKind.Accessor;
    /** @internal */
    export const SomeExport = ReflectionKind.Module |
        ReflectionKind.Namespace |
        ReflectionKind.Enum |
        ReflectionKind.Variable |
        ReflectionKind.Function |
        ReflectionKind.Class |
        ReflectionKind.Interface |
        ReflectionKind.TypeAlias |
        ReflectionKind.Reference;
    /** @internal */
    export const MayContainDocuments = SomeExport | ReflectionKind.Project | ReflectionKind.Document;
    /** @internal */
    export const ExportContainer = ReflectionKind.SomeModule | ReflectionKind.Project;

    /** @internal */
    export const Inheritable = ReflectionKind.Accessor |
        ReflectionKind.IndexSignature |
        ReflectionKind.Property |
        ReflectionKind.Method |
        ReflectionKind.Constructor;

    /** @internal */
    export const ContainsCallSignatures = ReflectionKind.Constructor |
        ReflectionKind.Function |
        ReflectionKind.Method;

    // The differences between Type/Value here only really matter for
    // possibly merged declarations where we have multiple reflections.
    /** @internal */
    export const TypeReferenceTarget = ReflectionKind.Interface |
        ReflectionKind.TypeAlias |
        ReflectionKind.Class |
        ReflectionKind.Enum;
    /** @internal */
    export const ValueReferenceTarget = ReflectionKind.Module |
        ReflectionKind.Namespace |
        ReflectionKind.Variable |
        ReflectionKind.Function;

    /**
     * Note: This does not include Class/Interface, even though they technically could contain index signatures
     * @internal
     */
    export const SignatureContainer = ContainsCallSignatures | ReflectionKind.Accessor;

    /** @internal */
    export const VariableContainer = SomeModule | ReflectionKind.Project;

    /** @internal */
    export const MethodContainer = ClassOrInterface |
        VariableOrProperty |
        FunctionOrMethod |
        ReflectionKind.TypeLiteral;

    export function singularString(kind: ReflectionKind) {
        switch (kind) {
            case ReflectionKind.Project:
                return i18n.kind_project();
            case ReflectionKind.Module:
                return i18n.kind_module();
            case ReflectionKind.Namespace:
                return i18n.kind_namespace();
            case ReflectionKind.Enum:
                return i18n.kind_enum();
            case ReflectionKind.EnumMember:
                return i18n.kind_enum_member();
            case ReflectionKind.Variable:
                return i18n.kind_variable();
            case ReflectionKind.Function:
                return i18n.kind_function();
            case ReflectionKind.Class:
                return i18n.kind_class();
            case ReflectionKind.Interface:
                return i18n.kind_interface();
            case ReflectionKind.Constructor:
                return i18n.kind_constructor();
            case ReflectionKind.Property:
                return i18n.kind_property();
            case ReflectionKind.Method:
                return i18n.kind_method();
            case ReflectionKind.CallSignature:
                return i18n.kind_call_signature();
            case ReflectionKind.IndexSignature:
                return i18n.kind_index_signature();
            case ReflectionKind.ConstructorSignature:
                return i18n.kind_constructor_signature();
            case ReflectionKind.Parameter:
                return i18n.kind_parameter();
            case ReflectionKind.TypeLiteral:
                return i18n.kind_type_literal();
            case ReflectionKind.TypeParameter:
                return i18n.kind_type_parameter();
            case ReflectionKind.Accessor:
                return i18n.kind_accessor();
            case ReflectionKind.GetSignature:
                return i18n.kind_get_signature();
            case ReflectionKind.SetSignature:
                return i18n.kind_set_signature();
            case ReflectionKind.TypeAlias:
                return i18n.kind_type_alias();
            case ReflectionKind.Reference:
                return i18n.kind_reference();
            case ReflectionKind.Document:
                return i18n.kind_document();
        }
    }

    export function pluralString(kind: ReflectionKind): string {
        switch (kind) {
            case ReflectionKind.Project:
                return i18n.kind_plural_project();
            case ReflectionKind.Module:
                return i18n.kind_plural_module();
            case ReflectionKind.Namespace:
                return i18n.kind_plural_namespace();
            case ReflectionKind.Enum:
                return i18n.kind_plural_enum();
            case ReflectionKind.EnumMember:
                return i18n.kind_plural_enum_member();
            case ReflectionKind.Variable:
                return i18n.kind_plural_variable();
            case ReflectionKind.Function:
                return i18n.kind_plural_function();
            case ReflectionKind.Class:
                return i18n.kind_plural_class();
            case ReflectionKind.Interface:
                return i18n.kind_plural_interface();
            case ReflectionKind.Constructor:
                return i18n.kind_plural_constructor();
            case ReflectionKind.Property:
                return i18n.kind_plural_property();
            case ReflectionKind.Method:
                return i18n.kind_plural_method();
            case ReflectionKind.CallSignature:
                return i18n.kind_plural_call_signature();
            case ReflectionKind.IndexSignature:
                return i18n.kind_plural_index_signature();
            case ReflectionKind.ConstructorSignature:
                return i18n.kind_plural_constructor_signature();
            case ReflectionKind.Parameter:
                return i18n.kind_plural_parameter();
            case ReflectionKind.TypeLiteral:
                return i18n.kind_plural_type_literal();
            case ReflectionKind.TypeParameter:
                return i18n.kind_plural_type_parameter();
            case ReflectionKind.Accessor:
                return i18n.kind_plural_accessor();
            case ReflectionKind.GetSignature:
                return i18n.kind_plural_get_signature();
            case ReflectionKind.SetSignature:
                return i18n.kind_plural_set_signature();
            case ReflectionKind.TypeAlias:
                return i18n.kind_plural_type_alias();
            case ReflectionKind.Reference:
                return i18n.kind_plural_reference();
            case ReflectionKind.Document:
                return i18n.kind_plural_document();
        }
    }

    export function classString(kind: ReflectionKind): string {
        return `tsd-kind-${
            ReflectionKind[kind]
                .replace(/(.)([A-Z])/g, (_m, a, b) => `${a}-${b}`)
                .toLowerCase()
        }`;
    }
}
