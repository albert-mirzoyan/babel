class StringParser {
    /**
     * @param {string} value
     */
    constructor(value) {
        this.value = value;
        this.index = 0;  // value is wrapped in " or '
    }

    [Symbol.iterator]() {
        return this;
    }

    next() {
        if (++this.index >= this.value.length - 1)
            return {value: undefined, done: true};

        return {value: this.value[this.index], done: false};
    }
    parse() {
        // If there are no escape sequences we can just return the contents of the
        // string.
        if (this.value.indexOf('\\') === -1)
            return this.value.slice(1, -1);

        var result = '';

        for (var ch of this) {
            result += ch === '\\' ? this.parseEscapeSequence() : ch;
        }

        return result;
    }

    parseEscapeSequence() {
        var ch = this.next().value;
        switch (ch) {
            case '\n':  // <LF>
            case '\r':  // <CR>
            case '\u2028':  // <LS>
            case '\u2029':  // <PS>
                return '';
            case '0':
                return '\0';
            case 'b':
                return '\b';
            case 'f':
                return '\f';
            case 'n':
                return '\n';
            case 'r':
                return '\r';
            case 't':
                return '\t';
            case 'v':
                return '\v';
            case 'x':
                // 2 hex digits
                return String.fromCharCode(parseInt(this.next().value + this.next().value, 16));
            case 'u':
                var nextValue = this.next().value;
                if (nextValue === '{') {
                    var hexDigits = '';
                    while ((nextValue = this.next().value) !== '}') {
                        hexDigits += nextValue;
                    }
                    var codePoint = parseInt(hexDigits, 16);
                    if (codePoint <= 0xFFFF) {
                        return String.fromCharCode(codePoint);
                    }
                    var high = Math.floor((codePoint - 0x10000) / 0x400) + 0xD800;
                    var low = (codePoint - 0x10000) % 0x400 + 0xDC00;
                    return String.fromCharCode(high, low);
                }
                // 4 hex digits
                return String.fromCharCode(parseInt(nextValue + this.next().value +
                this.next().value + this.next().value, 16));

            default:
                if (Number(ch) < 8)
                    throw new Error('Octal literals are not supported');
                return ch;
        }
    }
}

export class ValueParser {
    static parseString(value){
        var parser = new StringParser(value);
        return parser.parse();
    }
    static parseNumber(value){
        if (value.charCodeAt(0) === 48) {  // 0
            switch (value.charCodeAt(1)) {
                case 66:  // B
                case 98:  // b
                    return parseInt(value.slice(2), 2);
                case 79:  // O
                case 111:  // o
                    return parseInt(value.slice(2), 8);
            }
        }
        return Number(value);
    }
    static parseRegExp(value){
        return new RegExp(value)
    }
}