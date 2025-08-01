import type { BundledTheme as ShikiTheme } from "@gerrit0/mini-shiki";
import type { SortStrategy } from "../sort.js";
import { isAbsolute, join, resolve } from "path";
import type { EntryPointStrategy } from "../entry-point.js";
import type { ReflectionKind } from "../../models/kind.js";
import {
    type GlobString,
    i18n,
    type LogLevel,
    type NeverIfInternal,
    type NormalizedPath,
    type NormalizedPathOrModule,
    type NormalizedPathOrModuleOrFunction,
    type TranslatedString,
} from "#utils";
import type { TranslationProxy } from "../../internationalization/internationalization.js";
import { createGlobString, normalizePath } from "../paths.js";
import type { Application } from "../../application.js";

/** @enum */
export const EmitStrategy = {
    both: "both", // Emit both documentation and JS
    docs: "docs", // Emit documentation, but not JS (default)
    none: "none", // Emit nothing, just convert and run validation
} as const;
/** @hidden */
export type EmitStrategy = (typeof EmitStrategy)[keyof typeof EmitStrategy];

/**
 * Determines how TypeDoc searches for comments.
 * @enum
 */
export const CommentStyle = {
    JSDoc: "jsdoc",
    Block: "block",
    Line: "line",
    All: "all",
} as const;
export type CommentStyle = (typeof CommentStyle)[keyof typeof CommentStyle];

export type OutputSpecification = {
    name: string;
    path: string;
    options?: TypeDocOptions;
};

/**
 * List of option names which, with `entryPointStrategy` set to `packages`
 * should only be set at the root level.
 */
export const rootPackageOptions = [
    // Configuration Options
    "plugin",
    // Input Options
    "packageOptions",
    // Output Options
    "outputs",
    "out",
    "html",
    "json",
    "pretty",
    "theme",
    "router",
    "lightHighlightTheme",
    "darkHighlightTheme",
    "highlightLanguages",
    "ignoredHighlightLanguages",
    "typePrintWidth",
    "customCss",
    "customJs",
    "customFooterHtml",
    "customFooterHtmlDisableWrapper",
    "markdownItOptions",
    "markdownItLoader",
    "cname",
    "favicon",
    "sourceLinkExternal",
    "markdownLinkExternal",
    "lang",
    "locales",
    "githubPages",
    "cacheBust",
    "hideGenerator",
    "searchInComments",
    "searchInDocuments",
    "cleanOutputDir",
    "titleLink",
    "navigationLinks",
    "sidebarLinks",
    "navigation",
    "headings",
    "sluggerConfiguration",
    "navigationLeaves",
    "visibilityFilters",
    "searchCategoryBoosts",
    "searchGroupBoosts",
    "hostedBaseUrl",
    "useHostedBaseUrlForAbsoluteLinks",
    "useFirstParagraphOfCommentAsSummary",
    "includeHierarchySummary",
    // Comment Options
    "notRenderedTags",
    // Organization Options
    // Validation Options
    "treatWarningsAsErrors",
    "treatValidationWarningsAsErrors",
    // Other Options
    "watch",
    "preserveWatchOutput",
    "help",
    "version",
    "showConfig",
    "logLevel",
] as const satisfies ReadonlyArray<keyof TypeDocOptionMap>;

/**
 * An interface describing all TypeDoc specific options. Generated from a
 * map which contains more information about each option for better types when
 * defining said options.
 * @interface
 */
export type TypeDocOptions = {
    [K in keyof TypeDocOptionMap]?: unknown extends TypeDocOptionMap[K] ? unknown :
        TypeDocOptionMap[K] extends ManuallyValidatedOption<
            infer ManuallyValidated
        > ? ManuallyValidated :
        TypeDocOptionMap[K] extends
            NormalizedPath[] | NormalizedPathOrModule[] | NormalizedPathOrModuleOrFunction[] | GlobString[] ? string[] :
        TypeDocOptionMap[K] extends NormalizedPath ? string :
        TypeDocOptionMap[K] extends
            | string
            | string[]
            | number
            | boolean ? TypeDocOptionMap[K] :
        TypeDocOptionMap[K] extends Record<string, boolean> ? Partial<TypeDocOptionMap[K]> | boolean :
        | keyof TypeDocOptionMap[K]
        | TypeDocOptionMap[K][keyof TypeDocOptionMap[K]];
};

/**
 * Describes all TypeDoc specific options as returned by {@link Options.getValue}, this is
 * slightly more restrictive than the {@link TypeDocOptions} since it does not allow both
 * keys and values for mapped option types, and does not allow partials of flag values.
 * It also does not mark keys as optional.
 * @interface
 */
export type TypeDocOptionValues = {
    [K in keyof TypeDocOptionMap]: unknown extends TypeDocOptionMap[K] ? unknown :
        TypeDocOptionMap[K] extends ManuallyValidatedOption<
            infer ManuallyValidated
        > ? ManuallyValidated :
        TypeDocOptionMap[K] extends
            | string
            | string[]
            | GlobString[]
            | NormalizedPathOrModule[]
            | NormalizedPathOrModuleOrFunction[]
            | number
            | boolean
            | Record<string, boolean> ? TypeDocOptionMap[K] :
        TypeDocOptionMap[K][keyof TypeDocOptionMap[K]];
};

/**
 * Describes TypeDoc options suitable for setting within the `packageOptions` setting.
 *
 * This is a subset of all options specified in {@link TypeDocOptions}.
 */
export interface TypeDocPackageOptions extends Omit<TypeDocOptions, typeof rootPackageOptions[number]> {}

/**
 * Describes all TypeDoc options. Used internally to provide better types when fetching options.
 * External consumers should likely use {@link TypeDocOptions} instead.
 *
 * If writing a plugin, you may find it useful to use declaration merging to add your options to this interface
 * so that you have autocomplete when using `app.options.getValue`.
 *
 * ```ts
 * declare module "typedoc" {
 *   export interface TypeDocOptionMap {
 *     pluginOption: string[];
 *   }
 * }
 * ```
 */
export interface TypeDocOptionMap {
    // Configuration
    options: NormalizedPath;
    tsconfig: NormalizedPath;
    compilerOptions: unknown;
    plugin: NormalizedPathOrModuleOrFunction[];
    lang: string;
    locales: ManuallyValidatedOption<Record<string, Record<string, string>>>;
    packageOptions: ManuallyValidatedOption<
        TypeDocPackageOptions
    >;

    // Input
    entryPoints: GlobString[];
    entryPointStrategy: typeof EntryPointStrategy;
    alwaysCreateEntryPointModule: boolean;
    projectDocuments: GlobString[];
    exclude: GlobString[];
    externalPattern: GlobString[];
    excludeExternals: boolean;
    excludeNotDocumented: boolean;
    excludeNotDocumentedKinds: ReflectionKind.KindString[];
    excludeInternal: boolean;
    excludePrivate: boolean;
    excludeProtected: boolean;
    excludeReferences: boolean;
    excludeCategories: string[];
    maxTypeConversionDepth: number;
    name: string;
    includeVersion: boolean;
    disableSources: boolean;
    sourceLinkTemplate: string;
    sourceLinkExternal: boolean;
    markdownLinkExternal: boolean;
    disableGit: boolean;
    gitRevision: string;
    gitRemote: string;
    readme: string;

    // Output
    outputs: ManuallyValidatedOption<Array<OutputSpecification>>;
    out: NormalizedPath; // default output directory
    html: NormalizedPath; // shortcut for defining html output
    json: NormalizedPath; // shortcut for defining json output
    pretty: boolean;
    emit: typeof EmitStrategy;
    theme: string;
    router: string;
    lightHighlightTheme: ShikiTheme;
    darkHighlightTheme: ShikiTheme;
    highlightLanguages: string[];
    ignoredHighlightLanguages: string[];
    typePrintWidth: number;
    customCss: NormalizedPath;
    customJs: NormalizedPath;
    markdownItOptions: ManuallyValidatedOption<Record<string, unknown>>;
    /**
     * Will be called when TypeDoc is setting up the markdown parser to use to render markdown.
     * Can be used to add markdown-it plugins to the parser with code like this:
     *
     * ```ts
     * // typedoc.config.mjs
     * import iterator from "markdown-it-for-inline";
     * export default {
     *     /** @param {MarkdownIt} parser *\/
     *     markdownItLoader(parser) {
     *         parser.use(iterator, "foo_replace", "text", function(tokens, idx) {
     *             tokens[idx].content = tokens[idx].content.replace(/foo/g, 'bar');
     *         });
     *     }
     * }
     * ```
     *
     * Note: Unfortunately, markdown-it doesn't ship its own types, so `parser` isn't
     * strictly typed here.
     */
    markdownItLoader: ManuallyValidatedOption<(parser: any) => void>;
    basePath: NormalizedPath;
    cname: string;
    favicon: NormalizedPath;
    githubPages: boolean;
    hostedBaseUrl: string;
    useHostedBaseUrlForAbsoluteLinks: boolean;
    cacheBust: boolean;
    hideGenerator: boolean;
    customFooterHtml: string;
    customFooterHtmlDisableWrapper: boolean;
    searchInComments: boolean;
    searchInDocuments: boolean;
    cleanOutputDir: boolean;
    titleLink: string;
    navigationLinks: ManuallyValidatedOption<Record<string, string>>;
    sidebarLinks: ManuallyValidatedOption<Record<string, string>>;
    navigationLeaves: string[];
    navigation: {
        includeCategories: boolean;
        includeGroups: boolean;
        includeFolders: boolean;
        compactFolders: boolean;
        excludeReferences: boolean;
    };
    headings: {
        readme: boolean;
        document: boolean;
    };
    sluggerConfiguration: {
        lowercase: boolean;
    };
    includeHierarchySummary: boolean;
    visibilityFilters: ManuallyValidatedOption<{
        protected?: boolean;
        private?: boolean;
        inherited?: boolean;
        external?: boolean;
        [tag: `@${string}`]: boolean;
    }>;
    searchCategoryBoosts: ManuallyValidatedOption<Record<string, number>>;
    searchGroupBoosts: ManuallyValidatedOption<Record<string, number>>;
    useFirstParagraphOfCommentAsSummary: boolean;

    // Comment
    commentStyle: typeof CommentStyle;
    useTsLinkResolution: boolean;
    preserveLinkText: boolean;
    jsDocCompatibility: JsDocCompatibility;
    suppressCommentWarningsInDeclarationFiles: boolean;
    blockTags: `@${string}`[];
    inlineTags: `@${string}`[];
    modifierTags: `@${string}`[];
    excludeTags: `@${string}`[];
    notRenderedTags: `@${string}`[];
    externalSymbolLinkMappings: ManuallyValidatedOption<
        Record<string, Record<string, string>>
    >;
    cascadedModifierTags: `@${string}`[];

    // Organization
    categorizeByGroup: boolean;
    groupReferencesByType: boolean;
    defaultCategory: string;
    categoryOrder: string[];
    groupOrder: string[];
    sort: SortStrategy[];
    sortEntryPoints: boolean;
    kindSortOrder: ReflectionKind.KindString[];

    // Validation
    treatWarningsAsErrors: boolean;
    treatValidationWarningsAsErrors: boolean;
    intentionallyNotExported: string[];
    validation: ValidationOptions;
    requiredToBeDocumented: ReflectionKind.KindString[];
    packagesRequiringDocumentation: string[];
    intentionallyNotDocumented: string[];

    // Other
    watch: boolean;
    preserveWatchOutput: boolean;
    help: boolean;
    version: boolean;
    showConfig: boolean;
    logLevel: typeof LogLevel;
    skipErrorChecking: boolean;
}

/**
 * Wrapper type for values in TypeDocOptionMap which are represented with an unknown option type, but
 * have a validation function that checks that they are the given type.
 */
export type ManuallyValidatedOption<T> = { __validated: T };

export type ValidationOptions = {
    /**
     * If set, TypeDoc will produce warnings when a symbol is referenced by the documentation,
     * but is not included in the documentation.
     */
    notExported: boolean;
    /**
     * If set, TypeDoc will produce warnings about \{\@link\} tags which will produce broken links.
     */
    invalidLink: boolean;
    /**
     * If set, TypeDoc will produce warnings about \{\@link\} tags which do not link directly to their target.
     */
    rewrittenLink: boolean;
    /**
     * If set, TypeDoc will produce warnings about declarations that do not have doc comments
     */
    notDocumented: boolean;
    /**
     * If set, TypeDoc will produce warnings about `@mergeModuleWith` tags which were not resolved.
     */
    unusedMergeModuleWith: boolean;
};

export type JsDocCompatibility = {
    /**
     * If set, TypeDoc will treat `@example` blocks as code unless they contain a code block.
     * On by default, this is how VSCode renders blocks.
     */
    exampleTag: boolean;
    /**
     * If set, TypeDoc will treat `@default` blocks as code unless they contain a code block.
     * On by default, this is how VSCode renders blocks.
     */
    defaultTag: boolean;
    /**
     * If set, TypeDoc will warn if a `@inheritDoc` tag is spelled without TSDoc capitalization
     * (i.e. `@inheritdoc`). On by default.
     */
    inheritDocTag: boolean;
    /**
     * If set, TypeDoc will not emit warnings about unescaped `{` and `}` characters encountered
     * when parsing a comment. On by default.
     */
    ignoreUnescapedBraces: boolean;
};

/**
 * Converts a given TypeDoc option key to the type of the declaration expected.
 */
export type KeyToDeclaration<K extends keyof TypeDocOptionMap> = TypeDocOptionMap[K] extends boolean ?
    BooleanDeclarationOption :
    TypeDocOptionMap[K] extends string | NormalizedPath ? StringDeclarationOption :
    TypeDocOptionMap[K] extends number ? NumberDeclarationOption :
    TypeDocOptionMap[K] extends GlobString[] ? GlobArrayDeclarationOption :
    TypeDocOptionMap[K] extends
        string[] | NormalizedPath[] | NormalizedPathOrModule[] | NormalizedPathOrModuleOrFunction[] ?
        ArrayDeclarationOption :
    unknown extends TypeDocOptionMap[K] ? MixedDeclarationOption | ObjectDeclarationOption :
    TypeDocOptionMap[K] extends ManuallyValidatedOption<unknown> ?
            | (MixedDeclarationOption & {
                validate(
                    value: unknown,
                    i18n: TranslationProxy,
                ): void;
            })
            | (ObjectDeclarationOption & {
                validate(
                    value: unknown,
                    i18n: TranslationProxy,
                ): void;
            }) :
    TypeDocOptionMap[K] extends Record<string, boolean> ? FlagsDeclarationOption<TypeDocOptionMap[K]> :
    TypeDocOptionMap[K] extends Record<
        string | number,
        infer U
    > ? MapDeclarationOption<U> :
    never;

export enum ParameterHint {
    File,
    Directory,
}

export enum ParameterType {
    String,
    /**
     * Resolved according to the config directory.
     */
    Path,
    /**
     * Resolved according to the config directory unless it starts with https?://
     */
    UrlOrPath,
    Number,
    Boolean,
    Map,
    Mixed,
    Array,
    /**
     * Resolved according to the config directory.
     */
    PathArray,
    /**
     * Resolved according to the config directory if it starts with `.`
     * @deprecated since 0.28.8, will be removed in 0.29
     */
    ModuleArray,
    /**
     * Resolved according to the config directory if it starts with `.`
     * @internal - only intended for use with the plugin option
     */
    PluginArray,
    /**
     * Relative to the config directory.
     */
    GlobArray,
    /**
     * An object which partially merges user-set values into the defaults.
     */
    Object,
    /**
     * An object with true/false flags
     */
    Flags,
}

export interface DeclarationOptionBase {
    /**
     * The option name.
     */
    name: string;

    /**
     * The help text to be displayed to the user when --help is passed.
     *
     * This may be a string, which will be presented directly, or a function,
     * which will be called so that option help can be translated into the user specified locale.
     */
    help: NeverIfInternal<string> | (() => string);

    /**
     * The parameter type, used to convert user configuration values into the expected type.
     * If not set, the type will be a string.
     */
    type?: ParameterType;

    /**
     * If set, this option will be omitted from `--help`, and attempting to specify it on the command
     * line will produce an error.
     */
    configFileOnly?: boolean;
}

export interface StringDeclarationOption extends DeclarationOptionBase {
    /**
     * Specifies the resolution strategy. If `Path` is provided, values will be resolved according to their
     * location in a file. If `String` or no value is provided, values will not be resolved.
     */
    type?: ParameterType.String | ParameterType.Path | ParameterType.UrlOrPath;

    /**
     * If not specified defaults to the empty string for all types.
     */
    defaultValue?: string;

    /**
     * An optional hint for the type of input expected, will be displayed in the help output.
     */
    hint?: ParameterHint;

    /**
     * If specified, when this output is specified TypeDoc will automatically add
     * an output to the `outputs` option whose name is the value of this property with
     * the path set to the value of this option. Should only be used with `type`
     * set to {@link ParameterType.Path}.
     *
     * If any output shortcuts are set, the `outputs` option will be ignored.
     */
    outputShortcut?: string;

    /**
     * An optional validation function that validates a potential value of this option.
     * The function must throw an Error if the validation fails and should do nothing otherwise.
     */
    validate?: (value: string) => void;
}

export interface NumberDeclarationOption extends DeclarationOptionBase {
    type: ParameterType.Number;

    /**
     * Lowest possible value.
     */
    minValue?: number;

    /**
     * Highest possible value.
     */
    maxValue?: number;

    /**
     * If not specified defaults to 0.
     */
    defaultValue?: number;

    /**
     * An optional validation function that validates a potential value of this option.
     * The function must throw an Error if the validation fails and should do nothing otherwise.
     */
    validate?: (value: number) => void;
}

export interface BooleanDeclarationOption extends DeclarationOptionBase {
    type: ParameterType.Boolean;

    /**
     * If not specified defaults to false.
     */
    defaultValue?: boolean;
}

export interface ArrayDeclarationOption extends DeclarationOptionBase {
    type:
        | ParameterType.Array
        | ParameterType.PathArray
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        | ParameterType.ModuleArray
        | ParameterType.PluginArray;

    /**
     * If not specified defaults to an empty array.
     */
    defaultValue?: readonly string[];

    /**
     * An optional validation function that validates a potential value of this option.
     * The function must throw an Error if the validation fails and should do nothing otherwise.
     */
    validate?: (value: string[]) => void;
}

export interface GlobArrayDeclarationOption extends DeclarationOptionBase {
    type: ParameterType.GlobArray;

    /**
     * If not specified defaults to an empty array.
     * If specified, globs are relative to cwd when TypeDoc is run.
     */
    defaultValue?: readonly string[];

    /**
     * An optional validation function that validates a potential value of this option.
     * The function must throw an Error if the validation fails and should do nothing otherwise.
     */
    validate?: (value: GlobString[]) => void;
}

export interface MixedDeclarationOption extends DeclarationOptionBase {
    type: ParameterType.Mixed;

    /**
     * If not specified defaults to undefined.
     */
    defaultValue?: unknown;

    /**
     * An optional validation function that validates a potential value of this option.
     * The function must throw an Error if the validation fails and should do nothing otherwise.
     */
    validate?: (value: unknown) => void;
}

export interface ObjectDeclarationOption extends DeclarationOptionBase {
    type: ParameterType.Object;

    /**
     * If not specified defaults to undefined.
     */
    defaultValue?: unknown;

    /**
     * An optional validation function that validates a potential value of this option.
     * The function must throw an Error if the validation fails and should do nothing otherwise.
     */
    validate?: (value: unknown) => void;
}
export interface MapDeclarationOption<T> extends DeclarationOptionBase {
    type: ParameterType.Map;

    /**
     * Maps a given value to the option type. The map type may be a TypeScript enum.
     * In that case, when generating an error message for a mismatched key, the numeric
     * keys will not be listed.
     */
    map: Map<string, T> | Record<string | number, T>;

    /**
     * Unlike the rest of the option types, there is no sensible generic default for mapped option types.
     * The default value for a mapped type must be specified.
     */
    defaultValue: T;
}

export interface FlagsDeclarationOption<T extends Record<string, boolean>> extends DeclarationOptionBase {
    type: ParameterType.Flags;

    /**
     * All of the possible flags, with their default values set.
     */
    defaults: T;
}

export type DeclarationOption =
    | StringDeclarationOption
    | NumberDeclarationOption
    | BooleanDeclarationOption
    | MixedDeclarationOption
    | ObjectDeclarationOption
    | MapDeclarationOption<unknown>
    | ArrayDeclarationOption
    | GlobArrayDeclarationOption
    | FlagsDeclarationOption<Record<string, boolean>>;

export interface ParameterTypeToOptionTypeMap {
    [ParameterType.String]: string;
    [ParameterType.Path]: NormalizedPath;
    [ParameterType.UrlOrPath]: NormalizedPath | string;
    [ParameterType.Number]: number;
    [ParameterType.Boolean]: boolean;
    [ParameterType.Mixed]: unknown;
    [ParameterType.Object]: unknown;
    [ParameterType.Array]: string[];
    [ParameterType.PathArray]: NormalizedPath[];
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    [ParameterType.ModuleArray]: NormalizedPathOrModule[];
    [ParameterType.PluginArray]: Array<NormalizedPathOrModule | ((app: Application) => void | Promise<void>)>;
    [ParameterType.GlobArray]: GlobString[];
    [ParameterType.Flags]: Record<string, boolean>;

    // Special.. avoid this if possible.
    [ParameterType.Map]: unknown;
}

export type DeclarationOptionToOptionType<T extends DeclarationOption> = T extends MapDeclarationOption<infer U> ? U :
    T extends FlagsDeclarationOption<infer U> ? U :
    ParameterTypeToOptionTypeMap[Exclude<T["type"], undefined>];

function toStringArray(value: unknown, option: DeclarationOption): string[] {
    if (Array.isArray(value) && value.every(v => typeof v === "string")) {
        return value;
    } else if (typeof value === "string") {
        return [value];
    }

    throw new Error(i18n.option_0_must_be_an_array_of_string(option.name));
}

function toStringOrFunctionArray(
    value: unknown,
    option: DeclarationOption,
): Array<string | ((app: Application) => void | Promise<void>)> {
    if (Array.isArray(value) && value.every(v => typeof v === "string" || typeof v === "function")) {
        return value;
    } else if (typeof value === "string") {
        return [value];
    }

    throw new Error(i18n.option_0_must_be_an_array_of_string_or_functions(option.name));
}

const converters: {
    [K in ParameterType]: (
        value: unknown,
        option: DeclarationOption & { type: K },
        configPath: NormalizedPath,
        oldValue: unknown,
    ) => ParameterTypeToOptionTypeMap[K];
} = {
    [ParameterType.String](value, option) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        const stringValue = value == null ? "" : String(value);
        option.validate?.(stringValue);
        return stringValue;
    },
    [ParameterType.Path](value, option, configPath) {
        const stringValue =
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            value == null ? "" : resolve(configPath, String(value));
        option.validate?.(stringValue);
        return normalizePath(stringValue);
    },
    [ParameterType.UrlOrPath](value, option, configPath) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        const stringValue = value == null ? "" : String(value);

        if (/^https?:\/\//i.test(stringValue)) {
            option.validate?.(stringValue);
            return stringValue;
        }

        const resolved = normalizePath(resolve(configPath, stringValue));
        option.validate?.(resolved);
        return resolved;
    },
    [ParameterType.Number](value, option) {
        const numValue = parseInt(String(value), 10) || 0;
        if (!valueIsWithinBounds(numValue, option.minValue, option.maxValue)) {
            throw new Error(
                getBoundsError(
                    option.name,
                    option.minValue,
                    option.maxValue,
                ),
            );
        }
        option.validate?.(numValue);
        return numValue;
    },
    [ParameterType.Boolean](value) {
        return !!value;
    },
    [ParameterType.Array](value, option) {
        const strArrValue = toStringArray(value, option);
        option.validate?.(strArrValue);
        return strArrValue;
    },
    [ParameterType.PathArray](value, option, configPath) {
        const strArrValue = toStringArray(value, option);
        const normalized = strArrValue.map((path) => normalizePath(resolve(configPath, path)));
        option.validate?.(normalized);
        return normalized;
    },
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    [ParameterType.ModuleArray](value, option, configPath) {
        const strArrValue = toStringArray(value, option);
        const resolved = resolveModulePaths(strArrValue, configPath);
        option.validate?.(resolved);
        return resolved;
    },
    [ParameterType.PluginArray](value, option, configPath) {
        const arrayValue = toStringOrFunctionArray(value, option);
        const resolved = arrayValue.map(plugin =>
            typeof plugin === "function" ? plugin : resolveModulePath(plugin, configPath)
        );
        return resolved;
    },
    [ParameterType.GlobArray](value, option, configPath) {
        const toGlobString = (v: unknown) => {
            const s = String(v);

            // If the string tries to escape a character which isn't a special
            // glob character, the user probably provided a Windows style path
            // by accident due to shell completion, tell them to either remove
            // the useless escape or switch to Unix path separators.
            if (/\\[^?*()[\]\\{}]/.test(s)) {
                throw new Error(i18n.glob_0_should_use_posix_slash(s));
            }

            return createGlobString(configPath, s);
        };
        const strArrValue = toStringArray(value, option);
        const globs = strArrValue.map(toGlobString);
        option.validate?.(globs);
        return globs;
    },
    [ParameterType.Map](value, option) {
        const key = String(value);
        if (option.map instanceof Map) {
            if (option.map.has(key)) {
                return option.map.get(key);
            } else if ([...option.map.values()].includes(value)) {
                return value;
            }
        } else if (key in option.map) {
            if (isTsNumericEnum(option.map) && typeof value === "number") {
                return value;
            }
            return option.map[key];
        } else if (Object.values(option.map).includes(value)) {
            return value;
        }
        throw new Error(getMapError(option.map, option.name));
    },
    [ParameterType.Mixed](value, option) {
        option.validate?.(value);
        return value;
    },
    [ParameterType.Object](value, option, _configPath, oldValue) {
        option.validate?.(value);
        if (typeof oldValue !== "undefined") {
            value = { ...(oldValue as object), ...(value as object) };
        }
        return value;
    },
    [ParameterType.Flags](value, option) {
        if (typeof value === "boolean") {
            value = Object.fromEntries(
                Object.keys(option.defaults).map((key) => [key, value]),
            );
        }

        if (typeof value !== "object" || value == null) {
            throw new Error(
                i18n.expected_object_with_flag_values_for_0(option.name),
            );
        }
        const obj = { ...value } as Record<string, unknown>;

        for (const key of Object.keys(obj)) {
            if (!Object.prototype.hasOwnProperty.call(option.defaults, key)) {
                throw new Error(
                    i18n.flag_0_is_not_valid_for_1_expected_2(
                        key,
                        option.name,
                        Object.keys(option.defaults).join(", "),
                    ),
                );
            }

            if (typeof obj[key] !== "boolean") {
                // Explicit null/undefined, switch to default.
                if (obj[key] == null) {
                    obj[key] = option.defaults[key];
                } else {
                    throw new Error(
                        i18n.flag_values_for_0_must_be_booleans(option.name),
                    );
                }
            }
        }
        return obj as Record<string, boolean>;
    },
};

/**
 * The default conversion function used by the Options container. Readers may
 * re-use this conversion function or implement their own. The arguments reader
 * implements its own since 'false' should not be converted to true for a boolean option.
 * @param value The value to convert.
 * @param option The option for which the value should be converted.
 * @returns The result of the conversion. Might be the value or an error.
 */
export function convert(
    value: unknown,
    option: DeclarationOption,
    configPath: string,
    oldValue?: unknown,
): unknown {
    const _converters = converters as Record<
        ParameterType,
        (
            v: unknown,
            o: DeclarationOption,
            c: string,
            ov: unknown,
        ) => unknown
    >;
    return _converters[option.type ?? ParameterType.String](
        value,
        option,
        configPath,
        oldValue,
    );
}

const defaultGetters: {
    [K in ParameterType]: (
        option: DeclarationOption & { type: K },
    ) => ParameterTypeToOptionTypeMap[K];
} = {
    [ParameterType.String](option) {
        return option.defaultValue ?? "";
    },
    [ParameterType.Path](option) {
        const defaultStr = option.defaultValue ?? "";
        if (defaultStr == "") {
            return "";
        }
        return normalizePath(
            isAbsolute(defaultStr)
                ? defaultStr
                : join(process.cwd(), defaultStr),
        );
    },
    [ParameterType.UrlOrPath](option) {
        const defaultStr = option.defaultValue ?? "";
        if (defaultStr == "") {
            return "";
        }
        if (/^https?:\/\//i.test(defaultStr)) {
            return defaultStr;
        }
        return isAbsolute(defaultStr)
            ? defaultStr
            : join(process.cwd(), defaultStr);
    },
    [ParameterType.Number](option) {
        return option.defaultValue ?? 0;
    },
    [ParameterType.Boolean](option) {
        return option.defaultValue ?? false;
    },
    [ParameterType.Map](option) {
        return option.defaultValue;
    },
    [ParameterType.Mixed](option) {
        return option.defaultValue;
    },
    [ParameterType.Object](option) {
        return option.defaultValue;
    },
    [ParameterType.Array](option) {
        return option.defaultValue?.slice() ?? [];
    },
    [ParameterType.PathArray](option) {
        return (
            option.defaultValue?.map((value) => normalizePath(resolve(process.cwd(), value))) ?? []
        );
    },
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    [ParameterType.ModuleArray](option) {
        if (option.defaultValue) {
            return resolveModulePaths(option.defaultValue, process.cwd());
        }
        return [];
    },
    [ParameterType.PluginArray](option) {
        if (option.defaultValue) {
            return resolveModulePaths(option.defaultValue, process.cwd());
        }
        return [];
    },
    [ParameterType.GlobArray](option) {
        return (option.defaultValue ?? []).map(g => createGlobString(normalizePath(process.cwd()), g));
    },
    [ParameterType.Flags](option) {
        return { ...option.defaults };
    },
};

export function getDefaultValue(option: DeclarationOption) {
    const getters = defaultGetters as Record<
        ParameterType,
        (o: DeclarationOption) => unknown
    >;
    return getters[option.type ?? ParameterType.String](option);
}

function resolveModulePaths(modules: readonly string[], configPath: string): NormalizedPathOrModule[] {
    return modules.map(path => resolveModulePath(path, configPath));
}

function resolveModulePath(path: string, configPath: string): NormalizedPathOrModule {
    if (path.startsWith(".")) {
        return normalizePath(resolve(configPath, path));
    }
    return normalizePath(path);
}

function isTsNumericEnum(map: Record<string, any>) {
    return Object.values(map).every((key) => map[map[key]] === key);
}

/**
 * Returns an error message for a map option, indicating that a given value was not one of the values within the map.
 * @param map The values for the option.
 * @param name The name of the option.
 * @returns The error message.
 */
function getMapError(
    map: MapDeclarationOption<unknown>["map"],
    name: string,
): TranslatedString {
    let keys = map instanceof Map ? [...map.keys()] : Object.keys(map);

    // If the map is a TS numeric enum we need to filter out the numeric keys.
    // TS numeric enums have the property that every key maps to a value, which maps back to that key.
    if (!(map instanceof Map) && isTsNumericEnum(map)) {
        // This works because TS enum keys may not be numeric.
        keys = keys.filter((key) => Number.isNaN(parseInt(key, 10)));
    }

    return i18n.option_0_must_be_one_of_1(name, keys.join(", "));
}

/**
 * Returns an error message for a value that is out of bounds of the given min and/or max values.
 * @param name The name of the thing the value represents.
 * @param minValue The lower bound of the range of allowed values.
 * @param maxValue The upper bound of the range of allowed values.
 * @returns The error message.
 */
function getBoundsError(
    name: string,
    minValue?: number,
    maxValue?: number,
): TranslatedString {
    if (isFiniteNumber(minValue) && isFiniteNumber(maxValue)) {
        return i18n.option_0_must_be_between_1_and_2(
            name,
            String(minValue),
            String(maxValue),
        );
    } else if (isFiniteNumber(minValue)) {
        return i18n.option_0_must_be_equal_to_or_greater_than_1(
            name,
            String(minValue),
        );
    } else {
        return i18n.option_0_must_be_less_than_or_equal_to_1(
            name,
            String(maxValue),
        );
    }
}

/**
 * Checks if the given value is a finite number.
 * @param value The value being checked.
 * @returns True, if the value is a finite number, otherwise false.
 */
function isFiniteNumber(value: unknown): value is number {
    return Number.isFinite(value);
}

/**
 * Checks if a value is between the bounds of the given min and/or max values.
 * @param value The value being checked.
 * @param minValue The lower bound of the range of allowed values.
 * @param maxValue The upper bound of the range of allowed values.
 * @returns True, if the value is within the given bounds, otherwise false.
 */
function valueIsWithinBounds(
    value: number,
    minValue?: number,
    maxValue?: number,
): boolean {
    if (isFiniteNumber(minValue) && isFiniteNumber(maxValue)) {
        return minValue <= value && value <= maxValue;
    } else if (isFiniteNumber(minValue)) {
        return minValue <= value;
    } else if (isFiniteNumber(maxValue)) {
        return value <= maxValue;
    } else {
        return true;
    }
}
