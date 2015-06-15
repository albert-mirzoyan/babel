import {
    Utils,
    ArraySet,
    VLQ
} from './Utils';

export class SourceMapConsumer {
    static get GENERATED_ORDER() {
        return 1
    }
    static get ORIGINAL_ORDER() {
        return 2
    }
    /**
     * A SourceMapConsumer instance represents a parsed source map which we can
     * query for information about the original file positions by giving it a file
     * position in the generated source.
     *
     * The only parameter is the raw source map (either as a JSON string, or
     * already parsed to an object). According to the spec, source maps have the
     * following attributes:
     *
     *   - version: Which version of the source map spec this map is following.
     *   - sources: An array of URLs to the original source files.
     *   - names: An array of identifiers which can be referrenced by individual mappings.
     *   - sourceRoot: Optional. The URL root from which all sources are relative.
     *   - sourcesContent: Optional. An array of contents of the original source files.
     *   - mappings: A string of base64 VLQs which contain the actual mappings.
     *   - file: Optional. The generated file this source map is associated with.
     *
     * Here is an example source map, taken from the source map spec[0]:
     *
     *     {
   *       version : 3,
   *       file: "out.js",
   *       sourceRoot : "",
   *       sources: ["foo.js", "bar.js"],
   *       names: ["src", "maps", "are", "fun"],
   *       mappings: "AA,AB;;ABCDE;"
   *     }
     *
     * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
     */
    constructor(aSourceMap) {
        var sourceMap = aSourceMap;
        if (typeof aSourceMap === 'string') {
            sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
        }

        var version = Utils.getArg(sourceMap, 'version');
        var sources = Utils.getArg(sourceMap, 'sources');
        // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
        // requires the array) to play nice here.
        var names = Utils.getArg(sourceMap, 'names', []);
        var sourceRoot = Utils.getArg(sourceMap, 'sourceRoot', null);
        var sourcesContent = Utils.getArg(sourceMap, 'sourcesContent', null);
        var mappings = Utils.getArg(sourceMap, 'mappings');
        var file = Utils.getArg(sourceMap, 'file', null);

        // Once again, Sass deviates from the spec and supplies the version as a
        // string rather than a number, so we use loose equality checking here.
        if (version != this._version) {
            throw new Error('Unsupported version: ' + version);
        }

        // Some source maps produce relative source paths like "./foo.js" instead of
        // "foo.js".  Normalize these first so that future comparisons will succeed.
        // See bugzil.la/1090768.
        sources = sources.map(Utils.normalize);

        // Pass `true` below to allow duplicate names and sources. While source maps
        // are intended to be compressed and deduplicated, the TypeScript compiler
        // sometimes generates source maps with duplicates in them. See Github issue
        // #72 and bugzil.la/889492.
        this._names = ArraySet.fromArray(names, true);
        this._sources = ArraySet.fromArray(sources, true);

        this.sourceRoot = sourceRoot;
        this.sourcesContent = sourcesContent;
        this._mappings = mappings;
        this.file = file;
    }
    get _version(){return 3}
    /**
     * Create a SourceMapConsumer from a SourceMapGenerator.
     *
     * @param SourceMapGenerator aSourceMap
     *        The source map that will be consumed.
     * @returns SourceMapConsumer
     */
    fromSourceMap(aSourceMap) {
        var smc = Object.create(SourceMapConsumer.prototype);

        smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
        smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
        smc.sourceRoot = aSourceMap._sourceRoot;
        smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
            smc.sourceRoot);
        smc.file = aSourceMap._file;

        smc.__generatedMappings = aSourceMap._mappings.toArray().slice();
        smc.__originalMappings = aSourceMap._mappings.toArray().slice()
        .sort(Utils.compareByOriginalPositions);

        return smc;
    }
    get sources() {
        return this._sources.toArray().map(function (s) {
            return this.sourceRoot != null ? Utils.join(this.sourceRoot, s) : s;
        }, this);
    }
    // `__generatedMappings` and `__originalMappings` are arrays that hold the
    // parsed mapping coordinates from the source map's "mappings" attribute. They
    // are lazily instantiated, accessed via the `_generatedMappings` and
    // `_originalMappings` getters respectively, and we only parse the mappings
    // and create these arrays once queried for a source location. We jump through
    // these hoops because there can be many thousands of mappings, and parsing
    // them is expensive, so we only want to do it if we must.
    //
    // Each object in the arrays is of the form:
    //
    //     {
    //       generatedLine: The line number in the generated code,
    //       generatedColumn: The column number in the generated code,
    //       source: The path to the original source file that generated this
    //               chunk of code,
    //       originalLine: The line number in the original source that
    //                     corresponds to this chunk of generated code,
    //       originalColumn: The column number in the original source that
    //                       corresponds to this chunk of generated code,
    //       name: The name of the original symbol which generated this chunk of
    //             code.
    //     }
    //
    // All properties except for `generatedLine` and `generatedColumn` can be
    // `null`.
    //
    // `_generatedMappings` is ordered by the generated positions.
    //
    // `_originalMappings` is ordered by the original positions.
    get _generatedMappings() {
        if (!this.__generatedMappings) {
            this.__generatedMappings = [];
            this.__originalMappings = [];
            this._parseMappings(this._mappings, this.sourceRoot);
        }
        return this.__generatedMappings;
    }
    get _originalMappings() {
        if (!this.__originalMappings) {
            this.__generatedMappings = [];
            this.__originalMappings = [];
            this._parseMappings(this._mappings, this.sourceRoot);
        }

        return this.__originalMappings;
    }
    _nextCharIsMappingSeparator(aStr) {
        var c = aStr.charAt(0);
        return c === ";" || c === ",";
    }
    /**
     * Parse the mappings in a string in to a data structure which we can easily
     * query (the ordered arrays in the `this.__generatedMappings` and
     * `this.__originalMappings` properties).
     */
    _parseMappings(aStr, aSourceRoot) {
        var generatedLine = 1;
        var previousGeneratedColumn = 0;
        var previousOriginalLine = 0;
        var previousOriginalColumn = 0;
        var previousSource = 0;
        var previousName = 0;
        var str = aStr;
        var temp = {};
        var mapping;

        while (str.length > 0) {
            if (str.charAt(0) === ';') {
                generatedLine++;
                str = str.slice(1);
                previousGeneratedColumn = 0;
            }
            else if (str.charAt(0) === ',') {
                str = str.slice(1);
            }
            else {
                mapping = {};
                mapping.generatedLine = generatedLine;

                // Generated column.
                VLQ.decode(str, temp);
                mapping.generatedColumn = previousGeneratedColumn + temp.value;
                previousGeneratedColumn = mapping.generatedColumn;
                str = temp.rest;

                if (str.length > 0 && !this._nextCharIsMappingSeparator(str)) {
                    // Original source.
                    VLQ.decode(str, temp);
                    mapping.source = this._sources.at(previousSource + temp.value);
                    previousSource += temp.value;
                    str = temp.rest;
                    if (str.length === 0 || this._nextCharIsMappingSeparator(str)) {
                        throw new Error('Found a source, but no line and column');
                    }

                    // Original line.
                    VLQ.decode(str, temp);
                    mapping.originalLine = previousOriginalLine + temp.value;
                    previousOriginalLine = mapping.originalLine;
                    // Lines are stored 0-based
                    mapping.originalLine += 1;
                    str = temp.rest;
                    if (str.length === 0 || this._nextCharIsMappingSeparator(str)) {
                        throw new Error('Found a source and line, but no column');
                    }

                    // Original column.
                    VLQ.decode(str, temp);
                    mapping.originalColumn = previousOriginalColumn + temp.value;
                    previousOriginalColumn = mapping.originalColumn;
                    str = temp.rest;

                    if (str.length > 0 && !this._nextCharIsMappingSeparator(str)) {
                        // Original name.
                        VLQ.decode(str, temp);
                        mapping.name = this._names.at(previousName + temp.value);
                        previousName += temp.value;
                        str = temp.rest;
                    }
                }

                this.__generatedMappings.push(mapping);
                if (typeof mapping.originalLine === 'number') {
                    this.__originalMappings.push(mapping);
                }
            }
        }

        this.__generatedMappings.sort(Utils.compareByGeneratedPositions);
        this.__originalMappings.sort(Utils.compareByOriginalPositions);
    }
    /**
     * Find the mapping that best matches the hypothetical "needle" mapping that
     * we are searching for in the given "haystack" of mappings.
     */
    _findMapping(aNeedle, aMappings, aLineName,aColumnName, aComparator) {
        // To return the position we are searching for, we must first find the
        // mapping for the given position and then return the opposite position it
        // points to. Because the mappings are sorted, we can use binary binarySearch to
        // find the best mapping.
        if (aNeedle[aLineName] <= 0) {
            throw new TypeError('Line must be greater than or equal to 1, got '
            + aNeedle[aLineName]);
        }
        if (aNeedle[aColumnName] < 0) {
            throw new TypeError('Column must be greater than or equal to 0, got '+ aNeedle[aColumnName]);
        }
        return Utils.binarySearch(aNeedle, aMappings, aComparator);
    }
    /**
     * Compute the last column for each generated mapping. The last column is
     * inclusive.
     */
    computeColumnSpans() {
        for (var index = 0; index < this._generatedMappings.length; ++index) {
            var mapping = this._generatedMappings[index];

            // Mappings do not contain a field for the last generated columnt. We
            // can come up with an optimistic estimate, however, by assuming that
            // mappings are contiguous (i.e. given two consecutive mappings, the
            // first mapping ends where the second one starts).
            if (index + 1 < this._generatedMappings.length) {
                var nextMapping = this._generatedMappings[index + 1];

                if (mapping.generatedLine === nextMapping.generatedLine) {
                    mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
                    continue;
                }
            }

            // The last mapping for each line spans the entire line.
            mapping.lastGeneratedColumn = Infinity;
        }
    }
    /**
     * Returns the original source, line, and column information for the generated
     * source's line and column positions provided. The only argument is an object
     * with the following properties:
     *
     *   - line: The line number in the generated source.
     *   - column: The column number in the generated source.
     *
     * and an object is returned with the following properties:
     *
     *   - source: The original source file, or null.
     *   - line: The line number in the original source, or null.
     *   - column: The column number in the original source, or null.
     *   - name: The original identifier, or null.
     */
    originalPositionFor(aArgs) {
        var needle = {
            generatedLine: Utils.getArg(aArgs, 'line'),
            generatedColumn: Utils.getArg(aArgs, 'column')
        };

        var index = this._findMapping(needle,
            this._generatedMappings,
            "generatedLine",
            "generatedColumn",
            Utils.compareByGeneratedPositions);

        if (index >= 0) {
            var mapping = this._generatedMappings[index];

            if (mapping.generatedLine === needle.generatedLine) {
                var source = Utils.getArg(mapping, 'source', null);
                if (source != null && this.sourceRoot != null) {
                    source = Utils.join(this.sourceRoot, source);
                }
                return {
                    source: source,
                    line: Utils.getArg(mapping, 'originalLine', null),
                    column: Utils.getArg(mapping, 'originalColumn', null),
                    name: Utils.getArg(mapping, 'name', null)
                };
            }
        }

        return {
            source: null,
            line: null,
            column: null,
            name: null
        };
    }
    /**
     * Returns the original source content. The only argument is the url of the
     * original source file. Returns null if no original source content is
     * availible.
     */
    sourceContentFor(aSource) {
        if (!this.sourcesContent) {
            return null;
        }

        if (this.sourceRoot != null) {
            aSource = Utils.relative(this.sourceRoot, aSource);
        }

        if (this._sources.has(aSource)) {
            return this.sourcesContent[this._sources.indexOf(aSource)];
        }

        var url;
        if (this.sourceRoot != null
            && (url = Utils.urlParse(this.sourceRoot))) {
            // XXX: file:// URIs and absolute paths lead to unexpected behavior for
            // many users. We can help them out when they expect file:// URIs to
            // behave like it would if they were running a local HTTP server. See
            // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
            var fileUriAbsPath = aSource.replace(/^file:\/\//, "");
            if (url.scheme == "file"
                && this._sources.has(fileUriAbsPath)) {
                return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
            }

            if ((!url.path || url.path == "/")
                && this._sources.has("/" + aSource)) {
                return this.sourcesContent[this._sources.indexOf("/" + aSource)];
            }
        }

        throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
    /**
     * Returns the generated line and column information for the original source,
     * line, and column positions provided. The only argument is an object with
     * the following properties:
     *
     *   - source: The filename of the original source.
     *   - line: The line number in the original source.
     *   - column: The column number in the original source.
     *
     * and an object is returned with the following properties:
     *
     *   - line: The line number in the generated source, or null.
     *   - column: The column number in the generated source, or null.
     */
    generatedPositionFor(aArgs) {
        var needle = {
            source: Utils.getArg(aArgs, 'source'),
            originalLine: Utils.getArg(aArgs, 'line'),
            originalColumn: Utils.getArg(aArgs, 'column')
        };

        if (this.sourceRoot != null) {
            needle.source = Utils.relative(this.sourceRoot, needle.source);
        }

        var index = this._findMapping(needle,
            this._originalMappings,
            "originalLine",
            "originalColumn",
            Utils.compareByOriginalPositions);

        if (index >= 0) {
            var mapping = this._originalMappings[index];

            return {
                line: Utils.getArg(mapping, 'generatedLine', null),
                column: Utils.getArg(mapping, 'generatedColumn', null),
                lastColumn: Utils.getArg(mapping, 'lastGeneratedColumn', null)
            };
        }

        return {
            line: null,
            column: null,
            lastColumn: null
        };
    }
    /**
     * Returns all generated line and column information for the original source
     * and line provided. The only argument is an object with the following
     * properties:
     *
     *   - source: The filename of the original source.
     *   - line: The line number in the original source.
     *
     * and an array of objects is returned, each with the following properties:
     *
     *   - line: The line number in the generated source, or null.
     *   - column: The column number in the generated source, or null.
     */
    allGeneratedPositionsFor(aArgs) {
        // When there is no exact match, SourceMapConsumer.prototype._findMapping
        // returns the index of the closest mapping less than the needle. By
        // setting needle.originalColumn to Infinity, we thus find the last
        // mapping for the given line, provided such a mapping exists.
        var needle = {
            source: Utils.getArg(aArgs, 'source'),
            originalLine: Utils.getArg(aArgs, 'line'),
            originalColumn: Infinity
        };

        if (this.sourceRoot != null) {
            needle.source = Utils.relative(this.sourceRoot, needle.source);
        }

        var mappings = [];

        var index = this._findMapping(needle,
            this._originalMappings,
            "originalLine",
            "originalColumn",
            Utils.compareByOriginalPositions);
        if (index >= 0) {
            var mapping = this._originalMappings[index];

            while (mapping && mapping.originalLine === needle.originalLine) {
                mappings.push({
                    line: Utils.getArg(mapping, 'generatedLine', null),
                    column: Utils.getArg(mapping, 'generatedColumn', null),
                    lastColumn: Utils.getArg(mapping, 'lastGeneratedColumn', null)
                });

                mapping = this._originalMappings[--index];
            }
        }

        return mappings.reverse();
    }
    /**
     * Iterate over each mapping between an original source/line/column and a
     * generated line/column in this source map.
     *
     * @param Function aCallback
     *        The function that is called with each mapping.
     * @param Object aContext
     *        Optional. If specified, this object will be the value of `this` every
     *        time that `aCallback` is called.
     * @param aOrder
     *        Either `SourceMapConsumer.GENERATED_ORDER` or
     *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
     *        iterate over the mappings sorted by the generated file's line/column
     *        order or the original's source/line/column order, respectively. Defaults to
     *        `SourceMapConsumer.GENERATED_ORDER`.
     */
    eachMapping(aCallback, aContext, aOrder) {
        var context = aContext || null;
        var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

        var mappings;
        switch (order) {
            case SourceMapConsumer.GENERATED_ORDER:
                mappings = this._generatedMappings;
                break;
            case SourceMapConsumer.ORIGINAL_ORDER:
                mappings = this._originalMappings;
                break;
            default:
                throw new Error("Unknown order of iteration.");
        }

        var sourceRoot = this.sourceRoot;
        mappings.map(function (mapping) {
            var source = mapping.source;
            if (source != null && sourceRoot != null) {
                source = Utils.join(sourceRoot, source);
            }
            return {
                source: source,
                generatedLine: mapping.generatedLine,
                generatedColumn: mapping.generatedColumn,
                originalLine: mapping.originalLine,
                originalColumn: mapping.originalColumn,
                name: mapping.name
            };
        }).forEach(aCallback, context);
    }
}
