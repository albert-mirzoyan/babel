import {Entity} from '../util/Entity';
import {Options} from '../Options';
import {Scanner} from './Scanner';
import {Token} from './Token';
import {Ast} from './Ast';
import {JST} from './JST';
import {Builder} from './Builder';
export {Parser}
class Parser extends Entity {
    static parse(source):Boolean{
        var parser = new Parser(source);
        source.ast = parser.parse();
        source.ast.source = source;
        return source;
    }
    //<editor-fold desc="General">
    get options ():Options{
        return this.source.options;
    }
    get source  ():Source{
        return this.$.source;
    }
    get builder ():Builder{
        return this.$.builder;
    }
    constructor(source) {
        super();
        this.set('source',source);
        this.set('builder',new Builder(this))
    }
    get token():Token{
        return this.builder.token;
    }
    error(message){
        throw new Error(message);
    }
    is(type:Function):Boolean{
        return this.token.type==type;
    }
    isIn(...types:Function):Boolean{
        for(var type of types){
            if(this.token.type==type){
                return true
            }
        }
        return false;
    }
    isSemi(){
        switch (this.token.type) {
            case Token.SEMI_COLON  :
            case Token.END_OF_FILE :
            case Token.CLOSE_CURLY : return true;
            default                     : return this.token.ltb;
        }
    }
    eat(type:Function):Marker{
        if(this.is(type)){
            return this.builder.eat(type);
        }
        this.error(`Expected token '${type}' but got token '${this.token.type}'`)
    }
    eatAny(...types:Function):Marker{
        for(var type of types){
            if(this.is(type)){
                return this.eat(type);
            }
        }
        this.error(`Expected tokens are [${type.map((a)=>a.type).join(',')}] but got token ${this.token.type}`)
    }
    eatIf(type:Function){
        if(this.is(type)){
            this.eat(type);
            return true;
        }else{
            return false;
        }
    }
    eatIfAny(...types:Function):Marker{
        for(var type of types){
            if(this.is(type)){
                this.eat(type);
                return true;
            }
        }
        return false;
    }
    eatSemi() {
        switch (this.token.type) {
            case Token.SEMI_COLON  : return this.eat(Token.SEMI_COLON);
            case Token.END_OF_FILE :
            case Token.CLOSE_CURLY : return;
        }
        if (!this.token.ltb){
            this.error(`Semi-colon expected got '${this.token.type}' ${this.token.ltb}`);
        }
    }
    mark(node:Function):Marker{
        return this.builder.mark(node);
    }
    parse():Boolean{
        if(this.parseModule()){
            return this.builder.tree.build();
        }else{
            console.info("FALSE")
        }
    }
    //</editor-fold>
    //<editor-fold desc="Literals">
    parseIdentifier(){
        var marker = this.mark(Ast.Identifier);
        this.eat(Token.IDENTIFIER);
        return marker.done(Ast.Identifier);
    }
    parseReference(){
        var marker = this.mark(Ast.Reference);
        this.eat(Token.IDENTIFIER);
        return marker.done(Ast.Reference);
    }
    //</editor-fold>
    //<editor-fold desc="Module">
    parseModule() {
        var marker = this.mark(Ast.Module);
        while(!this.is(Token.END_OF_FILE)) {
            switch (this.token.type) {
                case Token.IMPORT  : this.parseImportDeclaration(); break;
                case Token.EXPORT  : this.parseExportDeclaration(); break;
                default                 : this.parseStatement();
            }
        }
        return marker.done(Ast.Module);
    }
    parseModuleSpecifier() {
        var marker = this.mark(Ast.ModuleSpecifier);
        this.eat(Token.STRING);
        return marker.done(Ast.ModuleSpecifier);
    }
    //<editor-fold desc="Imports Parsing">
    parseImportDeclaration() {
        var simple,marker = this.mark(Ast.ImportDeclaration);
        this.eat(Token.IMPORT);
        if(this.is(Token.STAR)){
            let marker = this.mark(Ast.NamespaceImport);
            this.eat(Token.STAR);
            if(this.eatIf(Token.AS)){
                this.parseIdentifier();
            }
            marker.done(Ast.NamespaceImport);
            if(this.eatIf(Token.COMMA)) {
                this.parseImportSpecifiers();
            }
        } else
        if(this.is(Token.IDENTIFIER)){
            let marker = this.mark(Ast.DefaultImport);
            this.parseIdentifier();
            if(this.eatIf(Token.AS)){
                this.parseIdentifier();
            }
            marker.done(Ast.DefaultImport);
            if(this.eatIf(Token.COMMA)) {
                this.parseImportSpecifiers();
            }
        }else
        if(this.is(Token.OPEN_CURLY)) {
            if(!this.is(Token.CLOSE_CURLY)) {
                this.parseImportSpecifiers();
            }
        }
        this.eatIf(Token.FROM);
        this.parseModuleSpecifier();
        this.eatSemi();
        return marker.done(Ast.ImportDeclaration);
    }
    parseImportSpecifiers(){
        this.eat(Token.OPEN_CURLY);
        this.parseImportSpecifier();
        while (this.eatIf(Token.COMMA)) {
            this.parseImportSpecifier();
        }
        this.eat(Token.CLOSE_CURLY);
    }
    parseImportSpecifier() {
        var marker = this.mark(Ast.ImportSpecifier);
        this.parseIdentifier();
        if(this.eatIf(Token.AS)){
            this.parseIdentifier();
        }
        return marker.done(Ast.ImportSpecifier);
    }
    //</editor-fold>
    //<editor-fold desc="Export Parsing">
    parseExportDeclaration() {
        var marker = this.mark(Ast.ExportDeclaration);
        this.eat(Token.EXPORT);
        if(this.is(Token.VAR)){
            this.parseVariableDeclaration();
        } else
        if(this.is(Token.CONST)){
            this.parseVariableDeclaration();
        } else
        if(this.is(Token.LET)){
            this.parseVariableDeclaration();
        } else
        if(this.is(Token.FUNCTION)){
            this.parseFunctionDeclaration();
        } else
        if(this.is(Token.CLASS)){
            this.parseClassDeclaration();
        } else
        if(this.is(Token.STAR)){
            let marker = this.mark(Ast.NamespaceExport);
            this.eat(Token.STAR);
            if(this.eatIf(Token.AS)){
                this.parseIdentifier();
            }
            marker.done(Ast.NamespaceExport);
            if(this.eatIf(Token.COMMA)) {
                this.parseExportSpecifiers();
            }
            if(this.eatIf(Token.FROM)){
                this.parseModuleSpecifier();
            }
        } else
        if(this.is(Token.OPEN_CURLY)){
            this.parseExportSpecifiers();
            if(this.eatIf(Token.FROM)){
                this.parseModuleSpecifier();
            }
            if(this.eatIf(Token.FROM)){
                this.parseModuleSpecifier();
            }
        }else{
            this.parseUnexpectedToken();
        }
        this.eatSemi();
        return marker.done(Ast.ExportDeclaration);
    }
    parseExportSpecifiers() {
        this.eat(Token.OPEN_CURLY);
        this.parseExportSpecifier();
        while (this.eatIf(Token.COMMA)) {
            this.parseExportSpecifier();
        }
        this.eat(Token.CLOSE_CURLY);
    }
    parseExportSpecifier() {
        var marker = this.mark(Ast.ExportSpecifier);
        this.parseIdentifier();
        if(this.eatIf(Token.AS)){
            this.parseIdentifier();
        }
        return marker.done(Ast.ExportSpecifier);
    }
    // </editor-fold>
    // </editor-fold>
    //<editor-fold desc="Statements">
    parseStatement(){
        var marker = false,token=this.token.type;
        switch (token) {
            case Token.AT          : marker = this.parseAnnotations();          break;
            // declarations
            case Token.CONST       :
            case Token.LET         :
            case Token.VAR         : marker = this.parseVariableDeclaration();  break;
            case Token.FUNCTION    : marker = this.parseFunctionDeclaration();  break;
            case Token.CLASS       : marker = this.parseClassDeclaration();     break;
            case Token.TRAIT       : marker = this.parseTraitDeclaration();     break;
            case Token.INTERFACE   : marker = this.parseInterfaceDeclaration(); break;
            // statements
            case Token.IF          : marker = this.parseIfStatement();          break;
            case Token.FOR         : marker = this.parseForStatement();         break;
            case Token.SWITCH      : marker = this.parseSwitchStatement();      break;
            case Token.WHILE       : marker = this.parseWhileStatement();       break;
            case Token.DO          : marker = this.parseDoWhileStatement();     break;
            case Token.TRY         : marker = this.parseTryStatement();         break;
            case Token.WITH        : marker = this.parseWithStatement();        break;
            case Token.OPEN_CURLY  : marker = this.parseBlockStatement();       break;
            case Token.RETURN      : marker = this.parseReturnStatement();      break;
            case Token.BREAK       : marker = this.parseBreakStatement();       break;
            case Token.THROW       : marker = this.parseThrowStatement();       break;
            case Token.CONTINUE    : marker = this.parseContinueStatement();    break;
            case Token.DEBUGGER    : marker = this.parseDebuggerStatement();    break;
            case Token.SEMI_COLON  : marker = this.parseEmptyStatement();       break;
            // fall through expressions
            default                : marker = this.parseExpressionStatement();  break;
        }
        marker.shift(Ast.Annotations);
        return marker;
    }
    parseExpressionStatement() {
        var marker = this.mark(Ast.ExpressionStatement);
        this.parseExpression();
        this.eatSemi();
        return marker.done(Ast.ExpressionStatement);
    }
    parseBlockStatement(){
        var marker = this.mark(Ast.BlockStatement);
        this.eat(Token.OPEN_CURLY);
        while(!this.is(Token.CLOSE_CURLY)){
            this.parseStatement();
        }
        this.eat(Token.CLOSE_CURLY);
        return marker.done(Ast.BlockStatement);
    }
    parseIfStatement(){
        var marker = this.mark(Ast.IfStatement);
        this.eat(Token.IF);
        this.eat(Token.OPEN_PAREN);
        this.parseExpression();
        this.eat(Token.CLOSE_PAREN);
        this.parseStatement();
        if(this.eatIf(Token.ELSE)){
            this.parseStatement();
        }
        return marker.done(Ast.IfStatement);
    }
    parseWithStatement(){
        var marker = this.mark(Ast.WithStatement);
        this.eat(Token.WITH);
        this.eat(Token.OPEN_PAREN);
        this.parseExpression();
        this.eat(Token.CLOSE_PAREN);
        this.parseStatement();
        return marker.done(Ast.WithStatement);
    }
    parseWhileStatement(){
        var marker = this.mark(Ast.WhileStatement);
        this.eat(Token.WHILE);
        this.eat(Token.OPEN_PAREN);
        this.parseExpression();
        this.eat(Token.CLOSE_PAREN);
        this.parseStatement();
        return marker.done(Ast.WhileStatement);
    }
    parseDoWhileStatement(){
        var marker = this.mark(Ast.DoWhileStatement);
        this.eat(Token.DO);
        this.parseStatement();
        this.eat(Token.WHILE);
        this.eat(Token.OPEN_PAREN);
        this.parseExpression();
        this.eat(Token.CLOSE_PAREN);
        this.eatIf(Token.SEMI_COLON);
        return marker.done(Ast.DoWhileStatement);
    }
    parseReturnStatement(){
        var marker = this.mark(Ast.ReturnStatement);
        this.eat(Token.RETURN);
        if(!this.isSemi()){
            this.parseExpression();
        }
        this.eatSemi();
        return marker.done(Ast.ReturnStatement);
    }
    parseThrowStatement(){
        var marker = this.mark(Ast.ThrowStatement);
        this.eat(Token.THROW);
        if(!this.isSemi()){
            this.parseExpression();
        }
        this.eatSemi();
        return marker.done(Ast.ThrowStatement);
    }
    parseBreakStatement(){
        var marker = this.mark(Ast.BreakStatement);
        this.eat(Token.BREAK);
        if(!this.isSemi()){
            this.eatIf(Token.IDENTIFIER);
        }
        this.eatSemi();
        return marker.done(Ast.BreakStatement);
    }
    parseContinueStatement(){
        var marker = this.mark(Ast.ContinueStatement);
        this.eat(Token.CONTINUE);
        if(!this.isSemi()){
            this.eatIf(Token.IDENTIFIER);
        }
        this.eatSemi();
        return marker.done(Ast.ContinueStatement);
    }
    parseDebuggerStatement(){
        var marker = this.mark(Ast.DebuggerStatement);
        this.eat(Token.DEBUGGER);
        this.eatSemi();
        return marker.done(Ast.DebuggerStatement);
    }
    parseEmptyStatement(){
        var marker = this.mark(Ast.EmptyStatement);
        this.eat(Token.SEMI_COLON);
        return marker.done(Ast.EmptyStatement);
    }
    parseTryStatement(){
        var marker = this.mark(Ast.TryStatement)
        this.eat(Token.TRY);
        this.parseBlockStatement();
        if (this.is(Token.CATCH)) {
            var catchMarker =  this.mark(Ast.Catch)
            this.eat(Token.CATCH);
            this.eat(Token.OPEN_PAREN);
            this.eat(Token.IDENTIFIER);
            this.eat(Token.CLOSE_PAREN);
            this.parseBlockStatement();
            catchMarker.done(Ast.Catch);
        }
        if (this.is(Token.FINALLY)) {
            var finallyMarker =  this.mark(Ast.Finally)
            this.eat(Token.FINALLY);
            this.parseBlockStatement();
            finallyMarker.done(Ast.Finally);
        }
        return marker.done(Ast.TryStatement);
    }
    parseSwitchStatement(){
        var marker = this.mark(Ast.SwitchStatement);
        this.eat(Token.SWITCH);
        this.eat(Token.OPEN_PAREN);
        this.parseExpression();
        this.eat(Token.CLOSE_PAREN);
        this.eat(Token.OPEN_CURLY);
        while(true){
            if(this.is(Token.CASE)){
                var caseMarker = this.mark(Ast.CaseClause);
                this.eat(Token.CASE);
                this.parseExpression();
                this.eat(Token.COLON);
                this.parseSwitchStatements();
                caseMarker.done(Ast.CaseClause);
            } else
            if(this.is(Token.DEFAULT)){
                var defaultMarker = this.mark(Ast.DefaultClause);
                this.eat(Token.DEFAULT);
                this.eat(Token.COLON);
                this.parseSwitchStatements();
                defaultMarker.done(Ast.DefaultClause);
            }else{
                break;
            }
        }
        this.eat(Token.CLOSE_CURLY);
        return marker.done(Ast.SwitchStatement);
    }
    parseSwitchStatements(){
        while (!this.isIn(
            Token.CASE,
            Token.DEFAULT,
            Token.CLOSE_CURLY,
            Token.END_OF_FILE
        )) {
            this.parseStatement()
        }
    }
    parseForStatement() {
        var marker = this.mark(Ast.ForStatement);
        this.eat(Token.FOR);
        this.eat(Token.OPEN_PAREN);

        this.parseForInHeader() ||
        this.parseForHeader()   ;

        this.eat(Token.CLOSE_PAREN);
        this.parseStatement();
        return marker.done(Ast.ForStatement);
    }
    parseForInHeader(){
        var marker = this.mark(Ast.ForSignature);
        if(this.isIn(Token.VAR,Token.LET)){
            this.parseVariableDeclaration();
        }else
        if(!this.is(Token.SEMI_COLON)){
            this.parseExpression();
        }
        if(this.eatIfAny(Token.IN,Token.OF)){
            this.parseExpression();
            return marker.done(Ast.ForSignature)
        }else{
            return marker.rollback();
        }
    }
    parseForHeader(){
        var marker = this.mark(Ast.ForSignature);
        if(this.isIn(Token.VAR,Token.LET)){
            this.parseVariableDeclaration();
            this.eat(Token.SEMI_COLON)
        }else
        if(!this.is(Token.SEMI_COLON)){
            this.parseExpression();
            this.eat(Token.SEMI_COLON)
        }else{
            this.eat(Token.SEMI_COLON)
        }
        if(!this.is(Token.SEMI_COLON)){
            this.parseExpression();
            this.eat(Token.SEMI_COLON)
        }else{
            this.eat(Token.SEMI_COLON)
        }
        if(!this.is(Token.CLOSE_PAREN)){
            this.parseExpression();
        }
        return marker.done(Ast.ForSignature)
    }
    //</editor-fold>
    //<editor-fold desc="Declarations">
    parseName(){
        var marker = this.mark(Ast.Name);
        this.eat(Token.IDENTIFIER);
        return marker.done(Ast.Name);
    }
    //<editor-fold desc="Variable Declaration">
    parseVariableDeclaration(){
        var inFor = this.builder.in(Ast.ForSignature);
        var marker = this.mark(Ast.VariableDeclarations);
        this.eatAny(Token.VAR,Token.CONST,Token.LET);
        this.parseVariableDeclarator();
        while(this.eatIf(Token.COMMA)) {
            this.parseVariableDeclarator();
        }
        if(!inFor){
            this.eatSemi();
        }
        return marker.done(Ast.VariableDeclarations);
    }
    parseVariableDeclarator() {
        var marker =this.mark(Ast.VariableDeclaration);
        if (this.isIn(Token.OPEN_SQUARE,Token.OPEN_CURLY)) {
            this.parsePattern();
        } else {
            this.parseName();
            if(this.eatIf(Token.COLON)){
                this.parseTypeAnnotation();
            }
        }
        if(this.eatIf(Token.EQUAL)){
            this.parseInitializer();
        }
        return marker.done(Ast.VariableDeclaration);
    }
    parseInitializer(){
        var marker = this.mark(Ast.Initializer);
        this.parseAssignmentExpression();
        return marker.done(Ast.Initializer)
    }
    //</editor-fold>
    //<editor-fold desc="ClassDeclaration Declaration">
    parseClassDeclaration(){
        var marker = this.mark(Ast.ClassDeclaration);
        this.eat(Token.CLASS);
        this.parseClassName();
        if(this.eatIf(Token.EXTENDS)){
            this.parseClassParent();
        }
        this.parseClassBody();
        return marker.done(Ast.ClassDeclaration);
    }
    parseClassName(){
        var marker = this.mark(Ast.ClassName);
        this.parseName();
        return marker.done(Ast.ClassName);
    }
    parseClassParent(){
        var marker = this.mark(Ast.ClassParent);
        this.parseTypeAnnotation();
        return marker.done(Ast.ClassParent);
    }
    parseClassBody(){
        var member,marker = this.mark(Ast.ClassBody);
        this.eat(Token.OPEN_CURLY);
        while(!this.is(Token.CLOSE_CURLY)){
            this.parseClassMember();
        }
        this.eat(Token.CLOSE_CURLY);
        return marker.done(Ast.ClassBody);
    }
    parseClassMember(){
        this.parseAnnotations();
        this.parseModifiers();
        var member=false;
        member = member || this.parseClassGetter();
        member = member || this.parseClassSetter();
        member = member || this.parseClassConstructor();
        member = member || this.parseClassMethod();
        member = member || this.parseClassField();
        member.shift(Ast.Modifiers);
        member.shift(Ast.Annotations);
        this.eatSemi();
        return member;
    }
    parseClassConstructor(){
        var marker = this.mark(Ast.ClassConstructor);
        if(this.is(Token.CONSTRUCTOR)){
            this.eat(Token.CONSTRUCTOR);
            if(this.is(Token.OPEN_PAREN)){
                this.parseFormalSignature();
                if(this.eatIf(Token.ARROW)){
                    this.parseAssignmentExpression();
                }else{
                    this.parseBlockStatement();
                }
                return marker.done(Ast.ClassConstructor);
            }else{
                return marker.rollback();
            }
        }else{
            return marker.rollback();
        }
    }
    parseClassGetter(){
        var marker = this.mark(Ast.ClassGetter);
        if(this.eatIf(Token.GET)){
            this.parseName();
            this.parseFormalSignature();
            if(this.eatIf(Token.ARROW)){
                this.parseAssignmentExpression();
            }else{
                this.parseBlockStatement();
            }
            return marker.done(Ast.ClassGetter);
        }else{
            return marker.rollback();
        }
    }
    parseClassSetter(){
        var marker = this.mark(Ast.ClassSetter);
        if(this.eatIf(Token.SET)){
            this.parseName();
            this.parseFormalSignature();
            if(this.eatIf(Token.ARROW)){
                this.parseAssignmentExpression();
            }else{
                this.parseBlockStatement();
            }
            return marker.done(Ast.ClassSetter);
        }else{
            return marker.rollback();
        }
    }
    parseClassMethod(){
        var marker = this.mark(Ast.ClassMethod);
        this.parseName();
        if(this.is(Token.OPEN_PAREN)){
            this.parseFormalSignature();
            if(this.eatIf(Token.ARROW)){
                this.parseAssignmentExpression();
            }else{
                this.parseBlockStatement();
            }
            return marker.done(Ast.ClassMethod);
        }else{
            return marker.rollback();
        }
    }
    parseClassField(){
        var marker = this.mark(Ast.ClassField);
        this.parseName();
        if(this.eatIf(Token.COLON)){
            this.parseTypeAnnotation();
        }
        if(this.eatIf(Token.EQUAL)){
            this.parseAssignmentExpression();
        }
        return marker.done(Ast.ClassField);
    }
    parseModifiers(){
        var marker = this.mark(Ast.Modifiers);
        var marked = false;
        while(this.isIn(
            Token.PUBLIC,
            Token.PROTECTED,
            Token.STATIC,
            Token.ASYNC
        )){
            marked = this.mark(Ast.Modifier);
            this.eat(this.token.type);
            marked = marked.done(Ast.Modifier);
        }
        if(marked){
            return marker.done(Ast.Modifiers);
        }else{
            return marker.rollback();
        }
    }
    //</editor-fold>
    //<editor-fold desc="Function Declaration">
    parseFunctionDeclaration(){
        var marker = this.mark(Ast.FunctionDeclaration);
        this.eat(Token.FUNCTION);
        if(this.is(Token.IDENTIFIER)){
            this.parseIdentifier();
        }
        this.parseFormalSignature();
        this.parseBlockStatement();
        
        return marker.done(Ast.FunctionDeclaration);
    }
    parseFormalSignature(){
        var marker = this.mark(Ast.FormalSignature);
        this.eat(Token.OPEN_PAREN);
        if(!this.is(Token.CLOSE_PAREN)){
            this.parseFormalParameter();
            while(this.eatIf(Token.COMMA)){
                this.parseFormalParameter();
            }
        }
        this.eat(Token.CLOSE_PAREN);
        if(this.eatIf(Token.COLON)){
            this.parseTypeAnnotation();
        }
        return marker.done(Ast.FormalSignature);
    }
    parseFormalParameter(){
        var marker = this.mark(Ast.FormalParameter);
        this.parseAnnotations();
        this.parseName();
        if(this.eatIf(Token.COLON)){
            this.parseTypeAnnotation();
        }
        return marker.done(Ast.FormalParameter);
    }
    //</editor-fold>
    //</editor-fold>
    //<editor-fold desc="Expressions">
    parseExpression(){
        var expression = this.parseAssignmentExpression();
        if(this.is(Token.COMMA)){
            var sequence = this.mark(Ast.SequenceExpression);
            while(this.eatIf(Token.COMMA)){
                this.parseAssignmentExpression();
            }
            sequence.shift();
            sequence.done(Ast.SequenceExpression);
            expression = sequence;
        }
        return expression;
    }
    parseAssignmentExpression(){
        var expression = this.parseConditional();
        if(this.is(Token.ARROW)){
            expression.rollback();
            expression = this.parseArrowExpression();
        }else
        if(this.eatIf(Token.EQUAL)){//=
            this.parseAssignmentExpression();
            expression = expression.collapse(Ast.AssignmentExpression);
        }else
        if(this.eatIf(Token.PLUS_EQUAL)){//+=
            this.parseAssignmentExpression();
            expression = expression.collapse(Ast.SumAssignmentExpression);
        }else
        if(this.eatIf(Token.MINUS_EQUAL)){//-=
            this.parseAssignmentExpression();
            expression = expression.collapse(Ast.SubAssignmentExpression);
        }else
        if(this.eatIf(Token.STAR_EQUAL)){//*=
            this.parseAssignmentExpression();
            expression = expression.collapse(Ast.MulAssignmentExpression);
        }else
        if(this.eatIf(Token.SLASH_EQUAL)){///=
            this.parseAssignmentExpression();
            expression = expression.collapse(Ast.DivAssignmentExpression);
        }else
        if(this.eatIf(Token.AMPERSAND_EQUAL)){//&=
            this.parseAssignmentExpression();
            expression = expression.collapse(Ast.AndAssignmentExpression);
        }else
        if(this.eatIf(Token.BAR_EQUAL)){//|=
            this.parseAssignmentExpression();
            expression = expression.collapse(Ast.OrAssignmentExpression);
        }else
        if(this.eatIf(Token.CARET_EQUAL)){//^=
            this.parseAssignmentExpression();
            expression = expression.collapse(Ast.XorAssignmentExpression);
        }else
        if(this.eatIf(Token.LEFT_SHIFT_EQUAL)){//<<=
            this.parseAssignmentExpression();
            expression = expression.collapse(Ast.LshAssignmentExpression);
        }else
        if(this.eatIf(Token.RIGHT_SHIFT_EQUAL)){//>>=
            this.parseAssignmentExpression();
            expression = expression.collapse(Ast.RshAssignmentExpression);
        }else
        if(this.eatIf(Token.UNSIGNED_RIGHT_SHIFT_EQUAL)){//>>>=
            this.parseAssignmentExpression();
            expression = expression.collapse(Ast.ZshAssignmentExpression);
        }else
        if(this.eatIf(Token.UNSIGNED_RIGHT_SHIFT_EQUAL)){//>>>=
            this.parseAssignmentExpression();
            expression = expression.collapse(Ast.ZshAssignmentExpression);
        }
        return expression;
    }
    parseConditional() {
        var condition = this.parseLogicalOR();
        if (this.eatIf(Token.QUESTION)) {
            this.parseAssignmentExpression();
            this.eat(Token.COLON);
            this.parseAssignmentExpression();
            condition.collapse(Ast.ConditionalExpression);
        }
        return condition;
    }
    parseLogicalOR() {
        var left = this.parseLogicalAND();
        while(this.eatIf(Token.OR)) {
            this.parseLogicalAND();
            left = left.collapse(Ast.BinaryExpression);
        }
        return left;
    }
    parseLogicalAND() {
        var left = this.parseBitwiseOR();
        while(this.eatIf(Token.AND)) {
            this.parseBitwiseOR();
            left = left.collapse(Ast.BinaryExpression);
        }
        return left;
    }
    parseBitwiseOR() {
        var left = this.parseBitwiseXOR();
        while(this.eatIf(Token.BAR)) {
            this.parseBitwiseXOR();
            left = left.collapse(Ast.BinaryExpression);
        }
        return left;
    }
    parseBitwiseXOR() {
        var left = this.parseBitwiseAND();
        while(this.eatIf(Token.CARET)) {
            this.parseBitwiseAND();
            left = left.collapse(Ast.BinaryExpression);
        }
        return left;
    }
    parseBitwiseAND() {
        var left = this.parseEquality();
        while(this.eatIf(Token.AMPERSAND)) {
            this.parseEquality();
            left = left.collapse(Ast.BinaryExpression);
        }
        return left;
    }
    parseEquality() {
        var left = this.parseRelational();
        while(this.eatIfAny(
            Token.EQUAL_EQUAL,
            Token.NOT_EQUAL,
            Token.EQUAL_EQUAL_EQUAL,
            Token.NOT_EQUAL_EQUAL
        )){
            this.parseRelational();
            left = left.collapse(Ast.BinaryExpression);
        }
        return left;
    }
    parseRelational() {
        var left = this.parseShiftExpression();
        while(this.eatIfAny(
            Token.OPEN_ANGLE,
            Token.CLOSE_ANGLE,
            Token.GREATER_EQUAL,
            Token.LESS_EQUAL,
            Token.INSTANCEOF
        )){
            this.parseShiftExpression();
            left = left.collapse(Ast.BinaryExpression);
        }
        return left;
    }
    parseShiftExpression() {
        var left = this.parseAdditiveExpression();
        while(this.eatIfAny(
            Token.LEFT_SHIFT,
            Token.RIGHT_SHIFT,
            Token.UNSIGNED_RIGHT_SHIFT
        )) {
            this.parseAdditiveExpression();
            left = left.collapse(Ast.BinaryExpression);
        }
        return left;
    }
    parseAdditiveExpression() {
        var left = this.parseMultiplicativeExpression();
        while (true) {
            if(this.eatIf(Token.PLUS)){
                this.parseMultiplicativeExpression();
                left = left.collapse(Ast.SumExpression);
            }else
            if(this.eatIf(Token.MINUS)){
                this.parseMultiplicativeExpression();
                left = left.collapse(Ast.SubExpression);
            }else{
                break;
            }
        }
        return left;
    }
    parseMultiplicativeExpression() {
        var left = this.parseExponentiationExpression();
        while (this.eatIfAny(
            Token.SLASH,
            Token.STAR,
            Token.PERCENT
        )) {
            this.parseExponentiationExpression();
            left = left.collapse(Ast.BinaryExpression);
        }
        return left;
    }
    parseExponentiationExpression() {
        var left = this.parseUnaryExpression();
        while (this.is(Token.STAR_STAR)) {
            this.parseExponentiationExpression();
            left = left.collapse(Ast.BinaryExpression);
        }
        return left;
    }
    parseUnaryExpression(){
        if(this.isIn(
            Token.AWAIT,
            Token.DELETE,
            Token.VOID,
            Token.TYPEOF,
            Token.PLUS_PLUS,
            Token.MINUS_MINUS,
            Token.PLUS,
            Token.MINUS,
            Token.TILDE,
            Token.BANG
        )){
            var marker  = this.mark(Ast.UnaryExpression);
            this.eat(this.token.type);
            this.parseUnaryExpression();
            return marker.done(Ast.UnaryExpression);
        }else{
            return this.parsePostfixExpression();
        }

    }
    parsePostfixExpression(){
        var operand = this.parseLeftExpression();
        while (this.eatIfAny(
            Token.PLUS_PLUS,
            Token.MINUS_MINUS
        )) {
            operand = operand.collapse(Ast.PostfixExpression);
        }
        return operand;
    }
    parsePrimaryExpression() {
        var expression;
        switch (this.token.type) {
            case Token.TEMPLATE        :
            case Token.TEMPLATE_HEAD   : expression = this.parseTemplateExpression();      break;
            case Token.SLASH           : // parse as regexp
            case Token.SLASH_EQUAL     : expression = this.parseRegexpExpression();        break;
            case Token.TRUE            :
            case Token.FALSE           : expression = this.parseBooleanExpression();       break;
            case Token.NUMBER          : expression = this.parseNumberExpression();        break;
            case Token.STRING          : expression = this.parseStringExpression();        break;
            case Token.NULL            : expression = this.parseNullExpression();          break;
            case Token.NAN             : expression = this.parseNanExpression();           break;
            case Token.UNDEFINED       : expression = this.parseUndefinedExpression();     break;
            case Token.THIS            : expression = this.parseThisExpression();          break;
            case Token.SUPER           : expression = this.parseSuperExpression();          break;
            case Token.IDENTIFIER      : expression = this.parseIdentifier();              break;
            case Token.CLASS           : expression = this.parseClassExpression();         break;
            case Token.FUNCTION        : expression = this.parseFunctionExpression();      break;
            case Token.OPEN_SQUARE     : expression = this.parseArrayExpression();         break;
            case Token.OPEN_CURLY      : expression = this.parseObjectExpression();        break;
            case Token.OPEN_PAREN      : expression = this.parseParenExpression();         break;
            case Token.END_OF_FILE     : return null;
            default                         : return this.error(`unexpected token ${this.token.type}`);
        }
        return expression;
    }
    parseNumberExpression(){
        var marker = this.mark(Ast.NumberExpression);
        this.eat(Token.NUMBER);
        return marker.done(Ast.NumberExpression);
    }
    parseStringExpression(){
        var marker = this.mark(Ast.StringExpression);
        this.eat(Token.STRING);
        return marker.done(Ast.StringExpression);
    }
    parseBooleanExpression(){
        var marker = this.mark(Ast.BooleanExpression);
        this.eatAny(Token.TRUE,Token.FALSE);
        return marker.done(Ast.BooleanExpression);
    }
    parseNullExpression(){
        var marker = this.mark(Ast.NullExpression);
        this.eat(Token.NULL);
        return marker.done(Ast.NullExpression);
    }
    parseNanExpression(){
        var marker = this.mark(Ast.NanExpression);
        this.eat(Token.NAN);
        return marker.done(Ast.NanExpression);
    }
    parseUndefinedExpression(){
        var marker = this.mark(Ast.UndefinedExpression);
        this.eat(Token.UNDEFINED);
        return marker.done(Ast.UndefinedExpression);
    }
    parseThisExpression(){
        var marker= this.mark(Ast.ThisExpression);
        this.eat(Token.THIS);
        return marker.done(Ast.ThisExpression);
    }
    parseSuperExpression(){
        var marker= this.mark(Ast.SuperExpression);
        this.eat(Token.SUPER);
        return marker.done(Ast.SuperExpression);
    }
    parseParenExpression(){
        var marker = this.mark(Ast.ParenExpression);
        this.eat(Token.OPEN_PAREN);
        if(!this.is(Token.CLOSE_PAREN)) {
            if (this.is(Token.DOT_DOT_DOT)) {
                this.parseRestParameter();
            } else {
                this.parseAssignmentExpression();
                while (this.eatIf(Token.COMMA)) {
                    this.parseAssignmentExpression();
                }
            }
        }
        this.eat(Token.CLOSE_PAREN);
        return marker.done(Ast.ParenExpression)
    }
    parseLeftExpression(inNew=false){
        var marker;
        do{
            if(this.is(Token.NEW)){
                marker  = this.parseNewExpression();
            }else
            if(!marker){
                marker  = this.parsePrimaryExpression();
            }else
            if(this.is(Token.OPEN_PAREN) && !inNew){
                marker  = this.parseCallExpression();
            }else
            if(this.is(Token.OPEN_SQUARE)){
                marker  = this.parseSquareMemberExpression();
            }else
            if(this.is(Token.PERIOD)){
                marker  = this.parsePeriodMemberExpression();
            }else{
                break;
            }
        }while(true);
        return marker;
    }
    parseNewExpression(){
        var marker = this.mark(Ast.NewExpression);
        this.eat(Token.NEW);
        this.parseLeftExpression(true);
        if (this.is(Token.OPEN_PAREN)) {
            this.parseArguments();
        }
        return marker.done(Ast.NewExpression);
    }
    parseCallExpression(){
        var marker = this.mark(Ast.CallExpression);
        this.parseArguments();
        marker.done(Ast.CallExpression);
        marker.shift();
        return marker;
    }
    parseSquareMemberExpression(){
        var marker = this.mark(Ast.MemberExpression);
        this.eat(Token.OPEN_SQUARE);
        this.parseAssignmentExpression();
        this.eat(Token.CLOSE_SQUARE);
        marker.done(Ast.MemberExpression)
        marker.shift();

        return marker;
    }
    parsePeriodMemberExpression(){
        var marker = this.mark(Ast.MemberExpression);
        this.eat(Token.PERIOD);
        this.parseIdentifier();
        marker.done(Ast.MemberExpression)
        marker.shift();
        return marker;
    }
    parseArguments() {
        var marker = this.mark(Ast.Arguments);
        this.eat(Token.OPEN_PAREN);
        if (!this.is(Token.CLOSE_PAREN)) {
            this.parseArgument();
            while (this.eatIf(Token.COMMA)) {
                this.parseArgument();
            }
        }
        this.eat(Token.CLOSE_PAREN);
        return marker.done(Ast.Arguments);
    }
    parseArgument() {
        var marker = this.mark(Ast.Argument);
        if (this.is(Token.DOT_DOT_DOT)){
            return this.parseSpreadExpression();
        }
        this.parseAssignmentExpression();
        return marker.done(Ast.Argument);
    }
    parseArrayExpression(){
        var marker = this.mark(Ast.ArrayLiteral);
        this.eat(Token.OPEN_SQUARE);
        while(!this.is(Token.CLOSE_SQUARE)){
            this.parseArrayElement();
            if(!this.eatIf(Token.COMMA)){
                break;
            }
        }
        this.eat(Token.CLOSE_SQUARE);
        return marker.done(Ast.ArrayLiteral);
    }
    parseArrayElement(){
        var marker = this.mark(Ast.ArrayElement);
        if(!this.is(Token.COMMA)){
            this.parseAssignmentExpression();
        }
        marker.done(Ast.ArrayElement);
        return marker;
    }
    parseObjectExpression(){
        var marker = this.mark(Ast.ObjectExpression);
        this.eat(Token.OPEN_CURLY);
        while (this.is(Token.IDENTIFIER)) {
            this.parseObjectProperty();
            if (!this.eatIf(Token.COMMA)){
                break;
            }
        }
        this.eat(Token.CLOSE_CURLY);
        return marker.done(Ast.ObjectExpression);
    }
    parseObjectProperty(){
        var marker = this.mark(Ast.ObjectProperty);
        this.eat(Token.IDENTIFIER);
        if(this.eatIf(Token.COLON)){
            this.parseAssignmentExpression();
        }
        marker.done(Ast.ObjectProperty);
        return marker;
    }
    parseArrowExpression(){
        var marker = this.mark(Ast.ArrowExpression);
        this.parseFormalSignature();
        this.eat(Token.ARROW);
        if(this.is(Token.OPEN_CURLY)){
            this.parseBlockStatement();
        }else{
            this.parseExpressionStatement();
        }

        return marker.done(Ast.ArrowExpression);
    }
    parseFunctionExpression(){
        var marker = this.mark(Ast.FunctionExpression);
        this.eat(Token.FUNCTION);
        if(this.is(Token.IDENTIFIER)){
            this.parseIdentifier();
        }
        this.parseFormalSignature();
        this.parseBlockStatement();
        return marker.done(Ast.FunctionExpression);
    }
    parseTemplateExpression() {
        var marker = this.mark(Ast.TemplateExpression);
        if(this.is(Token.TEMPLATE)){
            this.eat(Token.TEMPLATE);
        }else
        if(this.eatIf(Token.TEMPLATE_HEAD)){
            do{
                this.parseExpression();
                if(this.is(Token.TEMPLATE_MIDDLE)){

                    this.eat(Token.TEMPLATE_MIDDLE);
                }else
                if(!this.is(Token.TEMPLATE_TAIL)){
                    this.eat(Token.TEMPLATE_TAIL);
                }
            }while(!this.eatIf(Token.TEMPLATE_TAIL));
        }
        return marker.done(Ast.TemplateExpression);
    }
    parseRegexpExpression() {
        var marker = this.mark(Ast.RegexpExpression);
        this.eat(Token.REGEXP);
        return marker.done(Ast.RegexpExpression);
    }
    //</editor-fold>
    //<editor-fold desc="Annotations">
    parseTypeAnnotation(){
        var marker = this.mark(Ast.TypeReference);
        this.parseIdentifier();
        return marker.done(Ast.TypeReference);
    }
    parseAnnotations(){
        if(this.is(Token.AT)) {
            var marker = this.mark(Ast.Annotations);
            while (this.is(Token.AT)) {
                this.parseAnnotation();
            }
            return marker.done(Ast.Annotations);
        }else{
            return false;
        }
    }
    parseAnnotation(){
        var marker = this.mark(Ast.Annotation);
        this.eat(Token.AT);
        this.parseIdentifier();
        if(this.is(Token.OPEN_PAREN)){
            this.parseArguments();
        }
        return marker.done(Ast.Annotation);
    }
    //</editor-fold>
}
JST.Parser = Parser;