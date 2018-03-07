/* ------------
Tree.ts

Tree - Concrete Syntax Tree created by Parser
       and Abstract Syntax Tree created by Semantic Analyzer
Tree Node - Has a Value, Parent Node, and array of Children Nodes
------------ */

module Compiler {
    
  export class Tree {
    public root: TreeNode;
    public current: TreeNode;
    public outputTree: string;

    constructor(value) {
      this.root = new TreeNode(value, null);
      this.outputTree = "";
      this.current = this.root;
    }
    
    public addBranchNode(value): void{
      let node:TreeNode = new TreeNode(value, this.current);
      this.current.childrenNodes.push(node);
      this.current = node;
      console.log("branch" + value);
      // pretty tree out
      // let tmp = {
      //   text: {name: value},
      //   children:[

      //   ]
      // }
      // this.jsonTree.nodeStructure.children.push(tmp);
    }

    public addLeafNode(value): void{
      let node:TreeNode = new TreeNode(value, this.current);
      this.current.childrenNodes.push(node);
      console.log("leaf" + value);
    }

    public moveUp(): void{
      this.current = this.current.parentNode;
      console.log("current" + this.current.value);
    }

    public printTree(): void{
      var jsonTree = {
        chart: {
            container: "#pretty-tree"
        },
        
        nodeStructure: {
          text: { name: this.root.value },
          children: [
          ]
        }
      };
      this.walkTree(this.root, "", jsonTree.nodeStructure.children);
      let output: HTMLInputElement = <HTMLInputElement> document.getElementById("csTree");
      output.value += this.outputTree + "\n\n";
      let my_chart = new Treant(jsonTree);
    }

    // public displayTree(jsonTree): void{
    //   let my_chart = new Treant(this.jsonTree);
    // }

    public walkTree(node: TreeNode, indent:String, jsonLevel:Object): void{
      if(node != this.root){
        let jsonNode = {
          text: { name: node.value },
          children: [
          ]
        }
        jsonLevel.push(jsonNode);
        jsonLevel = jsonNode.children;
      }
      this.outputTree += indent + "<" + node.value + ">\n";
      let children = node.childrenNodes;
      if(children.length == 0){
        return;
      } else {
        for(let i=0; i<children.length; i++){
          // console.log(children[i]);
          this.walkTree(children[i], indent+"-", jsonLevel);
        }
        return;
      }
    }
  }

  export class TreeNode {
    public value: string;
    public parentNode: TreeNode;
    public childrenNodes: Array<TreeNode>;

    constructor(value:string, 
                parentNode:TreeNode){
      this.value = value;
      this. parentNode = parentNode;
      this.childrenNodes = new Array<TreeNode>();
    }
  }
}