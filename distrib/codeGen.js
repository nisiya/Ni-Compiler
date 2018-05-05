///<reference path="globals.ts" />
///<reference path="tree.ts" />
///<reference path="scopeTree.ts" />
/* ------------
codeGen.ts
Requires global.ts, tree.ts, scopeTree.ts
------------ */
var Compiler;
(function (Compiler) {
    var CodeGen = /** @class */ (function () {
        function CodeGen() {
            this.ACC = ["A9", "AD"];
            this.XREG = ["A2", "AE"];
            this.YREG = ["A0", "AC"];
        }
        CodeGen.prototype.start = function (asTree, scopeTree) {
            this.asTree = asTree;
            this.code = new Array();
            this.tempStringMem = new Array();
            this.tempNum = 0;
            this.jumpNum = 0;
            this.staticTable = new Map();
            this.jumpTable = new Map();
            this.currentScope = scopeTree.root;
            this.varOffset = 0;
            // front load the true and false values
            this.addString("false");
            this.falseAddr = 255 - this.tempStringMem.length;
            this.addString("true");
            this.trueAddr = 255 - this.tempStringMem.length;
            this.handleBlock(asTree.root);
            this.addBreak();
            this.handleBackpatch();
            // add 00s
            while (this.code.length + this.tempStringMem.length < 255) {
                this.code.push("00");
            }
            // append strings to the end
            while (this.tempStringMem.length > 0) {
                this.code.push(this.tempStringMem.pop());
            }
            console.log(this.staticTable);
            if (this.code.length > 256) {
                return null;
            }
            else {
                return this.code;
            }
        };
        CodeGen.prototype.handleBlock = function (blockNode) {
            var childScopeIndex = 0;
            var tempScope = this.currentScope;
            for (var i = 0; i < blockNode.childrenNodes.length; i++) {
                var childNode = blockNode.childrenNodes[i];
                if (childNode.value == "Block") {
                    this.currentScope = tempScope.childrenScopes[childScopeIndex];
                    this.handleBlock(childNode);
                    childScopeIndex++;
                }
                else {
                    this.createCode(childNode);
                }
            }
            this.currentScope = tempScope;
        };
        CodeGen.prototype.createCode = function (currentNode) {
            switch (currentNode.value) {
                case "VarDecl":
                    this.createVarDecl(currentNode);
                    break;
                case "Assign":
                    this.createAssign(currentNode);
                    break;
                case "while":
                    // this.createWhile(currentNode);
                    break;
                case "if":
                    this.createIf(currentNode);
                    break;
                case "print":
                    this.createPrint(currentNode);
                    break;
                case "NotEqual":
                    break;
                case "Equal":
                    break;
            }
        };
        CodeGen.prototype.addToStatic = function (id, type) {
            var tempAddr = "T" + this.tempNum + " XX";
            this.staticTable.set(id + "@" + this.currentScope.level, [type, tempAddr, this.varOffset]);
            this.tempNum++;
            this.varOffset++;
            return tempAddr;
        };
        CodeGen.prototype.addToJump = function () {
            var jumpKey = "J" + this.jumpNum;
            this.jumpTable.set(jumpKey, 0);
            this.code.push("D0");
            this.code.push(jumpKey);
            this.jumpNum++;
            return this.code.length - 1;
        };
        CodeGen.prototype.createVarDecl = function (varDeclNode) {
            var id = varDeclNode.childrenNodes[1].value;
            var type = varDeclNode.childrenNodes[0].value;
            var tempAddr = this.addToStatic(id, type);
            if (type != "string") {
                this.loadRegConst(0, this.ACC[0]);
                this.storeAcc(tempAddr);
            } // else load the string pointer when initialized
        };
        CodeGen.prototype.addString = function (value) {
            this.tempStringMem.push("00"); // will add to code at the end
            for (var i = value.length - 1; i >= 0; i--) {
                var asciiVal = value.charCodeAt(i);
                this.tempStringMem.push(asciiVal.toString(16).toUpperCase());
            }
        };
        CodeGen.prototype.createAssign = function (assignNode) {
            // identify value to be loaded
            var id = assignNode.childrenNodes[0].value;
            var varType = this.createExpr(assignNode.childrenNodes[1], this.ACC);
            var tempAddr;
            if (varType == "string") {
                tempAddr = this.addToStatic(id, "string");
            }
            else {
                // find temp address
                tempAddr = this.findTempAddr(id);
            }
            // store value to temp address
            this.storeAcc(tempAddr);
        };
        CodeGen.prototype.createPrint = function (printNode) {
            var varType = this.createExpr(printNode.childrenNodes[0], this.YREG);
            console.log(varType);
            if (varType == "int") {
                this.loadRegConst(1, this.XREG[0]);
            }
            else {
                this.loadRegConst(2, this.XREG[0]);
            }
            this.systemCall();
        };
        CodeGen.prototype.findType = function (id) {
            var locInfo = this.staticTable.get(id + "@" + this.currentScope.level);
            if (locInfo == null) {
                var tempScope = this.currentScope.parentScope;
                while (locInfo == null) {
                    locInfo = this.staticTable.get(id + "@" + tempScope.level);
                    tempScope = tempScope.parentScope;
                }
            }
            return locInfo[0];
        };
        CodeGen.prototype.calculateSum = function (additionNode) {
            var isDigit = /^[0-9]$/;
            // load Acc with value
            var digit = additionNode.childrenNodes[0].value;
            this.loadRegConst(parseInt(digit), this.ACC[0]);
            // store at temp address
            var tempAddr = "T" + this.tempNum + " XX";
            this.storeAcc(tempAddr);
            this.staticTable.set("Temp" + this.tempNum, ["int", tempAddr, this.varOffset]);
            this.tempNum++;
            this.varOffset++;
            var sumAddr = tempAddr;
            var rightOperand = additionNode.childrenNodes[1];
            // check for more addition
            while (rightOperand.value == "Add") {
                console.log("Add");
                // load Acc with value
                digit = rightOperand.childrenNodes[0].value;
                this.loadRegConst(parseInt(digit), this.ACC[0]);
                // add value from sum storage
                this.addAcc(sumAddr);
                // store value back to sum storage
                this.storeAcc(sumAddr);
                rightOperand = rightOperand.childrenNodes[1];
            }
            // the last value in IntExpr
            if (isDigit.test(rightOperand.value)) {
                // load Acc with value
                digit = rightOperand.childrenNodes[0].value;
                this.loadRegConst(parseInt(digit), this.ACC[0]);
                // add value from sum storage
                this.addAcc(sumAddr);
            }
            else {
                var varAddr = this.findTempAddr(rightOperand.value);
                this.addAcc(varAddr);
            }
            this.storeAcc(sumAddr);
            return sumAddr;
        };
        CodeGen.prototype.findTempAddr = function (id) {
            console.log(this.currentScope);
            var locInfo = this.staticTable.get(id + "@" + this.currentScope.level);
            if (locInfo == null) {
                var tempScope = this.currentScope.parentScope;
                while (locInfo == null) {
                    locInfo = this.staticTable.get(id + "@" + tempScope.level);
                    tempScope = tempScope.parentScope;
                }
            }
            return locInfo[1];
        };
        CodeGen.prototype.createIf = function (ifNode) {
            this.createBool(ifNode.childrenNodes[0]);
            var jumpNdx = this.addToJump();
            this.handleBlock(ifNode.childrenNodes[1]);
            this.code[jumpNdx] = this.decimalToHex(this.code.length - jumpNdx - 2);
        };
        CodeGen.prototype.createBool = function (boolNode) {
            var tempAddr;
            if (boolNode.value == "true") {
                this.loadRegConst(this.trueAddr, this.XREG[0]);
                this.compareX(this.decimalToHex(this.trueAddr) + " 00");
            }
            else if (boolNode.value == "false") {
                this.loadRegConst(this.falseAddr, this.XREG[0]);
                this.compareX(this.decimalToHex(this.falseAddr) + " 00");
            }
            else {
                var var1Type = this.createExpr(boolNode.childrenNodes[0], this.XREG);
                var var2Node = boolNode.childrenNodes[1];
                var isId = /^[a-z]$/;
                var isDigit = /^[0-9]$/;
                var isString = /^\"[a-zA-Z]*\"$/;
                if (isString.test(var2Node.value)) {
                    this.addString(var2Node.value.substring(1, var2Node.value.length - 1)); // ignore the quotes
                    var stringPointer = 255 - this.tempStringMem.length;
                    this.loadRegConst(stringPointer, this.ACC[0]); // pointer to string
                    tempAddr = this.addToStatic("string" + this.tempNum, "string");
                }
                else if (var2Node.value == "true") {
                    tempAddr = this.decimalToHex(this.trueAddr) + " 00";
                }
                else if (var2Node.value == "false") {
                    tempAddr = this.decimalToHex(this.falseAddr) + " 00";
                }
                else if (isId.test(var2Node.value)) {
                    tempAddr = this.findTempAddr(var2Node.value);
                }
                else if (isDigit.test(var2Node.value)) {
                    var intValue = parseInt(var2Node.value);
                    this.loadRegConst(intValue, this.ACC[0]);
                    tempAddr = this.addToStatic(var2Node.value + "" + this.tempNum, "int");
                }
                else if (var2Node.value == "Add") {
                    tempAddr = this.calculateSum(var2Node);
                }
                this.compareX(tempAddr);
            }
        };
        CodeGen.prototype.createExpr = function (exprNode, register) {
            var isId = /^[a-z]$/;
            var isDigit = /^[0-9]$/;
            var isString = /^\"[a-zA-Z]*\"$/;
            // identify value to be loaded
            var value = exprNode.value;
            if (isString.test(value)) {
                this.addString(value.substring(1, value.length - 1)); // ignore the quotes
                var stringPointer = 255 - this.tempStringMem.length;
                this.loadRegConst(stringPointer, register[0]); // pointer to string
                return "string";
            }
            else if (value == "true") {
                this.loadRegConst(this.trueAddr, register[0]);
                return "boolean";
            }
            else if (value == "false") {
                this.loadRegConst(this.falseAddr, register[0]);
                return "boolean";
            }
            else if (isId.test(value)) {
                var varAddr = this.findTempAddr(value);
                this.loadRegMem(varAddr, register[1]);
                return this.findType(value);
            }
            else if (isDigit.test(value)) {
                // convert value to hex
                var intValue = parseInt(value);
                this.loadRegConst(intValue, register[0]);
                return "int";
            }
            else if (value == "Add") {
                var sumAddr = this.calculateSum(exprNode);
                // sumAddr is where the result of the addtion is
                this.loadRegMem(sumAddr, register[1]);
                return "int";
            }
        };
        CodeGen.prototype.handleBackpatch = function () {
            console.log(this.code);
            var staticKeys = this.staticTable.keys();
            var key = staticKeys.next();
            var tempTable = new Map();
            while (!key.done) {
                var locInfo = this.staticTable.get(key.value);
                tempTable.set(locInfo[1], locInfo[2] + this.code.length);
                key = staticKeys.next();
            }
            console.log(this.code);
            console.log(tempTable);
            // this.backpatch(tempTable);
        };
        CodeGen.prototype.backpatch = function (tempTable) {
            var isTemp = /^T/;
            for (var i = 0; i < this.code.length; i++) {
                console.log("code " + this.code[i]);
                if (isTemp.test(this.code[i])) {
                    console.log("replace " + this.code[i]);
                    var staticKeys = this.code[i] + " " + this.code[i + 1];
                    var index = tempTable.get(staticKeys);
                    this.code[i] = this.decimalToHex(index);
                    this.code[i + 1] = "00";
                }
            }
        };
        CodeGen.prototype.decimalToHex = function (value) {
            if (value < 16) {
                return "0" + value.toString(16).toUpperCase();
            }
            else {
                return value.toString(16).toUpperCase();
            }
        };
        CodeGen.prototype.loadRegConst = function (value, register) {
            this.code.push(register);
            this.code.push(this.decimalToHex(value));
        };
        CodeGen.prototype.loadRegMem = function (tempAddr, register) {
            this.code.push(register);
            var memAddr = tempAddr.split(" ");
            this.code.push(memAddr[0]);
            this.code.push(memAddr[1]);
        };
        CodeGen.prototype.storeAcc = function (tempAddr) {
            this.code.push("8D");
            var memAddr = tempAddr.split(" ");
            this.code.push(memAddr[0]);
            this.code.push(memAddr[1]);
        };
        CodeGen.prototype.addAcc = function (tempAddr) {
            this.code.push("6D");
            var memAddr = tempAddr.split(" ");
            this.code.push(memAddr[0]);
            this.code.push(memAddr[1]);
        };
        CodeGen.prototype.noOperation = function () {
            this.code.push("EA");
        };
        CodeGen.prototype.addBreak = function () {
            this.code.push("00");
        };
        CodeGen.prototype.compareX = function (tempAddr) {
            this.code.push("EC");
            var memAddr = tempAddr.split(" ");
            this.code.push(memAddr[0]);
            this.code.push(memAddr[1]);
        };
        CodeGen.prototype.incrementByte = function (tempAddr) {
            this.code.push("EE");
            var memAddr = tempAddr.split(" ");
            this.code.push(memAddr[0]);
            this.code.push(memAddr[1]);
        };
        CodeGen.prototype.systemCall = function () {
            this.code.push("FF");
        };
        return CodeGen;
    }());
    Compiler.CodeGen = CodeGen;
})(Compiler || (Compiler = {}));
