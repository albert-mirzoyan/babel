// Copyright 2012 Traceur Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES Token.OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {Entity} from '../util/Entity';
import {Unicode} from './Unicode';
import {Token} from './Token';

export class Scanner extends Entity {
    constructor(source) {
        super();
        this.set({
            source           : source,
            index            : null,
            char             : null,
            currentToken     : null,
            lastToken        : null,
            lookaheadToken   : null,
            tpl              : 0
        });
        this.index = 0;
    }
    get reporter(){
        return this.source.reporter;
    }
    get options(){
        return this.source.options;
    }
    get parser(){
        return this.$.parser;
    }
    get source():Source{
        return this.$.source;
    }
    get table(){
        return this.source.table;
    }
    get input(){
        return this.source.content;
    }
    get length(){
        return this.source.content.length;
    }
    set index(i) {
        this.$.index = i;
        this.$.lastToken = null;
        this.$.currentToken = null;
        this.updateCurrentCharCode();
    }
    get index() {
        return this.$.index;
    }
    get lastToken() {
        return this.$.lastToken;
    }
    mark(){
        return this.$.marker = this.$.index;
    }

    regexp(value){
        if(value ){
            this.$.regexp = value;
            this.index = this.$.lastToken.range[0];
        }else{
            this.$.regexp = false;
        }
    }
    nextCloseAngle() {
        switch (this.$.currentToken.type) {
            case Token.GREATER_EQUAL:
            case Token.RIGHT_SHIFT:
            case Token.RIGHT_SHIFT_EQUAL:
            case Token.UNSIGNED_RIGHT_SHIFT:
            case Token.UNSIGNED_RIGHT_SHIFT_EQUAL:
                this.index -= this.$.currentToken.type.length - 1;
                this.$.lastToken = this.createToken(Token.CLOSE_ANGLE, this.$.index);
                this.$.currentToken = this.scanToken();
                return this.$.lastToken;
        }
        return this.nextToken();
    }
    nextToken() {
        var t = this.peekToken();
        this.$.lt=false;
        this.$.currentToken = this.scanToken();
        t.lta = this.$.currentToken.ltb =this.$.lt;
        this.$.lastToken = t;
        return t;
    }
    peekToken() {
        return this.$.currentToken || (this.$.currentToken = this.scanToken());
    }
    isAtEnd() {
        return this.isAtEndInternal();
    }

//private functions
    skipRegularExpressionBody() {
        if (!Unicode.isRegExpStartChar(this.$.char)) {
            this.reportError('Expected regular expression first char '+this.$.char);
            return false;
        }

        while (!this.isAtEndInternal() && Unicode.isRegExpPartChar(this.$.char)) {
            if (!this.skipRegularExpressionChar())
                return false;
        }

        return true;
    }
    skipRegularExpressionChar() {
        switch (this.$.char) {
            case 92:  // \
                return this.skipRegularExpressionBackslashSequence();
            case 91:  // [
                return this.skipRegularExpressionClass();
            default:
                this.next();
                return true;
        }
    }
    skipRegularExpressionBackslashSequence() {
        this.next();
        if (Unicode.isLineTerminator(this.$.char) || this.isAtEndInternal()) {
            this.reportError('New line not allowed in regular expression literal');
            return false;
        }
        this.next();
        return true;
    }
    skipRegularExpressionClass() {
        this.next();
        while (!this.isAtEndInternal() && this.peekRegularExpressionClassChar()) {
            if (!this.skipRegularExpressionClassChar()) {
                return false;
            }
        }
        if (this.$.char !== 93) {  // ]
            this.reportError('\']\' expected');
            return false;
        }
        this.next();
        return true;
    }
    peekRegularExpressionClassChar() {
        return this.$.char !== 93 &&  // ]
            !Unicode.isLineTerminator(this.$.char);
    }
    skipRegularExpressionClassChar() {
        if (this.$.char === 92) {  // \
            return this.skipRegularExpressionBackslashSequence();
        }
        this.next();
        return true;
    }
    skipTemplateCharacter() {
        while (!this.isAtEndInternal()) {
            switch (this.$.char) {
                case 96:  // `
                    return;
                case 92:  // \
                    this.skipStringLiteralEscapeSequence();
                    break;
                case 36:  // $
                    var code = this.input.charCodeAt(this.$.index + 1);
                    if (code === 123)  // {
                        return;
                // Fall through.
                default:
                    this.next();
            }
        }
    }
    scanTemplateStart(beginIndex) {
        if (this.isAtEndInternal()) {
            this.reportError('Unterminated template literal');
            return this.$.lastToken = this.createToken(Token.END_OF_FILE, beginIndex);
        }
        return this.nextTemplateLiteralTokenShared(Token.TEMPLATE,Token.TEMPLATE_HEAD);
    }
    nextTemplateLiteralTokenInternal() {
        if (this.isAtEndInternal()) {
            this.reportError('Expected \'}\' after expression in template literal');
            return this.createToken(Token.END_OF_FILE, this.$.index);
        }
        return this.nextTemplateLiteralTokenShared(Token.TEMPLATE_TAIL, Token.TEMPLATE_MIDDLE);
    }
    nextTemplateLiteralTokenShared(endType, middleType) {
        var beginIndex = this.$.index;

        this.skipTemplateCharacter();

        if (this.isAtEndInternal()) {
            this.reportError('Unterminated template literal');
            return this.createToken(Token.ERROR, beginIndex);
        }

        var value = this.getTokenString(beginIndex);

        switch (this.$.char) {
            case  96:  // `
                this.next();
                if(endType==Token.TEMPLATE_TAIL){
                    this.$.tpl--;
                }
                return this.$.lastToken = this.createToken(endType, beginIndex-1);
            case 36:  // $
                this.next();  // $
                this.next();  // {
                if(middleType==Token.TEMPLATE_HEAD){
                    this.$.tpl++;
                }
                return this.$.lastToken = this.createToken(middleType, beginIndex-1);
        }
    }

    skipWhitespace() {
        while (!this.isAtEndInternal() && this.peekWhitespace()) {
            this.next();
        }
    }
    peekWhitespace() {
        if(Unicode.isWhitespace(this.$.char)){
            return true;
        }else
        if(Unicode.isLineTerminator(this.$.char)){
            this.$.lt = true;
            return true;
        }
    }
    skipComments() {
        while (this.skipComment()) {
        }
    }
    skipComment() {
        this.skipWhitespace();
        var code = this.$.char;
        if (code === 47) {  // /
            code = this.input.charCodeAt(this.$.index + 1);
            switch (code) {
                case 47:  // /
                    this.skipSingleLineComment();
                    return true;
                case 42:  // *
                    this.skipMultiLineComment();
                    return true;
            }
        }
        return false;
    }
    skipSingleLineComment() {
        var start = this.$.index;
        // skip '//'
        this.$.index += 2;
        while (!this.isAtEndInternal() && !Unicode.isLineTerminator(this.input.charCodeAt(this.$.index++))) {
        }
        this.updateCurrentCharCode();
        this.$.lt = true;
        this.commentCallback(start, this.$.index);
    }
    skipMultiLineComment() {
        var start = this.$.index;
        var i = this.input.indexOf('*/', this.$.index + 2);
        if (i !== -1)
            this.$.index = i + 2;
        else
            this.$.index = this.length;
        this.updateCurrentCharCode();
        this.commentCallback(start, this.$.index);
    }
    commentCallback(start, index) {
        if (this.options.commentCallback && this.parser.handleComment){
            this.parser.handleComment(this.table.getSourceRange(start, index));
        }
    }
    scanToken() {
        this.skipComments();
        var beginIndex = this.mark();

        if (this.isAtEndInternal())
            return this.createToken(Token.END_OF_FILE, beginIndex);
        var code = this.$.char;
        this.next();
        switch (code) {
            case 123:  // {
                return this.createToken(Token.OPEN_CURLY, beginIndex);
            case 125:  // }
                if(this.$.tpl>0){
                    return this.nextTemplateLiteralTokenInternal();
                }
                return this.createToken(Token.CLOSE_CURLY, beginIndex);
            case 40:  // (
                return Token.OPEN_PAREN.new(this);
            case 41:  // )
                return this.createToken(Token.CLOSE_PAREN, beginIndex);
            case 91:  // [
                return this.createToken(Token.OPEN_SQUARE, beginIndex);
            case 93:  // ]
                return this.createToken(Token.CLOSE_SQUARE, beginIndex);
            case 46:  // .
                switch (this.$.char) {
                    case 46:  // .
                        // Harmony spread operator
                        if (this.input.charCodeAt(this.$.index + 1) === 46) {
                            this.next();
                            this.next();
                            return this.createToken(Token.DOT_DOT_DOT, beginIndex);
                        }
                        break;
                    default:
                        if (Unicode.isDecimalDigit(this.$.char))
                            return this.scanNumberPostPeriod(beginIndex);
                }

                return this.createToken(Token.PERIOD, beginIndex);
            case 59:  // ;
                return this.createToken(Token.SEMI_COLON, beginIndex);
            case 44:  // ,
                return this.createToken(Token.COMMA, beginIndex);
            case 126:  // ~
                return this.createToken(Token.TILDE, beginIndex);
            case 63:  // ?
                return this.createToken(Token.QUESTION, beginIndex);
            case 58:  // :
                return this.createToken(Token.COLON, beginIndex);
            case 60:  // <
                switch (this.$.char) {
                    case 60:  // <
                        this.next();
                        if (this.$.char === 61) {  // =
                            this.next();
                            return this.createToken(Token.LEFT_SHIFT_EQUAL, beginIndex);
                        }
                        return this.createToken(Token.LEFT_SHIFT, beginIndex);
                    case 61:  // =
                        this.next();
                        return this.createToken(Token.LESS_EQUAL, beginIndex);
                    default:
                        return this.createToken(Token.OPEN_ANGLE, beginIndex);
                }
            case 62:  // >
                switch (this.$.char) {
                    case 62:  // >
                        this.next();
                        switch (this.$.char) {
                            case 61:  // =
                                this.next();
                                return this.createToken(Token.RIGHT_SHIFT_EQUAL, beginIndex);
                            case 62:  // >
                                this.next();
                                if (this.$.char === 61) { // =
                                    this.next();
                                    return this.createToken(
                                        Token.UNSIGNED_RIGHT_SHIFT_EQUAL, beginIndex);
                                }
                                return this.createToken(Token.UNSIGNED_RIGHT_SHIFT, beginIndex);
                            default:
                                return this.createToken(Token.RIGHT_SHIFT, beginIndex);
                        }
                    case 61:  // =
                        this.next();
                        return this.createToken(Token.GREATER_EQUAL, beginIndex);
                    default:
                        return this.createToken(Token.CLOSE_ANGLE, beginIndex);
                }
            case 61:  // =
                if (this.$.char === 61) {  // =
                    this.next();
                    if (this.$.char === 61) {  // =
                        this.next();
                        return this.createToken(Token.EQUAL_EQUAL_EQUAL, beginIndex);
                    }
                    return this.createToken(Token.EQUAL_EQUAL, beginIndex);
                }
                if (this.$.char === 62 && this.options.arrowFunctions) {  // >
                    this.next();
                    return this.createToken(Token.ARROW, beginIndex);
                }
                return this.createToken(Token.EQUAL, beginIndex);
            case 33:  // !
                if (this.$.char === 61) {  // =
                    this.next();
                    if (this.$.char === 61) {  // =
                        this.next();
                        return this.createToken(Token.NOT_EQUAL_EQUAL, beginIndex);
                    }
                    return this.createToken(Token.NOT_EQUAL, beginIndex);
                }
                return this.createToken(Token.BANG, beginIndex);
            case 42:  // *
                if (this.$.char === 61) {  // =
                    this.next();
                    return this.createToken(Token.STAR_EQUAL, beginIndex);
                }
                if (this.$.char === 42 && this.options.exponentiation) {
                    this.next();
                    if (this.$.char === 61) {  // =
                        this.next();
                        return this.createToken(Token.STAR_STAR_EQUAL, beginIndex);
                    }
                    return this.createToken(Token.STAR_STAR, beginIndex);
                }
                return this.createToken(Token.STAR, beginIndex);
            case 37:  // %
                if (this.$.char === 61) {  // =
                    this.next();
                    return this.createToken(Token.PERCENT_EQUAL, beginIndex);
                }
                return this.createToken(Token.PERCENT, beginIndex);
            case 94:  // ^
                if (this.$.char === 61) {  // =
                    this.next();
                    return this.createToken(Token.CARET_EQUAL, beginIndex);
                }
                return this.createToken(Token.CARET, beginIndex);
            case 47:  // /
                if(this.$.regexp){
                    return this.scanRegexp(beginIndex)
                }else{
                    if (this.$.char === 61) {  // =
                        this.next();
                        return this.createToken(Token.SLASH_EQUAL, beginIndex);
                    }
                    return this.createToken(Token.SLASH, beginIndex);
                }
            case 43:  // +
                switch (this.$.char) {
                    case 43:  // +
                        this.next();
                        return this.createToken(Token.PLUS_PLUS, beginIndex);
                    case 61: // =:
                        this.next();
                        return this.createToken(Token.PLUS_EQUAL, beginIndex);
                    default:
                        return this.createToken(Token.PLUS, beginIndex);
                }
            case 45:  // -
                switch (this.$.char) {
                    case 45: // -
                        this.next();
                        return this.createToken(Token.MINUS_MINUS, beginIndex);
                    case 61:  // =
                        this.next();
                        return this.createToken(Token.MINUS_EQUAL, beginIndex);
                    default:
                        return this.createToken(Token.MINUS, beginIndex);
                }
            case 38:  // &
                switch (this.$.char) {
                    case 38:  // &
                        this.next();
                        return this.createToken(Token.AND, beginIndex);
                    case 61:  // =
                        this.next();
                        return this.createToken(Token.AMPERSAND_EQUAL, beginIndex);
                    default:
                        return this.createToken(Token.AMPERSAND, beginIndex);
                }
            case 124:  // |
                switch (this.$.char) {
                    case 124:  // |
                        this.next();
                        return this.createToken(Token.OR, beginIndex);
                    case 61:  // =
                        this.next();
                        return this.createToken(Token.BAR_EQUAL, beginIndex);
                    default:
                        return this.createToken(Token.BAR, beginIndex);
                }
            case 96:  // `
                return this.scanTemplateStart(beginIndex);
            case 64:  // @
                return this.createToken(Token.AT, beginIndex);

            // TODO: add NumberToken
            // TODO: character following NumericLiteral must not be an
            //       IdentifierStart or DecimalDigit
            case 48:  // 0
                return this.scanPostZero(beginIndex);
            case 49:  // 1
            case 50:  // 2
            case 51:  // 3
            case 52:  // 4
            case 53:  // 5
            case 54:  // 6
            case 55:  // 7
            case 56:  // 8
            case 57:  // 9
                return this.scanPostDigit(beginIndex);
            case 34:  // "
            case 39:  // '
                return this.scanStringLiteral(beginIndex, code);
            default:
                return this.scanIdentifierOrKeyword(beginIndex, code);
        }
    }
    scanRegexp(beginIndex){
        this.skipRegularExpressionBody();
        if (this.$.char !== 47) {  // /
            //this.reportError(`Expected '/' in regular expression literal got '${this.getTokenString(beginIndex)}'`);
            return this.createToken(Token.REGEXP, beginIndex)
        }
        this.next();

        // flags (note: this supports future regular expression flags)
        while (Unicode.isIdPartChar(this.$.char)) {
            this.next();
        }
        var token = this.createToken(Token.REGEXP,beginIndex);
        this.$.regexp = false;
        return token;
    }
    scanNumberPostPeriod(beginIndex) {
        this.skipDecimalDigits();
        return this.scanExponentOfNumericLiteral(beginIndex);
    }
    scanPostDigit(beginIndex) {
        this.skipDecimalDigits();
        return this.scanFractionalNumericLiteral(beginIndex);
    }
    scanPostZero(beginIndex) {
        switch (this.$.char) {
            case 46:  // .
                return this.scanFractionalNumericLiteral(beginIndex);

            case 88:  // X
            case 120:  // x
                this.next();
                if (!Unicode.isHexDigit(this.$.char)) {
                    this.reportError('Hex Integer Literal must contain at least one digit');
                }
                this.skipHexDigits();
                return this.createToken(Token.NUMBER, beginIndex);

            case 66:  // B
            case 98:  // b
                if (!this.options.numericLiterals)
                    break;

                this.next();
                if (!Unicode.isBinaryDigit(this.$.char)) {
                    this.reportError('Binary Integer Literal must contain at least one digit');
                }
                this.skipBinaryDigits();
                return  this.createToken(Token.NUMBER, beginIndex);

            case 79:  // O
            case 111:  // o
                if (!this.options.numericLiterals)
                    break;

                this.next();
                if (!Unicode.isOctalDigit(this.$.char)) {
                    this.reportError('Octal Integer Literal must contain at least one digit');
                }
                this.skipOctalDigits();
                return this.createToken(Token.NUMBER, beginIndex);

            case 48:  // 0
            case 49:  // 1
            case 50:  // 2
            case 51:  // 3
            case 52:  // 4
            case 53:  // 5
            case 54:  // 6
            case 55:  // 7
            case 56:  // 8
            case 57:  // 9
                return this.scanPostDigit(beginIndex);
        }

        return  this.createToken(Token.NUMBER, beginIndex);
    }
    createToken(type,index) {
        return new Token({
            type        : type,
            source      : this.source,
            range       : [index,this.$.index]
        });
    }
    readUnicodeEscapeSequence() {
        var beginIndex = this.$.index;
        if (this.$.char === 117) {  // u
            this.next();
            if (this.skipHexDigit() && this.skipHexDigit() &&
                this.skipHexDigit() && this.skipHexDigit()) {
                return parseInt(this.getTokenString(beginIndex + 1), 16);
            }
        }

        this.reportError('Invalid unicode escape sequence in identifier', beginIndex - 1);

        return 0;
    }
    scanIdentifierOrKeyword(beginIndex, code) {
        // Keep track of any unicode escape sequences.
        var escapedCharCodes;
        if (code === 92) {  // \
            code = this.readUnicodeEscapeSequence();
            escapedCharCodes = [code];
        }

        if (!Unicode.isIdStartChar(code)) {
            this.reportError(
                `Character code '${code}' is not a valid identifier start char`,
                beginIndex);
            return this.createToken(Token.ERROR, beginIndex);
        }

        for (;;) {
            code = this.$.char;
            if (Unicode.isIdPartChar(code)) {
                this.next();
            } else if (code === 92) {  // \
                this.next();
                code = this.readUnicodeEscapeSequence();
                if (!escapedCharCodes) {
                    escapedCharCodes = [];
                }
                escapedCharCodes.push(code);
                if (!Unicode.isIdPartChar(code))
                    return this.createToken(Token.ERROR, beginIndex);
            } else {
                break;
            }
        }

        var value = this.input.slice(beginIndex, this.$.index);
        if (Token.isKeyword(value)) {
            return this.createToken(Token.isKeyword(value),beginIndex,value);
        }
        if (escapedCharCodes) {
            var i = 0;
            value = value.replace(/\\u..../g, function (s) {
                return String.fromCharCode(escapedCharCodes[i++]);
            });
        }
        return this.createToken(Token.IDENTIFIER,beginIndex);
    }
    scanStringLiteral(beginIndex, terminator) {
        while (this.peekStringLiteralChar(terminator)) {
            if (!this.skipStringLiteralChar()) {
                return  this.createToken(Token.STRING, beginIndex);
            }
        }
        if (this.$.char !== terminator) {
            this.reportError('Unterminated String Literal', beginIndex);
        } else {
            this.next();
        }
        return this.createToken(Token.STRING, beginIndex);
    }
    getTokenString(beginIndex) {
        return this.input.substring(beginIndex, this.$.index);
    }
    peekStringLiteralChar(terminator) {
        return !this.isAtEndInternal() && this.$.char !== terminator && !Unicode.isLineTerminator(this.$.char);
    }
    skipStringLiteralChar() {
        if (this.$.char === 92) {
            return this.skipStringLiteralEscapeSequence();
        }
        this.next();
        return true;
    }
    skipStringLiteralEscapeSequence() {
        this.next(); // \
        if (this.isAtEndInternal()) {
            this.reportError('Unterminated string literal escape sequence');
            return false;
        }

        if (Unicode.isLineTerminator(this.$.char)) {
            this.skipLineTerminator();
            return true;
        }

        var code = this.$.char;
        this.next();
        switch (code) {
            case 39:  // '
            case 34:  // "
            case 92:  // \
            case 98:  // b
            case 102:  // f
            case 110:  // n
            case 114:  // r
            case 116:  // t
            case 118:  // v
            case 48:  // 0
                return true;
            case 120:  // x
                return this.skipHexDigit() && this.skipHexDigit();
            case 117:  // u
                return this.skipUnicodeEscapeSequence();
            default:
                return true;
        }
    }
    skipUnicodeEscapeSequence() {
        if (this.$.char === 123 && this.options.unicodeEscapeSequences) {  // {
            this.next();
            var beginIndex = this.$.index;

            if (!Unicode.isHexDigit(this.$.char)) {
                this.reportError('Hex digit expected');
                return false;
            }

            this.skipHexDigits();

            if (this.$.char !== 125) {  // }
                this.reportError('Hex digit expected');
                return false;
            }

            var codePoint = this.getTokenString(beginIndex, this.$.index);
            if (parseInt(codePoint, 16) > 0x10FFFF) { // 11.8.4.1
                this.reportError('The code point in a Unicode escape sequence cannot exceed 10FFFF');
                return false;
            }

            this.next();
            return true;
        }
        return this.skipHexDigit() && this.skipHexDigit() &&
            this.skipHexDigit() && this.skipHexDigit();
    }
    skipHexDigit() {
        if (!Unicode.isHexDigit(this.$.char)) {
            this.reportError('Hex digit expected');
            return false;
        }
        this.next();
        return true;
    }
    skipLineTerminator() {
        var first = this.$.char;
        this.next();
        if (first === 13 && this.$.char === 10) {  // \r and \n
            this.next();
        }
    }
    scanFractionalNumericLiteral(beginIndex) {
        if (this.$.char === 46) {  // .
            this.next();
            this.skipDecimalDigits();
        }
        return this.scanExponentOfNumericLiteral(beginIndex);
    }
    scanExponentOfNumericLiteral(beginIndex) {
        switch (this.$.char) {
            case 101:  // e
            case 69:  // E
                this.next();
                switch (this.$.char) {
                    case 43:  // +
                    case 45:  // -
                        this.next();
                        break;
                }
                if (!Unicode.isDecimalDigit(this.$.char)) {
                    this.reportError('Exponent part must contain at least one digit');
                }
                this.skipDecimalDigits();
                break;
            default:
                break;
        }
        return this.createToken(Token.NUMBER, beginIndex);
    }
    skipDecimalDigits() {
        while (Unicode.isDecimalDigit(this.$.char)) {
            this.next();
        }
    }
    skipHexDigits() {
        while (Unicode.isHexDigit(this.$.char)) {
            this.next();
        }
    }
    skipBinaryDigits() {
        while (Unicode.isBinaryDigit(this.$.char)) {
            this.next();
        }
    }
    skipOctalDigits() {
        while (Unicode.isOctalDigit(this.$.char)) {
            this.next();
        }
    }
    isAtEndInternal() {
        return this.$.index === this.length;
    }
    next() {
        this.$.index++;
        this.updateCurrentCharCode();
    }
    updateCurrentCharCode() {
        this.$.char = this.input.charCodeAt(this.$.index);
    }
    reportError(message, indexArg) {
        throw new Error(message)
    }
}