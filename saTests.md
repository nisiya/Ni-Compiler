# Test Cases

## Valid Programs

### VarDecl, Assignment, While, Print Id, Multiple Blocks
```java
  /* Long Test Case - Everything Except Boolean Declaration */
  {
    /* Int Declaration */
    int a
    int b
  {
    a = 0
    b = 0
  }

  while (a != 3) {
    print(a)
    b = 0
    a = 1 + a
  }
  b=1+a
  }$
```

### If, Print String
```java
/* Long Test Case - Everything Except Boolean Declaration */
{
if (a != 3) {
  print("hello")
  b = 0
  a = 1 + a
}
b=1+a
}$
```
### Nested boolExpr
#### Passed
```java
{
    int a
    int b
    a = 0
    b = 0
    if(false != (true == (a == 2))){
        print(a)
    }
}
```
#### Failed
```java
{
    string a
    int b
    // undeclared variable c
    if ((c == "string") != (a==("hello" == "wendy"))){
        a = "wendy"
    }
}
```

## Failed Programs
### undeclared error
```java
{
  int a
  int b
  c = 0 // undeclared error
}$
```

### type mismatched
```java
{
  int a
  a = "hello" // type mismatched error
}$
```

###  out-of-scope error
```java
{
  int a
  int b
  {
    int c
    a = 0
    b = 0
  }
  c = 0 // out-of-scope error
}$
```

### Invalid intexpr
```java
{
    int a
    a = 4
    a = 1 + "there" // operand needs to be int
}$
```

## Warning Programs
```java
{
  int a
  print(a)
}$
```

## Mixture

### Chain of Blocks
```java
{stringa}${a="block"}${print(a)}${while(b!=8){a="blockblock"}}${iffalse{print("blockblockblock")}}$

// Prg | Lex | Parse | SA
//  1     P      P      P
//  2     P      P      F-Undeclared
//  3     P      P      F-Undeclared
//  4     P      P      F-Undeclared
//  5     P      P      P
```

### Print statements
```java
{
    int a
    print(a)
    print("thhis")
    print(1+a)
    print(true)
    print((true == false))
}
```

## Good Test cases (by Tien)
### Lots of warnings
```java
/* THIS DOES NOT FAIL */

/* This is is show the warning
 - printing capabilities of this
 - Semantic Analyzer */
{
    int a
    boolean b
    {
        int d
    }
    {
        boolean e
        string f
        f = "terhe is"
        {
            int g
            int h
            h = 4
            int j
            int k
        }
    }
    string c
    {
    boolean g
    b = true
    }
}$
```

### Boolean hell && string == boolean
```java
/* Assuming you get past Boolean Hell
 - there is a boolean being compared to
 - a string which will cause a type error */
{
    int a
    a = 4
    boolean b
    b = true
    boolean c
    string d
    d = "there is no spoon"
    c = (d != "there is a spoon")
    if(c == (false != (b == (true == (a == 3+1))))) {
        print((b != d))
    }
}$
```