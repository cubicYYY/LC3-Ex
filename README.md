# LC-3 Ex Transpiler/Assembler
## About LC-3(Ex)
[Go to Wikipedia](https://en.wikipedia.org/wiki/Little_Computer_3)  
Put simply, it is a toy ISA for education, with very few instructions.
LC-3 Ex is the name I call my modified version of LC-3.
## What can this script do?
+ Assembler: Translate the LC-3(Ex) assembly into "machine code"
+ Transpiler: More instructions are supported. You can use this tool to "down-grade", or transpile the assembly with extended instructions to the native LC-3 language/machine code. That is to say, extended instructions are expanded.
**Disclaimer: It may be helpful for some homework/assignments, but never use it to cheat!**
## How to use it?
Just open the index.html file in your browser. Make sure you keep app.js in the same directory.
### Extended instructions supported
To understand the meaning of extended instructions, take x86 ISA as a reference.
+ putc(=out)
+ push
+ pop
+ test
+ move
+ set (assignment)
+ shl, sal
+ shr, sar (TODO)
