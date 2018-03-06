///<reference path="globals.ts" />
///<reference path="tree.ts" />
///<reference path="symbol.ts" />
///<reference path="token.ts" />

/* ------------
Parser.ts

Requires global.ts, tree.ts, symbol.ts, and token.ts
------------ */

module Compiler {
    
  export class Parser {
    public csTree: Tree;
    public symbolTable: Symbol[];
    public tokenBank: Token[];
    public error: boolean;

    // 1. <Program> -> <Block> $
    public start(tokenBank:Array<Token>): [Tree, Array<Symbol>]{
      // need to start with first token
      this.tokenBank = tokenBank.reverse(); 
      this.error = false;
      this.printStage("parse()");
      this.csTree = new Tree("Program");
      this.symbolTable = new Array<Symbol>();
      this.printStage("parseProgram()");

      if(this.parseBlock()){
        // true = finished parsing body of program
        this.csTree.moveUp(); // to Program
        let currToken = this.tokenBank.pop();

        // check for [$]
        if(currToken.isEqual("T_EOP")){
          this.csTree.addLeafNode(currToken.tValue);
          return [this.csTree, this.symbolTable];
        } else {
          // Expected [$]
          this.printError("T_EOP", currToken);
          return null;
        }
      } else{
        // Expected start of block [{]
        let errorToken = this.tokenBank.pop();
        this.printError("T_OpenBracket", errorToken);
        return null;
      }
    }

    // 2. <Block> -> { <StatementList> }
    public parseBlock(): boolean{
      let currToken = this.tokenBank.pop();
    
      // check for [{]
      if(currToken.isEqual("T_OpenBracket")){
        // Block found
        this.printStage("parseBlock()");
        this.csTree.addBranchNode("Block");
        this.csTree.addLeafNode(currToken.tValue);

        if(this.parseStmtList()){
          // true = finished parsing body of block
          currToken = this.tokenBank.pop();
          //check for [}]
          if(currToken.isEqual("T_CloseBracket")){
            this.csTree.addLeafNode(currToken.tValue);
            return true;
          } else{
            // Expected [}]
            this.printError("T_CloseBracket", currToken);
            return false;
          }
        } else{
          return true; // means statement list is epsilon
        }
      } else{
        // Block not found, error depends on previous function
        this.tokenBank.push(currToken);
        return false;
      }
    }

    // 3. <StatementList> -> <Statement> <StatementList>
    // 4.                 -> end
    public parseStmtList(): boolean{
      this.csTree.addBranchNode("StatementList");
      this.printStage("parseStatementList()");
      if(this.parseStatement()){
        this.csTree.moveUp(); // to StatementList
        return this.parseStmtList();
      } else {
        while (this.csTree.current.value == "StatementList"){
          this.csTree.moveUp();
        }
        return true;
      }
    }

    /*
    * 5. <Statement> -> <PrintStatement>
    * 6.             -> <AssignmentStatement>
    * 7.             -> <VarDecl>
    * 8.             -> <WhileStatement>
    * 9.             -> <IfStatement>
    * 10.            -> <Block>
    */
    public parseStatement(): boolean{
      if(this.parsePrintStmt() || this.parseAssignStmt() || this.parseVarDecl() 
      || this.parseWhileStmt() || this.parseIfStmt() || this.parseBlock()){
        this.csTree.moveUp(); // to Statement
        return true;
      } else{
        // can be epsilon
        return false;
      }
    }

    // 11. <PrintStatement> -> print (<Expr>)
    public parsePrintStmt(): boolean{
      let currToken = this.tokenBank.pop();
      if(currToken.isEqual("T_Print")){
        // PrintStatement found
        this.csTree.addBranchNode("Statement"); 
        this.printStage("parsePrintStatement()");
        this.csTree.addBranchNode("PrintStatement"); 
        this.csTree.addLeafNode(currToken.tValue); 

        currToken = this.tokenBank.pop();
        // check for [(]
        if(currToken.isEqual("T_OpenParen")){
          this.csTree.addLeafNode(currToken.tValue); 
          if(this.parseExpr()){
            this.csTree.moveUp(); // to PrintExpr
            currToken = this.tokenBank.pop();
            // check for [)]
            if(currToken.isEqual("T_CloseParen")){
              this.csTree.addLeafNode(currToken.tValue); 
              return true;
            } else{
              // Expected [])]
              this.printError("T_CloseParen", currToken);
              return false;
            }
          } else{
            // Expected [Expr]
            this.printError("Expr", currToken);
            return false;
          }
        } else{
          // Expected [(]
          this.printError("T_OpenParen", currToken);
          return false;
        }
      } else{
        // go back to parseStmtList to check other production
        this.tokenBank.push(currToken);
        return false;
      }
    }

    // 12. <AssignmentStatement> -> <Id> = <Expr>
    public parseAssignStmt(): boolean{
      let currToken = this.tokenBank.pop();
      if(currToken.isEqual("T_Id")){
        // AssignmentStatement found
        this.csTree.addBranchNode("Statement");
        this.csTree.addBranchNode("AssignmentStatement");
        this.printStage("parseAssignmentStatement()");
        this.csTree.addBranchNode("Id");
        this.printStage("parseId()");
        this.csTree.addLeafNode(currToken.tValue); 
        this.csTree.moveUp(); // to AssignmentStatement
        currToken = this.tokenBank.pop();
        if(currToken.isEqual("T_Assignment")){
          this.csTree.addLeafNode(currToken.tValue);
          if(this.parseExpr()){
            this.csTree.moveUp(); // to AssignmentStatement
            return true;
          } else{
            // Expected [Expr]
            this.printError("Expr", currToken);
            return false;
          }
        } else{
          // Expected [=]
            this.printError("T_Assignment", currToken);
          return false;
        }
      } else{
        // go back to parseStmtList to check other productions
        this.tokenBank.push(currToken);
        return false;
      }
    }

    // 13. <VarDecl> -> type Id
    public parseVarDecl(): boolean{
      let currToken = this.tokenBank.pop();
      // 29. <type> -> <int> | <string> | <boolean>
      if(currToken.isEqual("T_VarType")){
        this.csTree.addBranchNode("Statement"); 
        this.csTree.addBranchNode("VarDecl"); 
        this.printStage("parseVarDecl()"); 
        this.csTree.addBranchNode("type"); 
        this.csTree.addLeafNode(currToken.tValue);
        this.csTree.moveUp(); // to VarDecl
        if(this.parseId()){
          this.csTree.moveUp(); // to VarDecl
          let currentNode = this.csTree.current;
          let symbol: Symbol = new Symbol(currentNode.childrenNode[1].childrenNode[0].value, currentNode.childrenNode[0].childrenNode[0].value);
          this.symbolTable.push(symbol);
          return true;
        } else{
          this.printError("T_Id", currToken);
          return false;
        }
      } else{
        // return to parseStmtList to evaluate other production
        this.tokenBank.push(currToken);
        return false;
      }
    }

    // 14. <WhileStatement> -> while <BooleanExpr> <Block>
    public parseWhileStmt(): boolean{
      let currToken = this.tokenBank.pop();
      if(currToken.isEqual("T_While")){
        this.csTree.addBranchNode("Statement"); 
        this.csTree.addBranchNode("WhileStatement");
        this.printStage("parseWhileStatement()");
        this.csTree.addLeafNode(currToken.tValue);
        if(this.parseBoolExpr()){
          this.csTree.moveUp(); // to WhileStatement
          if(this.parseBlock()){
            this.csTree.moveUp(); // to WhileStatement
            return true;
          } else{
            // Expected block
            this.printError("Block", currToken);
            return false;
          }
        } else{
          // Expected boolexpr
          this.printError("BoolExpr", currToken);
          return false;
        }
      } else{
        // return to parseStmtList to evaluate other productions
        this.tokenBank.push(currToken);
        return false;
      }
    }

    // 15. <IfStatement> -> if <BooleanExpr> <Block>
    public parseIfStmt(): boolean{
      let currToken = this.tokenBank.pop();
      if(currToken.isEqual("T_If")){
        this.csTree.addBranchNode("Statement");
        this.csTree.addBranchNode("IfStatement");
        this.printStage("parseIfStatement()");
        this.csTree.addLeafNode(currToken.tValue);
        if(this.parseBoolExpr()){
          this.csTree.moveUp(); // to IfStatement
          if(this.parseBlock()){
            this.csTree.moveUp(); // to IfStatement
            return true; // current = IfStatement
          } else{
            // Expected block
            this.printError("Block", currToken);  
            return false;
          }
        } else{
          // Expected boolexpr
          this.printError("BoolExpr", currToken);
          return false;
        }
      } else{
        // return to parseStmtList to evaluate other productions
        this.tokenBank.push(currToken);
        return false;
      }
    }

    /*  
     * 16. <Expr> -> <IntExpr>
     * 17.        -> <StringExpr>
     * 18.        -> <BooleanExpr>
     * 19.        -> <Id>
     */ 
    public parseExpr(): boolean{
      this.csTree.addBranchNode("Expr"); 
      if(this.parseIntExpr() || this.parseStrExpr() 
        || this.parseBoolExpr() || this.parseId()){
        this.printStage("parseExpr()");
        this.csTree.moveUp(); // to Expr
        return true;
      } else{
        // previous function decides error
        return false;
      }
    }

    // 20. <IntExpr> -> <digit> <intop> <Expr>
    // 21.           -> <digit>
    public parseIntExpr(): boolean{
      let currToken = this.tokenBank.pop();
      // 32. <digit> -> <0> | <1> | ...
      if(currToken.isEqual("T_Digit")){
        // IntExpr found
        this.csTree.addBranchNode("IntExpr");
        this.printStage("parseIntExpr()"); 
        this.csTree.addBranchNode("digit");
        this.csTree.addLeafNode(currToken.tValue);
        this.csTree.moveUp(); // to IntExpr
        currToken = this.tokenBank.pop();
        // 35. <intop> -> <+>
        if(currToken.isEqual("T_Addition")){
          this.csTree.addLeafNode(currToken.tValue);
          if(this.parseExpr()){
            return true;
          } else{
            // Expected Expr
            this.printError("Expr", currToken);
            return false;
          }
        } else {
          // just digit, still valid
          this.tokenBank.push(currToken);
          return true;
        } 
      } else{
        // return to parseExpr to evaluate other production
        this.tokenBank.push(currToken);
        return false;
      }
    }

    // 22. <StringExpr> -> " <CharList> "
    public parseStrExpr(): boolean{
      let currToken = this.tokenBank.pop();
      if(currToken.isEqual("T_OpenQuote")){
        // StringExpr found
        this.csTree.addBranchNode("StringExpr");
        this.printStage("parseStringExpr()");
        this.csTree.addLeafNode(currToken.tValue);
        if(this.parseCharList()){
          let currToken = this.tokenBank.pop();
          if(currToken.isEqual("T_CloseQuote")){
            this.csTree.addLeafNode(currToken.tValue);
            return true;
          } else{
            this.printError("T_CloseQuote", currToken);
            this.tokenBank.push(currToken);
            return false;
          }
        } // will always return true, empty char returns true
      } else{
        // return to parseExpr to evaluate other productions
        this.tokenBank.push(currToken);
        return false;
      }
    }

    // 23. <BooleanExpr> -> (<Expr> <boolop> <Expr>)
    // 24.               -> <boolval>
    public parseBoolExpr(): boolean{
      let currToken = this.tokenBank.pop();
      if(currToken.isEqual("T_OpenParen")){
        this.csTree.addBranchNode("BooleanExpr");
        this.printStage("parseBooleanExpr()");
        this.csTree.addLeafNode(currToken.tValue);
        if(this.parseExpr()){
          this.csTree.moveUp(); // to BoolExpr
          currToken = this.tokenBank.pop();
          // 33. <boolop> -> <==> | <!=>
          if(currToken.isEqual("T_NotEqual") || currToken.isEqual("T_Equal")){
            this.csTree.addBranchNode("boolop");
            this.csTree.addLeafNode(currToken.tValue);
            this.csTree.moveUp(); // to BoolExpr
            if(this.parseExpr()){
              this.csTree.moveUp(); // to BoolExpr
              currToken = this.tokenBank.pop();
              if(currToken.isEqual("T_CloseParen")){
                this.csTree.addLeafNode(currToken.tValue);
                return true;
              } else{
                // Expected [)]
                this.printError("T_CloseParen", currToken);
                this.tokenBank.push(currToken);
                return false;
              }
            }
            //Expected expr
            this.printError("Expr", currToken);
            return false;
          } else{
            this.printError("BoolOp", currToken);
            this.tokenBank.push(currToken);
            return false;
          }
        } 
        // Expected expr
        this.printError("Expr", currToken);
        return false;
      } else if(currToken.isEqual("T_BoolVal")){
        // 34. <boolval> -> <false> | <true>
        this.csTree.addBranchNode("BooleanExpr");
        this.csTree.addBranchNode("boolval");
        this.csTree.addLeafNode(currToken.tValue);
        this.csTree.moveUp(); // to BoolExpr
        return true; 
      } else{
        // previous function will handle errors
        this.tokenBank.push(currToken);
        return false;
      }
    } 
    
    /* 
     * 26. <CharList> -> <char> <CharList>
     * 27.            -> <space> <CharList>
     * 28.            -> end
     */
    public parseCharList(): boolean{
      this.csTree.addBranchNode("CharList");
      this.printStage("parseCharList()");
      let space:RegExp = /[ ]/;
      if(this.parseSpace() || this.parseChar()){
        return this.parseCharList();
      } else {
        while (this.csTree.current.value == "CharList"){
          this.csTree.moveUp();
        }
        return true;
      }
    }

    // 30. <char> -> a | b | ...
    public parseChar(): boolean{
      let currToken = this.tokenBank.pop();
      if(currToken.isEqual("T_Char")){
        this.csTree.addBranchNode("char");
        this.printStage("parseChar()");
        this.csTree.addLeafNode(currToken.tValue);
        this.csTree.moveUp(); // to CharList
        return true;
      } else{
        // can be empty string
        this.tokenBank.push(currToken);
        return false;
      }
    }

    // 31. <space> -> the space character
    public parseSpace(): boolean{
      let currToken = this.tokenBank.pop();
      if(currToken.isEqual("T_Space")){
        this.csTree.addBranchNode("space");
        this.printStage("parseSpace()");
        this.csTree.addLeafNode(currToken.tValue);
        this.csTree.moveUp(); // to CharList
        return true;
      } else{
        // can be empty string
        this.tokenBank.push(currToken);
        return false;
      }
    }

    // 25. <Id> -> <char>
    public parseId(): boolean{
      let currToken = this.tokenBank.pop();
      if(currToken.isEqual("T_Id")){
        this.csTree.addBranchNode("Id");
        this.printStage("parseId()");
        this.csTree.addLeafNode(currToken.tValue); 
        return true;
      } else{
        // previous function will report error
        this.tokenBank.push(currToken);
        return false;
      }
    }

    public printError(expectedVal: string, token: Token): void{
      if(!this.error){
        let log: HTMLInputElement = <HTMLInputElement> document.getElementById("log");
        log.value += "\n   PARSER --> ERROR! Expected [" + expectedVal + "] got [" + token.tid + "] with value '" 
                  + token.tValue + "' on line " + token.tLine + ", column " + token.tColumn;
        log.value += "\n   PARSER --> Parse failed with 1 error";                
        log.scrollTop = log.scrollHeight;
        this.error = true;
      }
    }
    
    public printStage(stage: string){
      if(_VerboseMode){
        let log: HTMLInputElement = <HTMLInputElement> document.getElementById("log");
        log.value += "\n   PARSER --> " + stage;
        log.scrollTop = log.scrollHeight;
      }
    }
  }
}