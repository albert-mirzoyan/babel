export class Utils {
    /**
     * This is a helper function for getting values from parameter/options
     * objects.
     *
     * @param aArgs The object we are extracting values from
     * @param aName The name of the property we are getting.
     * @param aDefaultValue An optional value to return if the property is missing
     * from the object. If this is not specified and the property is missing, an
     * error will be thrown.
     */
    static getArg(aArgs, aName, aDefaultValue) {
        if (aName in aArgs) {
            return aArgs[aName];
        } else if (arguments.length === 3) {
            return aDefaultValue;
        } else {
            throw new Error('"' + aName + '" is a required argument.');
        }
    }
    static urlParse(aUrl) {
        var match = aUrl.match(/^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/);
        if (!match) {
            return null;
        }
        return {
            scheme: match[1],
            auth: match[2],
            host: match[3],
            port: match[4],
            path: match[5]
        };
    }
    static urlGenerate(aParsedUrl) {
        var url = '';
        if (aParsedUrl.scheme) {
            url += aParsedUrl.scheme + ':';
        }
        url += '//';
        if (aParsedUrl.auth) {
            url += aParsedUrl.auth + '@';
        }
        if (aParsedUrl.host) {
            url += aParsedUrl.host;
        }
        if (aParsedUrl.port) {
            url += ":" + aParsedUrl.port
        }
        if (aParsedUrl.path) {
            url += aParsedUrl.path;
        }
        return url;
    }
    /**
     * Normalizes a path, or the path portion of a URL:
     *
     * - Replaces consequtive slashes with one slash.
     * - Removes unnecessary '.' parts.
     * - Removes unnecessary '<dir>/..' parts.
     *
     * Based on code in the Node.js 'path' core module.
     *
     * @param aPath The path or url to normalize.
     */
    static normalize(aPath) {
        var path = aPath;
        var url = Utils.urlParse(aPath);
        if (url) {
            if (!url.path) {
                return aPath;
            }
            path = url.path;
        }
        var isAbsolute = (path.charAt(0) === '/');

        var parts = path.split(/\/+/);
        for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
            part = parts[i];
            if (part === '.') {
                parts.splice(i, 1);
            } else if (part === '..') {
                up++;
            } else if (up > 0) {
                if (part === '') {
                    // The first part is blank if the path is absolute. Trying to go
                    // above the root is a no-op. Therefore we can remove all '..' parts
                    // directly after the root.
                    parts.splice(i + 1, up);
                    up = 0;
                } else {
                    parts.splice(i, 2);
                    up--;
                }
            }
        }
        path = parts.join('/');

        if (path === '') {
            path = isAbsolute ? '/' : '.';
        }

        if (url) {
            url.path = path;
            return Utils.urlGenerate(url);
        }
        return path;
    }
    /**
     * Joins two paths/URLs.
     *
     * @param aRoot The root path or URL.
     * @param aPath The path or URL to be joined with the root.
     *
     * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
     *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
     *   first.
     * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
     *   is updated with the result and aRoot is returned. Otherwise the result
     *   is returned.
     *   - If aPath is absolute, the result is aPath.
     *   - Otherwise the two paths are joined with a slash.
     * - Joining for example 'http://' and 'www.example.com' is also supported.
     */
    static join(aRoot, aPath) {
        if (aRoot === "") {
            aRoot = ".";
        }
        if (aPath === "") {
            aPath = ".";
        }
        var aPathUrl = Utils.urlParse(aPath);
        var aRootUrl = Utils.urlParse(aRoot);
        if (aRootUrl) {
            aRoot = aRootUrl.path || '/';
        }

        // `join(foo, '//www.example.org')`
        if (aPathUrl && !aPathUrl.scheme) {
            if (aRootUrl) {
                aPathUrl.scheme = aRootUrl.scheme;
            }
            return Utils.urlGenerate(aPathUrl);
        }

        if (aPathUrl || aPath.match(/^data:.+\,.+$/)) {
            return aPath;
        }

        // `join('http://', 'www.example.com')`
        if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
            aRootUrl.host = aPath;
            return Utils.urlGenerate(aRootUrl);
        }

        var joined = aPath.charAt(0) === '/'
        ? aPath
        : Utils.normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

        if (aRootUrl) {
            aRootUrl.path = joined;
            return Utils.urlGenerate(aRootUrl);
        }
        return joined;
    }
    /**
     * Make a path relative to a URL or another path.
     *
     * @param aRoot The root path or URL.
     * @param aPath The path or URL to be made relative to aRoot.
     */
    static relative(aRoot, aPath) {
        if (aRoot === "") {
            aRoot = ".";
        }

        aRoot = aRoot.replace(/\/$/, '');

        // XXX: It is possible to remove this block, and the tests still pass!
        var url = Utils.urlParse(aRoot);
        if (aPath.charAt(0) == "/" && url && url.path == "/") {
            return aPath.slice(1);
        }

        return aPath.indexOf(aRoot + '/') === 0
        ? aPath.substr(aRoot.length + 1)
        : aPath;
    }
    /**
     * Because behavior goes wacky when you set `__proto__` on objects, we
     * have to prefix all the strings in our set with an arbitrary character.
     *
     * See https://github.com/mozilla/source-map/pull/31 and
     * https://github.com/mozilla/source-map/issues/30
     *
     * @param aStr
     */
    static toSetString(aStr) {
        return '$' + aStr;
    }
    static fromSetString(aStr) {
        return aStr.substr(1);
    }
    static strcmp(aStr1, aStr2) {
        var s1 = aStr1 || "";
        var s2 = aStr2 || "";
        return (s1 > s2) - (s1 < s2);
    }
    /**
     * Comparator between two mappings where the original positions are compared.
     *
     * Optionally pass in `true` as `onlyCompareGenerated` to consider two
     * mappings with the same original source/line/column, but different generated
     * line and column the same. Useful when searching for a mapping with a
     * stubbed out mapping.
     */
    static compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
        var cmp;

        cmp = Utils.strcmp(mappingA.source, mappingB.source);
        if (cmp) {
            return cmp;
        }

        cmp = mappingA.originalLine - mappingB.originalLine;
        if (cmp) {
            return cmp;
        }

        cmp = mappingA.originalColumn - mappingB.originalColumn;
        if (cmp || onlyCompareOriginal) {
            return cmp;
        }

        cmp = Utils.strcmp(mappingA.name, mappingB.name);
        if (cmp) {
            return cmp;
        }

        cmp = mappingA.generatedLine - mappingB.generatedLine;
        if (cmp) {
            return cmp;
        }

        return mappingA.generatedColumn - mappingB.generatedColumn;
    }
    /**
     * Comparator between two mappings where the generated positions are
     * compared.
     *
     * Optionally pass in `true` as `onlyCompareGenerated` to consider two
     * mappings with the same generated line and column, but different
     * source/name/original line and column the same. Useful when searching for a
     * mapping with a stubbed out mapping.
     */
    static compareByGeneratedPositions(mappingA, mappingB, onlyCompareGenerated) {
        var cmp;

        cmp = mappingA.generatedLine - mappingB.generatedLine;
        if (cmp) {
            return cmp;
        }

        cmp = mappingA.generatedColumn - mappingB.generatedColumn;
        if (cmp || onlyCompareGenerated) {
            return cmp;
        }

        cmp = Utils.strcmp(mappingA.source, mappingB.source);
        if (cmp) {
            return cmp;
        }

        cmp = mappingA.originalLine - mappingB.originalLine;
        if (cmp) {
            return cmp;
        }

        cmp = mappingA.originalColumn - mappingB.originalColumn;
        if (cmp) {
            return cmp;
        }

        return Utils.strcmp(mappingA.name, mappingB.name);
    }
    static recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare) {
        // This function terminates when one of the following is true:
        //
        //   1. We find the exact element we are looking for.
        //
        //   2. We did not find the exact element, but we can return the index of
        //      the next closest element that is less than that element.
        //
        //   3. We did not find the exact element, and there is no next-closest
        //      element which is less than the one we are searching for, so we
        //      return -1.
        var mid = Math.floor((aHigh - aLow) / 2) + aLow;
        var cmp = aCompare(aNeedle, aHaystack[mid], true);
        if (cmp === 0) {
            // Found the element we are looking for.
            return mid;
        }
        else if (cmp > 0) {
            // aHaystack[mid] is greater than our needle.
            if (aHigh - mid > 1) {
                // The element is in the upper half.
                return Utils.recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare);
            }
            // We did not find an exact match, return the next closest one
            // (termination case 2).
            return mid;
        }
        else {
            // aHaystack[mid] is less than our needle.
            if (mid - aLow > 1) {
                // The element is in the lower half.
                return Utils.recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare);
            }
            // The exact needle element was not found in this haystack. Determine if
            // we are in termination case (2) or (3) and return the appropriate thing.
            return aLow < 0 ? -1 : aLow;
        }
    }
    static binarySearch(aNeedle, aHaystack, aCompare) {
        if (aHaystack.length === 0) {
            return -1;
        }
        return Utils.recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare)
    }
}
export class ArraySet {
    /**
     * A data structure which is a combination of an array and a set. Adding a new
     * member is O(1), testing for membership is O(1), and finding the index of an
     * element is O(1). Removing elements from the set is not supported. Only
     * strings are supported for membership.
     */
    constructor() {
        this._array = [];
        this._set = {};
    }
    /**
     * Static method for creating ArraySet instances from an existing array.
     */
    static fromArray(aArray, aAllowDuplicates) {
        var set = new ArraySet();
        for (var i = 0, len = aArray.length; i < len; i++) {
            set.add(aArray[i], aAllowDuplicates);
        }
        return set;
    }
    /**
     * Add the given string to this set.
     *
     * @param String aStr
     */
    add(aStr, aAllowDuplicates) {
        var isDuplicate = this.has(aStr);
        var idx = this._array.length;
        if (!isDuplicate || aAllowDuplicates) {
            this._array.push(aStr);
        }
        if (!isDuplicate) {
            this._set[Utils.toSetString(aStr)] = idx;
        }
    }
    /**
     * Is the given string a member of this set?
     *
     * @param String aStr
     */
    has(aStr) {
        return Object.prototype.hasOwnProperty.call(this._set,
            Utils.toSetString(aStr));
    }
    /**
     * What is the index of the given string in the array?
     *
     * @param String aStr
     */
    indexOf(aStr) {
        if (this.has(aStr)) {
            return this._set[Utils.toSetString(aStr)];
        }
        throw new Error('"' + aStr + '" is not in the set.');
    }
    /**
     * What is the element at the given index?
     *
     * @param Number aIdx
     */
    at(aIdx) {
        if (aIdx >= 0 && aIdx < this._array.length) {
            return this._array[aIdx];
        }
        throw new Error('No element indexed by ' + aIdx);
    }
    /**
     * Returns the array representation of this set (which has the proper indices
     * indicated by indexOf). Note that this is a copy of the internal array used
     * for storing the members so that no one can mess with internal state.
     */
    toArray() {
        return this._array.slice();
    }
}
export class MappingList {
    /**
     * Determine whether mappingB is after mappingA with respect to generated
     * position.
     */
    static generatedPositionAfter(mappingA, mappingB) {
        // Optimized for most common case
        var lineA = mappingA.generatedLine;
        var lineB = mappingB.generatedLine;
        var columnA = mappingA.generatedColumn;
        var columnB = mappingB.generatedColumn;
        return lineB > lineA || lineB == lineA && columnB >= columnA ||
            util.compareByGeneratedPositions(mappingA, mappingB) <= 0;
    }
    /**
     * A data structure to provide a sorted view of accumulated mappings in a
     * performance conscious manner. It trades a neglibable overhead in general
     * case for a large speedup in case of mappings being added in order.
     */
    constructor() {
        this._array = [];
        this._sorted = true;
        // Serves as infimum
        this._last = {generatedLine: -1, generatedColumn: 0};
    }
    /**
     * Iterate through internal items. This method takes the same arguments that
     * `Array.prototype.forEach` takes.
     *
     * NOTE: The order of the mappings is NOT guaranteed.
     */
    forEach(aCallback, aThisArg) {
        this._array.forEach(aCallback, aThisArg);
    }
    /**
     * Add the given source mapping.
     *
     * @param Object aMapping
     */
    add(aMapping) {
        var mapping;
        if (MappingList.generatedPositionAfter(this._last, aMapping)) {
            this._last = aMapping;
            this._array.push(aMapping);
        } else {
            this._sorted = false;
            this._array.push(aMapping);
        }
    }
    /**
     * Returns the flat, sorted array of mappings. The mappings are sorted by
     * generated position.
     *
     * WARNING: This method returns internal data without copying, for
     * performance. The return value must NOT be mutated, and should be treated as
     * an immutable borrow. If you want to take ownership, you must make your own
     * copy.
     */
    toArray() {
        if (!this._sorted) {
            this._array.sort(util.compareByGeneratedPositions);
            this._sorted = true;
        }
        return this._array;
    }
}
export class B64 {
    static get CHAR_TO_INTS() {
        return this.init('CHAR_TO_INTS');
    }
    static get INT_TO_CHARS() {
        return this.init('INT_TO_CHARS');
    }
    static init(key) {
        Object.defineProperties(this, {
            CHAR_TO_INTS: {value: {}},
            INT_TO_CHARS: {value: {}}
        });
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        .split('').forEach((c, i)=> {
                this['CHAR_TO_INTS'][c] = i;
                this['INT_TO_CHARS'][i] = c;
            });
        return this[key];
    }
    static encode(aNumber) {
        if (aNumber in B64.INT_TO_CHARS) {
            return B64.INT_TO_CHARS[aNumber];
        }
        throw new TypeError("Must be between 0 and 63: " + aNumber);
    }
    static decode(aChar) {
        if (aChar in B64.CHAR_TO_INTS) {
            return B64.CHAR_TO_INTS[aChar];
        }
        throw new TypeError("Not a valid base 64 digit: " + aChar);
    }
}
export class VLQ {

    static get BASE_SHIFT (){
        return 5
    }
    static get BASE_MASK (){
        return 0b011111
    }
    static get BASE_BIT (){
        return 0b100000
    }

    /**
     * Converts from a two-complement value to a value where the sign bit is
     * placed in the least significant bit.  For example, as decimals:
     *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
     *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
     */
    static toVLQSigned(aValue) {
        return aValue < 0
        ? ((-aValue) << 1) + 1
        : (aValue << 1) + 0;
    }
    /**
     * Converts to a two-complement value from a value where the sign bit is
     * placed in the least significant bit.  For example, as decimals:
     *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
     *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
     */
    static fromVLQSigned(aValue) {
        var isNegative = (aValue & 1) === 1;
        var shifted = aValue >> 1;
        return isNegative
        ? -shifted
        : shifted;
    }

    /**
     * Returns the base 64 VLQ encoded value.
     */
    static encode(aValue) {
        var encoded = "";
        var digit;

        var vlq = VLQ.toVLQSigned(aValue);

        do {
            digit = vlq & VLQ.BASE_MASK;
            vlq >>>= VLQ.BASE_SHIFT;
            if (vlq > 0) {
                // There are still more digits in this value, so we must make sure the
                // continuation bit is marked.
                digit |= VLQ.BASE_BIT;
            }
            encoded += B64.encode(digit);
        } while (vlq > 0);

        return encoded;
    }
    /**
     * Decodes the next base 64 VLQ value from the given string and returns the
     * value and the rest of the string via the out parameter.
     */
    static decode(aStr, aOutParam) {
        var i = 0;
        var strLen = aStr.length;
        var result = 0;
        var shift = 0;
        var continuation, digit;

        do {
            if (i >= strLen) {
                throw new Error("Expected more digits in base 64 VLQ value.");
            }
            digit = B64.decode(aStr.charAt(i++));
            continuation = !!(digit & VLQ.BASE_BIT);
            digit &= VLQ.BASE_MASK;
            result = result + (digit << shift);
            shift += VLQ.BASE_SHIFT;
        } while (continuation);

        aOutParam.value = VLQ.fromVLQSigned(result);
        aOutParam.rest = aStr.slice(i);
    }
}