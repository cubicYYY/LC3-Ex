// @ts-check
/**
 * @TODO A more clear notation for the token. (Similat to named tuple syntax)
 * Maybe a object with a constructor?
 */
/**
 * @TODO Remove redundant white lines.
 */
/**
 * @TODO A better implementation for the enum type.
 * Like the implementation in TypeScript.
 */
/**
 * @TODO Support downgrade assembling to LC-3 assembly (not onlt LC-3 binary).
 * (Can derive it from token stream)
 */
/**
 * @TODO Reusage of the token stream.
 */
/**
 * @TODO Do not random labels! Make a unique label by involving line numbers or token counter.
 */
/**
 * @TODO Optionally reserve comments.
 */
const PSEUDO_INSTRUCTIONS = createEnum(['orig', 'fill', 'stringz', 'blkw', 'end']);
const INSTRUCTIONS = createEnum([
  'add', 'and', 'not', 'ld', 'ldr', 'ldi', 'st', 'str',
  'sti', 'lea', 'trap', 'halt', 'getc', 'out', 'puts', 'in', 'putsp', 'jmp', 'ret',
  'rti', 'jsr', 'jsrr', 'br', 'brn', 'brz', 'brp', 'brnz', 'brnp', 'brzp', 'brnzp'
]);
const EXTENDED_INSTRUCTIONS = createEnum(['xor', 'or', 'mov', 'push',
  'pop', 'shr', 'shl', 'sal', 'sar', 'rol', 'ror', 'st', 'ld', 'putc',
  'mul', 'sub', 'div', 'cmp', 'test', 'set']);
// extended instructions may have the same name with basic instructions; but they support more digits (up to 16bits)
// but these ex_instructions should be handled in the normal instruction case; only called when normal instructions
// can't handle (throw Errors)

// NOTE: It may collides with native labels, so delete them
// when processing pure native LC-3 assembly.
const REGISTER_ID = createEnum(['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7']);
const TOKEN_TYPES = createEnum(['pseudo', 'label', 'instruction', 'register', 'number',
  'string', 'EOT', 'ex_instruction', 'nextline']);

/**
 * Translate assembly to binary machine code.
 */
function asm2bin() {
  // In case you need read from stdin:
  // // @ts-ignore
  // let asmCode = ``;
  // var fs = require('fs');
  // let machineCode = '';
  // process.stdin.on('readable', function () {
  //   var chunk = process.stdin.read();
  //   if (chunk) asmCode += chunk.toString();
  // });
  // process.stdin.on('end', function () {
  //   asmCode = asmCode.toString().trim();
  //   let st = onePass(asmCode);
  //   machineCode = onePass(asmCode, onePass(asmCode)).toString();
  //   console.log(machineCode.trim());
  // });

  // @ts-ignore
  let asmCode = document.getElementById('asmcode').value;
  asmCode = asmCode.toString().trim();
  let st = onePass(asmCode);
  let machineCode = onePass(asmCode, onePass(asmCode)).toString();
  // console.log(machineCode.trim());

  let outputElement = document.getElementById('lc3code');
  // @ts-ignore
  if (outputElement != null) outputElement.value = machineCode;
}

/**
 * Translate LC-3 Ex to native LC-3.
 */
function asmx2asm() {
  // @ts-ignore
  let asmXCode = document.getElementById('asmcode').value;
  let asmCode = '';
  try {
    let tokenStream = getTokenStream(asmXCode);
    let token = tokenStream.next().value;
    let firstArg = true;
    while (token[0] !== TOKEN_TYPES['EOT']) {
      let str = token[1].toString();
      if (token[0] === TOKEN_TYPES['pseudo']) str = '.' + str;
      else if (token[0] === TOKEN_TYPES['number']) str = '#' + str;
      else if (token[0] === TOKEN_TYPES['string']) str = '"' + str + '"';

      if (!firstArg) str = ' ' + str;
      if (token[0] === TOKEN_TYPES['nextline']) firstArg = true;
      else firstArg = false;
      asmCode += str;
      token = tokenStream.next().value;
    }


  } catch (err) {
    asmCode = err.message;
  }
  let outputElement = document.getElementById('lc3code');
  // @ts-ignore
  if (outputElement != null) outputElement.value = asmCode;
}

/**
 * A help function to create an enumeration project/set.
 * @param {Array} values
 * @return {Object}
 */
function createEnum(values) {
  const enumObject = {};
  for (const val of values)
    enumObject[val] = val;
  return Object.freeze(enumObject);

}

/**
 * A help function to create an enumeration project/set.
 * @param {String} prefix
 * @param {String} suffix
 * @param  {Number} [len=5]
 * @return {String}
 */
function getRandomLabel(prefix = '', suffix = '', len = 5) {
  let charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let charactersLength = charset.length;
  let result = '';
  for (let i = 0; i < len; i++) {
    result += charset.charAt(Math.floor(Math.random() * charactersLength));
  }
  return prefix + result + suffix;
}

/**
 * A closure to continually iterate tokens from a token stream, 
 * with type or range constraints.
 * @param {Iterator} tokenStream 
 * @returns 
 */
let expectTokenGen = function (tokenStream) {
  return function (allowedTypes, constraints = {}) {
    let subToken = tokenStream.next().value;
    // console.log(token);
    if (subToken[0] == TOKEN_TYPES['number'] && !isNaN(constraints['bits'])) {
      let num = subToken[1];
      let bits = constraints['bits'];
      if (num < -(2 ** (bits - 1)) || num >= 2 ** bits)
        throw new Error("Number out of range: " + num);
    }
    if (subToken[0] == TOKEN_TYPES['number'] && constraints['unsigned']) {
      let num = subToken[1];
      if (num < 0)
        throw new Error(`Unsigned number expected but negative number ${num} found.`);
    };
    return subToken;
  }

}

/**
 * A helper function to transform a number literal string into a number.
 * @param {String} numstr 
 * @return {Number} NaN means that it is not a valid number.
 */
function numberLiteral2Int(numstr) {
  let num = NaN;
  if (numstr.startsWith('#')) num = parseInt(numstr.slice(1), 10);
  else if (numstr.startsWith('x')) num = parseInt(numstr.slice(1), 16);
  else if (numstr.startsWith('b')) num = parseInt(numstr.slice(1), 2);
  return num;
}

/**
 * Translate a register into a 3-bits binary string.
 * @param {string} registerID
 * @return {string} 
 */
function register2bin(registerID) {
  let num = parseInt(registerID.slice(1));
  return num.toString(2).padStart(3, '0');
}

/**
 * Translate a number to a string in binary presentation format.
 * For negative numbers, convert to 2's complement form.
 * @param {number} num
 * @param {number} bits The target bit number;
 */
function num2bin(num, bits) {
  /** @TODO Verification enough?(Potential vulnerabilities) */
  if (num >= 0) return num.toString(2).padStart(bits, '0').slice(-bits);
  // 2's complement
  else return (num >>> 0).toString(2).padStart(bits, '1').slice(-bits);// >>>0 to be unsigned
}

/**
 * Search the code segment.
 * If symbolTable not given, figure out the symbol table and return it;
 * if symbolTable is given, return the code in the target form(asm(todo)/bin).
 * @param {string} asmCode
 * @param {object} symbolTable
 * @return {string|Array}
 */
function onePass(asmCode, symbolTable = undefined) {
  let insAddr = NaN;
  let tokenStream = getTokenStream(asmCode);
  let expectToken = expectTokenGen(tokenStream);
  let token = tokenStream.next().value;
  const isSymbolKnown = symbolTable !== undefined;
  symbolTable = symbolTable || [];
  let machineCode = '';

  function token2bin(token, bits, absAddr = false) {
    // console.log(token);
    function inRange(num, bits) {
      if (num < -(2 ** (bits - 1)) || num >= 2 ** bits)
        return false;
      return true;
    }
    let num;
    if (token[0] === TOKEN_TYPES['number'])
      num = token[1];
    else {
      let labelName = token[1];
      num = absAddr ? symbolTable[labelName] : symbolTable[labelName] - insAddr;
    }
    return num2bin(num, bits);
  }

  while (token[0] !== TOKEN_TYPES['EOT']) {
    // console.log(token);
    let subToken;
    switch (token[0]) {
      case TOKEN_TYPES['EOT']:
        break;
      case TOKEN_TYPES['pseudo']:
        switch (token[1]) {
          case PSEUDO_INSTRUCTIONS['blkw']: /** @TODO Overflow check */
            subToken = expectToken(TOKEN_TYPES['number']);
            if (isSymbolKnown)
              for (let _ = 0; _ < subToken[1]; _++)
                machineCode += '0111011101110111' + '\n';
            insAddr += subToken[1]; // length
            break;
          case PSEUDO_INSTRUCTIONS['stringz']:
            subToken = expectToken(TOKEN_TYPES['string']);
            if (isSymbolKnown) {
              for (let index = 0; index < subToken[1].length; index++)
                machineCode += num2bin(subToken[1].charCodeAt(index), 16) + '\n';
              machineCode += num2bin(0, 16) + '\n';
            }
            insAddr += subToken[1].length + 1; // Pre-allocate for '\0'
            break;
          case PSEUDO_INSTRUCTIONS['orig']: /** @TODO Multi segments support */
            subToken = expectToken(TOKEN_TYPES['number']);
            if (isSymbolKnown && isNaN(insAddr)) {
              machineCode += num2bin(subToken[1], 16) + '\n';
            }
            insAddr = subToken[1];
            break;
          case PSEUDO_INSTRUCTIONS['end']:
            insAddr = NaN;
            break;
          case PSEUDO_INSTRUCTIONS['fill']: /** @TODO label support */
            subToken = expectToken(TOKEN_TYPES['number']);
            if (isSymbolKnown) {
              machineCode += num2bin(subToken[1], 16) + '\n';
            }
            insAddr++;
            break;
        }
        break;
      case TOKEN_TYPES['instruction']:
        insAddr++;
        let argToken1;
        let argToken2;
        let argToken3;
        switch (token[1]) {
          case INSTRUCTIONS['add']:
            argToken1 = expectToken('register');
            argToken2 = expectToken('register');
            argToken3 = expectToken('register|number', { 'bits': 5 });

            if (isSymbolKnown) {
              machineCode += '0001';
              machineCode += register2bin(argToken1[1]);
              machineCode += register2bin(argToken2[1]);
              if (argToken3[0] === TOKEN_TYPES['register']) {
                machineCode += '000';
                machineCode += register2bin(argToken3[1]);
              } else {
                machineCode += '1';
                machineCode += num2bin(argToken3[1], 5);
              }
              machineCode += '\n';
            }
            break;
          case INSTRUCTIONS['and']:
            argToken1 = expectToken('register');
            argToken2 = expectToken('register');
            argToken3 = expectToken('register|number', { 'bits': 5 });

            if (isSymbolKnown) {
              machineCode += `0101${register2bin(argToken1[1])}${register2bin(argToken2[1])}`;
              if (argToken3[0] === TOKEN_TYPES['register'])
                machineCode += `000${register2bin(argToken3[1])}\n`;
              else
                machineCode += `1${num2bin(argToken3[1], 5)}\n`;
            } break;
          case INSTRUCTIONS['not']:
            argToken1 = expectToken('register');
            argToken2 = expectToken('register');
            if (isSymbolKnown)
              machineCode += `1001${register2bin(argToken1[1])}${register2bin(argToken2[1])}111111\n`;
            break;
          case INSTRUCTIONS['ld']:
            argToken1 = expectToken('register');
            argToken2 = expectToken('label|number');
            if (isSymbolKnown) {
              machineCode += `0010${register2bin(argToken1[1])}${token2bin(argToken2, 9)}\n`;
            }
            break;
          case INSTRUCTIONS['ldr']:
            argToken1 = expectToken('register');
            argToken2 = expectToken('register');
            argToken3 = expectToken('label|number');

            if (isSymbolKnown)
              machineCode +=
                `0110${register2bin(argToken1[1])}${register2bin(argToken2[1])}${token2bin(argToken3, 6)}\n`;
            break;
          case INSTRUCTIONS['ldi']:
            argToken1 = expectToken('register');
            argToken2 = expectToken('label|number');
            if (isSymbolKnown)
              machineCode += `1010${register2bin(argToken1[1])}${token2bin(argToken2, 9)}\n`;
            break;
          case INSTRUCTIONS['st']:
            argToken1 = expectToken('register');
            argToken2 = expectToken('label|number');
            if (isSymbolKnown)
              machineCode += `0011${register2bin(argToken1[1])}${token2bin(argToken2, 9)}\n`;
            break;
          case INSTRUCTIONS['str']:
            argToken1 = expectToken('register');
            argToken2 = expectToken('register');
            argToken3 = expectToken('label|number');
            if (isSymbolKnown)
              machineCode +=
                `0111${register2bin(argToken1[1])}${register2bin(argToken2[1])}${token2bin(argToken3, 6)}\n`;
            break;
          case INSTRUCTIONS['sti']:
            argToken1 = expectToken('register');
            argToken2 = expectToken('label|number');
            if (isSymbolKnown)
              machineCode += `1011${register2bin(argToken1[1])}${token2bin(argToken2, 9)}\n`;
            break;
          case INSTRUCTIONS['lea']:
            argToken1 = expectToken('register');
            argToken2 = expectToken('label|number');
            if (isSymbolKnown)
              machineCode += `1110${register2bin(argToken1[1])}${token2bin(argToken2, 9)}\n`;
            break;
          /* trap series */
          case INSTRUCTIONS['trap']:
            argToken1 = expectToken('number', { 'bits': 12 });
            machineCode += `1111${num2bin(argToken1[1], 12)}\n`;
            break;
          case INSTRUCTIONS['getc']: // == trap x20
            machineCode += '1111000000100000\n';
            break;
          case INSTRUCTIONS['out']: // == trap x21
            machineCode += '1111000000100001\n';
            break;
          case INSTRUCTIONS['puts']: // == trap x22
            machineCode += '1111000000100010\n';
            break;
          case INSTRUCTIONS['in']: // == trap x23
            machineCode += '1111000000100011\n';
            break;
          case INSTRUCTIONS['putsp']: // == trap x24
            machineCode += '1111000000100100\n';
            break;
          case INSTRUCTIONS['halt']: // == trap x25
            machineCode += '1111000000100101\n';
            break;
          /* branching series */
          case INSTRUCTIONS['jmp']:
            argToken1 = expectToken('register');
            machineCode += `1100000${register2bin(argToken1[1])}000000\n`;
            break;
          case INSTRUCTIONS['ret']: // == jmp R7
            machineCode += '1100000111000000\n';
            break;
          case INSTRUCTIONS['rti']:
            machineCode += '1000000000000000\n';
            break;
          case INSTRUCTIONS['jsr']:
            argToken1 = expectToken('label|number');
            if (isSymbolKnown)
              machineCode += `01001${token2bin(argToken1, 11)}\n`;
            break;
          case INSTRUCTIONS['jsrr']:
            argToken1 = expectToken('register');
            if (isSymbolKnown)
              machineCode += `0100000${register2bin(argToken1[1])}000000\n`;
            break;

          case INSTRUCTIONS['br']:
          case INSTRUCTIONS['brnzp']:
          case INSTRUCTIONS['brn']:
          case INSTRUCTIONS['brz']:
          case INSTRUCTIONS['brp']:
          case INSTRUCTIONS['brnz']:
          case INSTRUCTIONS['brnp']:
          case INSTRUCTIONS['brzp']:
            let n = token[1].indexOf('n') !== -1 ? '1' : '0';
            let z = token[1].indexOf('z') !== -1 ? '1' : '0';
            let p = token[1].indexOf('p') !== -1 ? '1' : '0';
            if (n === '0' && z === '0' && p === '0')
              n = z = p = '1';
            argToken1 = expectToken('label|number');
            if (isSymbolKnown)
              machineCode += `0000${n}${z}${p}${token2bin(argToken1, 9)}\n`;
            break;
        }
        break;
      case TOKEN_TYPES['ex_instruction']:
        break;
      case TOKEN_TYPES['label']:
        if (!isSymbolKnown) {
          symbolTable[token[1]] = insAddr;
        }
        break;
      case TOKEN_TYPES['nextline']:
        break;
    }
    token = tokenStream.next().value;
  }

  if (!isSymbolKnown)
    return symbolTable;
  else
    return machineCode;

}

/**
 * @param {String} asmCode 
 * @returns Token stream
 */
function* getTokenStream(asmCode) {
  // like a pipeline. Pick all the tokens and replace/expand properly.
  let basicIter = basicAsmCodeIter(asmCode);
  let expectToken = expectTokenGen(basicIter);
  let token = basicIter.next().value;
  function* exInstructionAdapter(name) {
    let replaceGadget = '';
    let argToken1;
    let argToken2;
    let argToken3;
    let r1, r2, r3;
    let num;
    /** NOTE: Make sure that every gadget ends with a instruction to the first arg. 
     * to ensure that Condition Code (nzp) works!*/
    switch (name) { /** @TODO merge with existing expectToken() function*/
      case EXTENDED_INSTRUCTIONS['or']:
        r1 = expectToken('register')[1];
        r2 = expectToken('register')[1];
        argToken3 = expectToken('register|number', { 'bits': 5 });/** @TODO number support*/
        if (argToken3[0] === TOKEN_TYPES['register']) {
          r3 = argToken3[1];
          if (r2 === r3) {
            replaceGadget = `ADD ${r1}, ${r2}, #0`;
          } else {
            replaceGadget = `NOT ${r2},${r2}
            NOT ${r3},${r3}
            AND ${r1},${r2},${r3}`;
            if (r1 !== r2) replaceGadget += `\n NOT ${r2},${r2}`;
            if (r1 !== r3) replaceGadget += `\n NOT ${r3},${r3}`;
            replaceGadget += `NOT ${r1},${r1}`;
          }
        } else if (argToken3[0] === TOKEN_TYPES['number']) {
          num = argToken3[1];
          replaceGadget = `AND ${r1},${r1}, #0
            ADD ${r1},${r1},${num}
            NOT ${r1},${r1}
            NOT ${r2},${r2}
            AND ${r1},${r1},${r2}`;
          if (r1 !== r2) replaceGadget += `\n NOT ${r2},${r2}`;
          replaceGadget += `NOT ${r1},${r1}`;
        }
        break;
      case EXTENDED_INSTRUCTIONS['putc']:
        replaceGadget = `out`
        break;
      case EXTENDED_INSTRUCTIONS['push']:
        r1 = expectToken('register')[1];
        replaceGadget = `ADD r6, r6, #-1
            STR ${r1}, r6, #0`;
        break;
      case EXTENDED_INSTRUCTIONS['pop']:
        r1 = expectToken('register')[1];
        replaceGadget = `LDR ${r1}, r6, #0
          ADD r6, r6, #1`;
        break;
      case EXTENDED_INSTRUCTIONS['test']:
        r1 = expectToken('register')[1];
        replaceGadget = `ADD ${r1}, ${r1}, #0`;
        break;
      case EXTENDED_INSTRUCTIONS['mov']:
        r1 = expectToken('register')[1];
        r2 = expectToken('register')[1];
        replaceGadget = `AND ${r1}, ${r1}, #0
        ADD ${r1}, ${r2}, #0`;
        break;
      case EXTENDED_INSTRUCTIONS['set']: /** @TODO More digits */
        r1 = expectToken('register')[1];
        num = expectToken('number')[1];
        if (num >= -(2 ** (5 - 1)) && num < 2 ** 5) {
          replaceGadget = `AND ${r1}, ${r1}, #0`;
          if (num !== 0) replaceGadget += `\nADD ${r1}, ${r1}, ${num}`;
        } else {
          let enumLabel = getRandomLabel(`ENUM_${r1}_`, '', 3);
          replaceGadget = `LD ${r1},${enumLabel}
          BR #1
          ${enumLabel} .fill #${num}`;
        }
        break;
      case EXTENDED_INSTRUCTIONS['shl']:
      case EXTENDED_INSTRUCTIONS['sal']:
        r1 = expectToken('register')[1];
        argToken2 = expectToken('register|number', { 'unsigned': true });
        if (argToken2[0] === TOKEN_TYPES['number']) {
          replaceGadget = `ADD ${r1}, ${r1}, ${r1}\n`;
          replaceGadget = replaceGadget.repeat(argToken2[1]);
        } else {
          r2 = argToken2[1];
          let shlStartLabel = getRandomLabel('LEFTSHIFT_');
          let shlEndLabel = getRandomLabel('LEFTSHIFT_DONE_');
          replaceGadget = `PUSH ${r2}
          ${shlStartLabel} TEST ${r2}
          BRnz ${shlEndLabel}
          ADD ${r2}, ${r2}, #-1
          ADD ${r1}, ${r1}, ${r1}
          BR ${shlStartLabel}
          ${shlEndLabel} POP ${r2}`;
        }
        break;
      default:
        throw new Error('Unsupported extended instruction: ' + name);
    }
    replaceGadget += '\n';
    let replaceIter = getTokenStream(replaceGadget);
    let replaceToken = replaceIter.next().value;
    while (replaceToken[0] !== TOKEN_TYPES['EOT']) {
      yield replaceToken;
      replaceToken = replaceIter.next().value;
    }
  }
  while (token[0] !== TOKEN_TYPES['EOT']) {
    if (TOKEN_TYPES[token[0]] !== TOKEN_TYPES['ex_instruction']) {
      yield token;
    } else yield* exInstructionAdapter(token[1]);
    token = basicIter.next().value;
  }
  return [TOKEN_TYPES['EOT'], ''];
}

/**
 * A closure for generating a token stream from assembly code.
 * @param  {String} asmCode The given assembly code.
 */
function* basicAsmCodeIter(asmCode) {
  let nowPos = 0;
  let isTokenSeparator = function (/** @type {String} */ char) {
    if (char == ' ' || char == '\t' || char == '\n' || char == '\r' || char == undefined) return true;
    if (char == ',' || char == ';') return true;
    return false;
  }
  while (true) {
    let currentChar = asmCode[nowPos];
    while (isTokenSeparator(currentChar) && currentChar != '\n' && currentChar != undefined && asmCode[nowPos] != ';') {
      nowPos++;
      currentChar = asmCode[nowPos];
    }
    nowPos++;
    if (currentChar == undefined) { // End of file
      return [TOKEN_TYPES['EOT'], ''];
    } else if (currentChar == '\n') {
      yield [TOKEN_TYPES['nextline'], '\n'];
      while (asmCode[nowPos] === '\n') nowPos++;
    } else if (currentChar == ';') { // comment, try to start at the next line
      while (asmCode[nowPos] != '\n' && asmCode[nowPos] != undefined)
        nowPos++;
      continue;
    } else if (currentChar == '.') { // pseudo-instruction
      let pseudoName = '';
      while (!isTokenSeparator(asmCode[nowPos])) {
        pseudoName += asmCode[nowPos];
        nowPos++;
      }
      pseudoName = pseudoName.toLowerCase();
      yield [TOKEN_TYPES['pseudo'], PSEUDO_INSTRUCTIONS[pseudoName]];
    } else if (currentChar == '"') { // string
      let strLiteral = '';
      while (asmCode[nowPos] != '"' && asmCode[nowPos] != undefined && asmCode[nowPos] != '\n') {
        strLiteral += asmCode[nowPos];
        nowPos++;
      }
      nowPos++;
      yield [TOKEN_TYPES['string'], strLiteral];
    } else {
      let literal = currentChar;
      while (!isTokenSeparator(asmCode[nowPos])) {
        literal += asmCode[nowPos];
        nowPos++;
      }
      let lowerCasedLiteral = literal.toLowerCase();
      if (INSTRUCTIONS[lowerCasedLiteral] !== undefined) // instruction(basic)
        yield [TOKEN_TYPES['instruction'], INSTRUCTIONS[lowerCasedLiteral]];
      else if (EXTENDED_INSTRUCTIONS[lowerCasedLiteral] !== undefined) // instruction(extended)
        yield [TOKEN_TYPES['ex_instruction'], EXTENDED_INSTRUCTIONS[lowerCasedLiteral]];
      else if (REGISTER_ID[lowerCasedLiteral] !== undefined) // register id
        yield [TOKEN_TYPES['register'], REGISTER_ID[lowerCasedLiteral]];
      else {
        let toNum = numberLiteral2Int(lowerCasedLiteral);
        if (!isNaN(toNum)) // number
          yield [TOKEN_TYPES['number'], toNum];
        else yield [TOKEN_TYPES['label'], literal]; // MUST NOT be lowercased!
      }

    }

  }
  return [TOKEN_TYPES['EOT'], ''];
};
// asm2bin();