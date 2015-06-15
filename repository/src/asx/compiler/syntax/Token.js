import {Entity} from '../util/Entity';
import {ValueParser} from '../util/ValueParser';


export class Token extends Entity {
    //<editor-fold desc="Tokens">
    static AS                         :TokenType;
    static ASYNC                      :TokenType;
    static AWAIT                      :TokenType;
    static BREAK                      :TokenType;
    static CASE                       :TokenType;
    static CATCH                      :TokenType;
    static CLASS                      :TokenType;
    static CONST                      :TokenType;
    static CONSTRUCTOR                :TokenType;
    static CONTINUE                   :TokenType;
    static DEBUGGER                   :TokenType;
    static DEFAULT                    :TokenType;
    static DELETE                     :TokenType;
    static DO                         :TokenType;
    static ELSE                       :TokenType;
    static ENUM                       :TokenType;
    static EXPORT                     :TokenType;
    static EXTENDS                    :TokenType;
    static FALSE                      :TokenType;
    static FINALLY                    :TokenType;
    static FOR                        :TokenType;
    static FROM                       :TokenType;
    static FUNCTION                   :TokenType;
    static GET                        :TokenType;
    static IF                         :TokenType;
    static IMPLEMENTS                 :TokenType;
    static IMPORT                     :TokenType;
    static IN                         :TokenType;
    static INSTANCEOF                 :TokenType;
    static INTERFACE                  :TokenType;
    static LET                        :TokenType;
    static NAN                        :TokenType;
    static NEW                        :TokenType;
    static NULL                       :TokenType;
    static OF                         :TokenType;
    static PACKAGE                    :TokenType;
    static PRIVATE                    :TokenType;
    static PROTECTED                  :TokenType;
    static PUBLIC                     :TokenType;
    static RETURN                     :TokenType;
    static SET                        :TokenType;
    static STATIC                     :TokenType;
    static SUPER                      :TokenType;
    static SWITCH                     :TokenType;
    static THIS                       :TokenType;
    static THROW                      :TokenType;
    static TRAIT                      :TokenType;
    static TRUE                       :TokenType;
    static TRY                        :TokenType;
    static TYPEOF                     :TokenType;
    static UNDEFINED                  :TokenType;
    static VAR                        :TokenType;
    static VOID                       :TokenType;
    static WHILE                      :TokenType;
    static WITH                       :TokenType;
    static YIELD                      :TokenType;
    static AMPERSAND                  :TokenType;
    static AMPERSAND_EQUAL            :TokenType;
    static AND                        :TokenType;
    static ARROW                      :TokenType;
    static AT                         :TokenType;
    static BACK_QUOTE                 :TokenType;
    static BANG                       :TokenType;
    static BAR                        :TokenType;
    static BAR_EQUAL                  :TokenType;
    static CARET                      :TokenType;
    static CARET_EQUAL                :TokenType;
    static CLOSE_ANGLE                :TokenType;
    static CLOSE_CURLY                :TokenType;
    static CLOSE_PAREN                :TokenType;
    static CLOSE_SQUARE               :TokenType;
    static COLON                      :TokenType;
    static COMMA                      :TokenType;
    static DOT_DOT_DOT                :TokenType;
    static EQUAL                      :TokenType;
    static EQUAL_EQUAL                :TokenType;
    static EQUAL_EQUAL_EQUAL          :TokenType;
    static GREATER_EQUAL              :TokenType;
    static LEFT_SHIFT                 :TokenType;
    static LEFT_SHIFT_EQUAL           :TokenType;
    static LESS_EQUAL                 :TokenType;
    static MINUS                      :TokenType;
    static MINUS_EQUAL                :TokenType;
    static MINUS_MINUS                :TokenType;
    static NOT_EQUAL                  :TokenType;
    static NOT_EQUAL_EQUAL            :TokenType;
    static OPEN_ANGLE                 :TokenType;
    static OPEN_CURLY                 :TokenType;
    static OPEN_PAREN                 :TokenType;
    static OPEN_SQUARE                :TokenType;
    static OR                         :TokenType;
    static PERCENT                    :TokenType;
    static PERCENT_EQUAL              :TokenType;
    static PERIOD                     :TokenType;
    static PLUS                       :TokenType;
    static PLUS_EQUAL                 :TokenType;
    static PLUS_PLUS                  :TokenType;
    static QUESTION                   :TokenType;
    static RIGHT_SHIFT                :TokenType;
    static RIGHT_SHIFT_EQUAL          :TokenType;
    static SEMI_COLON                 :TokenType;
    static SLASH                      :TokenType;
    static SLASH_EQUAL                :TokenType;
    static STAR                       :TokenType;
    static STAR_EQUAL                 :TokenType;
    static STAR_STAR                  :TokenType;
    static STAR_STAR_EQUAL            :TokenType;
    static TILDE                      :TokenType;
    static UNSIGNED_RIGHT_SHIFT       :TokenType;
    static UNSIGNED_RIGHT_SHIFT_EQUAL :TokenType;
    static END_OF_FILE                :TokenType;
    static ERROR                      :TokenType;
    static IDENTIFIER                 :TokenType;
    static NUMBER                     :TokenType;
    static REGEXP                     :TokenType;
    static STRING                     :TokenType;
    static TEMPLATE                   :TokenType;
    static TEMPLATE_HEAD              :TokenType;
    static TEMPLATE_MIDDLE            :TokenType;
    static TEMPLATE_TAIL              :TokenType;
    static WS                         :TokenType;
    static NL                         :TokenType;
    //</editor-fold>
    static init(){
        Token.KEYWORDS = {};
        [
            [1, 'AS'                          ,'as'                 ],
            [1, 'ASYNC'                       ,'async'              ],
            [1, 'AWAIT'                       ,'await'              ],
            [1, 'BREAK'                       ,'break'              ],
            [1, 'CASE'                        ,'case'               ],
            [1, 'CATCH'                       ,'catch'              ],
            [1, 'CLASS'                       ,'class'              ],
            [1, 'CONST'                       ,'const'              ],
            [1, 'CONSTRUCTOR'                 ,'constructor'        ],
            [1, 'CONTINUE'                    ,'continue'           ],
            [1, 'DEBUGGER'                    ,'debugger'           ],
            [1, 'DEFAULT'                     ,'default'            ],
            [1, 'DELETE'                      ,'delete'             ],
            [1, 'DO'                          ,'do'                 ],
            [1, 'ELSE'                        ,'else'               ],
            [1, 'ENUM'                        ,'enum'               ],
            [1, 'EXPORT'                      ,'export'             ],
            [1, 'EXTENDS'                     ,'extends'            ],
            [1, 'FALSE'                       ,'false'              ],
            [1, 'FINALLY'                     ,'finally'            ],
            [1, 'FOR'                         ,'for'                ],
            [1, 'FROM'                        ,'from'               ],
            [1, 'FUNCTION'                    ,'function'           ],
            [1, 'GET'                         ,'get'                ],
            [1, 'IF'                          ,'if'                 ],
            [1, 'IMPLEMENTS'                  ,'implements'         ],
            [1, 'IMPORT'                      ,'import'             ],
            [1, 'IN'                          ,'in'                 ],
            [1, 'INSTANCEOF'                  ,'instanceof'         ],
            [1, 'INTERFACE'                   ,'interface'          ],
            [1, 'LET'                         ,'let'                ],
            [1, 'NAN'                         ,'NaN'                ],
            [1, 'NEW'                         ,'new'                ],
            [1, 'NULL'                        ,'null'               ],
            [1, 'OF'                          ,'of'                 ],
            [1, 'PACKAGE'                     ,'package'            ],
            [1, 'PRIVATE'                     ,'private'            ],
            [1, 'PROTECTED'                   ,'protected'          ],
            [1, 'PUBLIC'                      ,'public'             ],
            [1, 'RETURN'                      ,'return'             ],
            [1, 'SET'                         ,'set'                ],
            [1, 'STATIC'                      ,'static'             ],
            [1, 'SUPER'                       ,'super'              ],
            [1, 'SWITCH'                      ,'switch'             ],
            [1, 'THIS'                        ,'this'               ],
            [1, 'THROW'                       ,'throw'              ],
            [1, 'TRAIT'                       ,'trait'              ],
            [1, 'TRUE'                        ,'true'               ],
            [1, 'TRY'                         ,'try'                ],
            [1, 'TYPEOF'                      ,'typeof'             ],
            [1, 'UNDEFINED'                   ,'undefined'          ],
            [1, 'VAR'                         ,'var'                ],
            [1, 'VOID'                        ,'void'               ],
            [1, 'WHILE'                       ,'while'              ],
            [1, 'WITH'                        ,'with'               ],
            [1, 'YIELD'                       ,'yield'              ],
            [2, 'AMPERSAND'                   , '&'                 ],
            [2, 'AMPERSAND_EQUAL'             , '&='                ],
            [2, 'AND'                         , '&&'                ],
            [2, 'ARROW'                       , '=>'                ],
            [2, 'AT'                          , '@'                 ],
            [2, 'BACK_QUOTE'                  , '`'                 ],
            [2, 'BANG'                        , '!'                 ],
            [2, 'BAR'                         , '|'                 ],
            [2, 'BAR_EQUAL'                   , '|='                ],
            [2, 'CARET'                       , '^'                 ],
            [2, 'CARET_EQUAL'                 , '^='                ],
            [2, 'CLOSE_ANGLE'                 , '>'                 ],
            [2, 'CLOSE_CURLY'                 , '}'                 ],
            [2, 'CLOSE_PAREN'                 , ')'                 ],
            [2, 'CLOSE_SQUARE'                , ']'                 ],
            [2, 'COLON'                       , ':'                 ],
            [2, 'COMMA'                       , ','                 ],
            [2, 'DOT_DOT_DOT'                 , '...'               ],
            [2, 'EQUAL'                       , '='                 ],
            [2, 'EQUAL_EQUAL'                 , '=='                ],
            [2, 'EQUAL_EQUAL_EQUAL'           , '==='               ],
            [2, 'GREATER_EQUAL'               , '>='                ],
            [2, 'LEFT_SHIFT'                  , '<<'                ],
            [2, 'LEFT_SHIFT_EQUAL'            , '<<='               ],
            [2, 'LESS_EQUAL'                  , '<='                ],
            [2, 'MINUS'                       , '-'                 ],
            [2, 'MINUS_EQUAL'                 , '-='                ],
            [2, 'MINUS_MINUS'                 , '--'                ],
            [2, 'NOT_EQUAL'                   , '!='                ],
            [2, 'NOT_EQUAL_EQUAL'             , '!=='               ],
            [2, 'OPEN_ANGLE'                  , '<'                 ],
            [2, 'OPEN_CURLY'                  , '{'                 ],
            [2, 'OPEN_PAREN'                  , '('                 ],
            [2, 'OPEN_SQUARE'                 , '['                 ],
            [2, 'OR'                          , '||'                ],
            [2, 'PERCENT'                     , '%'                 ],
            [2, 'PERCENT_EQUAL'               , '%='                ],
            [2, 'PERIOD'                      , '.'                 ],
            [2, 'PLUS'                        , '+'                 ],
            [2, 'PLUS_EQUAL'                  , '+='                ],
            [2, 'PLUS_PLUS'                   , '++'                ],
            [2, 'QUESTION'                    , '?'                 ],
            [2, 'RIGHT_SHIFT'                 , '>>'                ],
            [2, 'RIGHT_SHIFT_EQUAL'           , '>>='               ],
            [2, 'SEMI_COLON'                  , ';'                 ],
            [2, 'SLASH'                       , '/'                 ],
            [2, 'SLASH_EQUAL'                 , '/='                ],
            [2, 'STAR'                        , '*'                 ],
            [2, 'STAR_EQUAL'                  , '*='                ],
            [2, 'STAR_STAR'                   , '**'                ],
            [2, 'STAR_STAR_EQUAL'             , '**='               ],
            [2, 'TILDE'                       , '«~»'               ],
            [2, 'UNSIGNED_RIGHT_SHIFT'        , '«>>>»'             ],
            [2, 'UNSIGNED_RIGHT_SHIFT_EQUAL'  , '«>>>=»'            ],
            [3, 'NUMBER'                      , '«number»'          ],
            [3, 'REGEXP'                      , '«regexp»'          ],
            [3, 'STRING'                      , '«string»'          ],
            [3, 'TEMPLATE'                    , '«template»'        ],
            [3, 'TEMPLATE_HEAD'               , '«template-head»'   ],
            [3, 'TEMPLATE_MIDDLE'             , '«template-middle»' ],
            [3, 'TEMPLATE_TAIL'               , '«template-tail»'   ],
            [3, 'IDENTIFIER'                  , '«identifier»'      ],
            [4, 'END_OF_FILE'                 , '«eof»'             ],
            [4, 'ERROR'                       , '«error»'           ],
            [4, 'WS'                          , ' '                 ],
            [4, 'NL'                          , '\n'                ]
        ].forEach((type)=> {
            type = new TokenType(...type)
            Token[type.name]=type;
            if(type.type == 1) {
                Token.KEYWORDS['$'+type.text] = type;
            }
        });
    }
    static isKeyword(type) {
        return Token.KEYWORDS['$'+type];
    }
    get lta() {
        return this.$.lta;
    }
    set lta(v) {
        this.$.lta = v;
    }
    get ltb() {
        return this.$.ltb;
    }
    set ltb(v) {
        this.$.ltb = v;
    }
    get range() {
        return this.$.range;
    }
    get source():Source {
        return this.$.source;
    }
    get name() {
        return this.type.name
    }
    get type() {
        return this.$.type
    }
    get text() {
        Object.defineProperty(this, 'text', {
            value: this.source.content.substring(
                this.range[0],
                this.range[1]
            )
        });
        return this.text;
    }
    get location() {
        if (!this.$.location) {
            this.$.location = this.source.getLocation(...this.range)
        }
        return this.$.location;
    }
    get value() {
        switch (this.type) {
            case Token.NULL                :
                return null;
            case Token.TRUE                :
                return true;
            case Token.FALSE               :
                return false;
            case Token.REGEXP  :
                return ValueParser.parseRegExp(this.text);
            case Token.NUMBER              :
                return ValueParser.parseNumber(this.text);
            case Token.STRING              :
                return ValueParser.parseString(this.text);
            case Token.IDENTIFIER              :
                return this.text;
            default                             :
                throw new Error('not a literal');
        }
    }
    constructor(settings){
        super(settings);
        if(!(this.type instanceof TokenType)){
            throw new Error('not a token type')
        }
    }
    inspect() {
        return this.toString();
    }
    toString() {
        return this.toXML();
    }
    toXML(l = 0, pl = false) {
        var tab = Entity.repeat(l);
        var sLoc = `${this.location.start.line}:${this.location.start.column}`;
        var eLoc = `${this.location.end.line}:${this.location.end.column}`;
        var lt = `lt="${this.ltb ? 'y' : 'n'}${this.lta ? 'y' : 'n'}"`;
        var loc = pl ? ` ${lt} pos="${this.range.join('-')}" loc="${sLoc}-${eLoc}"` : '';

        return `${tab}<${this.name}${loc} text=${JSON.stringify(this.text)}/>`
    }
}
export class TokenType {
    constructor(type, name, text) {
        this.type = type;
        this.name = name;
        this.text = text;
    }

    create(scanner) {
        return new Token({
            type: this,
            source: scanner.source,
            range: [scanner.$.marker, scanner.$.index]
        })
    }
    inspect(){
        return this.toString();
    }
    toString(){
        return this.name;
    }
}

Token.init();