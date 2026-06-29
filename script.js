/**
 * Advanced Lexical Processing Engine with Dynamic Neon Layout Shifting
 */
const MODES = { NORMAL: 0, SHIFT: 1, ALPHA: 2 };
const ANGLE_MODES = { DEG: 'DEG', RAD: 'RAD' };

let systemState = {
    inputMode: MODES.NORMAL,
    angleMode: ANGLE_MODES.DEG,
    memory: { ANS: 0, X: 0, Y: 0, M: 0 }
};

let tokenStream = [];

const domMain = document.getElementById('main-display');
const domHist = document.getElementById('history-display');
const domShiftInd = document.getElementById('shift-indicator');
const domAlphaInd = document.getElementById('alpha-indicator');
const domAngleInd = document.getElementById('angle-indicator');

const KEY_MAP = {
    '0': { type: 'NUM', val: '0', disp: '0' },
    '1': { type: 'NUM', val: '1', disp: '1' },
    '2': { type: 'NUM', val: '2', disp: '2' },
    '3': { type: 'NUM', val: '3', disp: '3' },
    '4': { type: 'NUM', val: '4', disp: '4' },
    '5': { type: 'NUM', val: '5', disp: '5' },
    '6': { type: 'NUM', val: '6', disp: '6' },
    '7': { type: 'NUM', val: '7', disp: '7' },
    '8': { type: 'NUM', val: '8', disp: '8' },
    '9': { type: 'NUM', val: '9', disp: '9' },
    'DOT': { type: 'NUM', val: '.', disp: '.' },
    'ADD': { type: 'OP', val: '+', disp: '+', prec: 1, assoc: 'L' },
    'SUB': { type: 'OP', val: '-', disp: '-', prec: 1, assoc: 'L' },
    'MUL': { type: 'OP', val: '*', disp: '×', prec: 2, assoc: 'L' },
    'DIV': { type: 'OP', val: '/', disp: '÷', prec: 2, assoc: 'L' },
    'POWER': { type: 'OP', val: '^', disp: '^', prec: 3, assoc: 'R' },
    'SQUARE': { type: 'POST_OP', val: 'sq', disp: '²' },
    'X_MINUS_1': { type: 'POST_OP', val: 'inv', disp: '⁻¹' },
    'L_PAREN': { type: 'LPAREN', val: '(', disp: '(' },
    'R_PAREN': { type: 'RPAREN', val: ')', disp: ')' },
    'SIN': { type: 'FUNC', val: 'sin', disp: 'sin(' },
    'COS': { type: 'FUNC', val: 'cos', disp: 'cos(' },
    'TAN': { type: 'FUNC', val: 'tan', disp: 'tan(' },
    'SQRT': { type: 'FUNC', val: 'sqrt', disp: '√(' },
    'LOG': { type: 'FUNC', val: 'log10', disp: 'log(' },
    'LN': { type: 'FUNC', val: 'ln', disp: 'ln(' },
    'ANS': { type: 'VAR', val: 'ANS', disp: 'Ans' },
    'EXP': { type: 'SCI_NOT', val: 'E', disp: '×10^' },
    'NEG': { type: 'UNARY_MINUS_REQ', val: '-', disp: '-' }, 
    'M_PLUS': { type: 'MEM_ACTION', val: 'M+', disp: 'M+' },
    'FRACTION': { type: 'FUNC', val: 'frac', disp: 'frac(' }, 
    'LOG_BASE': { type: 'FUNC', val: 'logbase', disp: 'log_base(' },
    'INTEGRAL': { type: 'FUNC', val: 'int', disp: '∫(' },
    'CALC': { type: 'ACTION', val: 'CALC', disp: 'CALC' },
    'DEGREE': { type: 'POST_OP', val: 'deg', disp: '°' },
    'HYP': { type: 'FUNC', val: 'hyp', disp: 'sinh(' },
    'SD': { type: 'ACTION', val: 'SD', disp: 'S⇔D' },
    'RCL': { type: 'ACTION', val: 'RCL', disp: 'RCL' }
};

const SHIFT_MAP = {
    'SIN': { type: 'FUNC', val: 'asin', disp: 'sin⁻¹(' },
    'COS': { type: 'FUNC', val: 'acos', disp: 'cos⁻¹(' },
    'TAN': { type: 'FUNC', val: 'atan', disp: 'tan⁻¹(' },
    'EXP': { type: 'VAR', val: 'PI', disp: 'π' },
    'X_MINUS_1': { type: 'POST_OP', val: 'fact', disp: '!' }
};

const ALPHA_MAP = {
    'L_PAREN': { type: 'VAR', val: 'X', disp: 'X' },
    'R_PAREN': { type: 'VAR', val: 'Y', disp: 'Y' },
    'M_PLUS': { type: 'VAR', val: 'M', disp: 'M' }
};

/**
 * Triggers the neon flashing animation across the hardware layout modules
 */
function runNeonAnimationEffects(event) {
    const calcBody = document.getElementById('calc-body');
    const screenBox = document.getElementById('screen-box');
    
    // Pulse the main framework modules
    calcBody.classList.add('neon-pulse');
    screenBox.classList.add('neon-glow');
    
    // Find the targeted active key and apply flash
    if (event && event.currentTarget) {
        const structuralBtn = event.currentTarget;
        structuralBtn.classList.add('neon-tap');
        setTimeout(() => structuralBtn.classList.remove('neon-tap'), 120);
    }

    // Decay animation timers safely
    setTimeout(() => {
        calcBody.classList.remove('neon-pulse');
        screenBox.classList.remove('neon-glow');
    }, 180);
}

function isValidSequence(prev, next) {
    if (!prev) {
        if (next.type === 'OP' && next.val !== '-') return false;
        if (next.type === 'POST_OP') return false;
        return true;
    }
    if (prev.type === 'OP' && next.type === 'OP') return false;
    if (prev.type === 'OP' && next.type === 'RPAREN') return false;
    if (prev.type === 'LPAREN' && next.type === 'OP' && next.val !== '-') return false;
    if (prev.type === 'NUM' && prev.val === '.' && next.val === '.') return false;
    return true;
}

function handleCharacterLevelDelete() {
    if (tokenStream.length === 0) return;
    let lastToken = tokenStream[tokenStream.length - 1];
    if (lastToken.type === 'NUM' && lastToken.val.length > 1) {
        lastToken.val = lastToken.val.slice(0, -1);
        lastToken.disp = lastToken.disp.slice(0, -1);
    } else {
        tokenStream.pop();
    }
}

function pressModifier(mod) {
    runNeonAnimationEffects(window.event);
    if (mod === 'SHIFT') {
        systemState.inputMode = (systemState.inputMode === MODES.SHIFT) ? MODES.NORMAL : MODES.SHIFT;
    } else if (mod === 'ALPHA') {
        systemState.inputMode = (systemState.inputMode === MODES.ALPHA) ? MODES.NORMAL : MODES.ALPHA;
    }
    updateIndicators();
}

function toggleAngleMode() {
    systemState.angleMode = (systemState.angleMode === ANGLE_MODES.DEG) ? ANGLE_MODES.RAD : ANGLE_MODES.DEG;
    domAngleInd.innerText = systemState.angleMode;
}

function updateIndicators() {
    domShiftInd.classList.toggle('active', systemState.inputMode === MODES.SHIFT);
    domAlphaInd.classList.toggle('active', systemState.inputMode === MODES.ALPHA);
}

function pressKey(keyId) {
    runNeonAnimationEffects(window.event);
    if (keyId === 'MODE') { toggleAngleMode(); return; }
    if (keyId === 'AC' || keyId === 'ON') { resetEngine(); return; }
    if (keyId === 'DEL') { handleCharacterLevelDelete(); renderDisplay(); return; }
    if (keyId === 'EXE') { evaluateEngine(); return; }

    let targetToken = null;
    if (systemState.inputMode === MODES.SHIFT) {
        targetToken = SHIFT_MAP[keyId] || KEY_MAP[keyId];
    } else if (systemState.inputMode === MODES.ALPHA) {
        targetToken = ALPHA_MAP[keyId] || KEY_MAP[keyId];
    } else {
        targetToken = KEY_MAP[keyId];
    }

    if (!targetToken) return;

    if (targetToken.type === 'MEM_ACTION' && targetToken.val === 'M+') {
        evaluateEngine(true); 
        systemState.inputMode = MODES.NORMAL;
        updateIndicators();
        return;
    }

    let prevToken = tokenStream[tokenStream.length - 1];
    if (!isValidSequence(prevToken, targetToken)) {
        domMain.innerText = "Syntax ERROR";
        tokenStream = [];
        return;
    }

    if (targetToken.type === 'NUM' && prevToken && prevToken.type === 'NUM') {
        if (targetToken.val === '.' && prevToken.val.includes('.')) return; 
        prevToken.val += targetToken.val;
        prevToken.disp += targetToken.disp;
    } else {
        tokenStream.push({ ...targetToken });
    }

    systemState.inputMode = MODES.NORMAL;
    updateIndicators();
    renderDisplay();
}

function resetEngine() {
    tokenStream = [];
    domHist.innerText = "";
    domMain.innerText = "0";
    systemState.inputMode = MODES.NORMAL;
    updateIndicators();
}

function renderDisplay() {
    if (tokenStream.length === 0) {
        domMain.innerText = "0";
        return;
    }
    domMain.innerText = tokenStream.map(t => t.disp).join("");
}

function transformUnaryMinus(arr) {
    let result = [];
    for (let i = 0; i < arr.length; i++) {
        let t = arr[i];
        if ((t.type === 'OP' || t.type === 'UNARY_MINUS_REQ') && t.val === '-' && 
           (i === 0 || arr[i - 1].type === 'OP' || arr[i - 1].type === 'LPAREN')) {
            result.push({ type: 'LITERAL', val: 0 });
            result.push({ type: 'OP', val: '-', disp: '-', prec: 1, assoc: 'L' });
        } else if (t.type === 'UNARY_MINUS_REQ') {
            result.push({ type: 'OP', val: '-', disp: '-', prec: 1, assoc: 'L' });
        } else {
            result.push(t);
        }
    }
    return result;
}

function evaluateEngine(isAccumulatingM = false) {
    if (tokenStream.length === 0) return;

    try {
        let combinedInfix = [];
        for (let i = 0; i < tokenStream.length; i++) {
            let t = tokenStream[i];
            if (t.type === 'NUM') {
                combinedInfix.push({ type: 'LITERAL', val: parseFloat(t.val) });
            } else if (t.type === 'VAR') {
                combinedInfix.push({ type: 'LITERAL', val: t.val === 'PI' ? Math.PI : systemState.memory[t.val] });
            } else {
                combinedInfix.push(t);
            }
        }

        combinedInfix = transformUnaryMinus(combinedInfix);

        let eParsedInfix = [];
        for (let i = 0; i < combinedInfix.length; i++) {
            if (combinedInfix[i].type === 'SCI_NOT') {
                let base = eParsedInfix.pop();
                let exponentToken = combinedInfix[i + 1];
                if (!base || base.type !== 'LITERAL') throw "Syntax ERROR";
                let sign = 1;
                let j = i + 1;
                if (exponentToken && exponentToken.type === 'OP' && exponentToken.val === '-') {
                    sign = -1;
                    j++;
                    exponentToken = combinedInfix[j];
                }
                if (!exponentToken || exponentToken.type !== 'LITERAL') throw "Syntax ERROR";
                let exponent = sign * exponentToken.val;
                eParsedInfix.push({ type: 'LITERAL', val: base.val * Math.pow(10, exponent) });
                i = j; 
            } else {
                eParsedInfix.push(combinedInfix[i]);
            }
        }

        let processedInfix = [];
        for (let i = 0; i < eParsedInfix.length; i++) {
            let current = eParsedInfix[i];
            processedInfix.push(current);
            if (i < eParsedInfix.length - 1) {
                let next = eParsedInfix[i + 1];
                let currentIsFactor = (current.type === 'LITERAL' || current.type === 'POST_OP' || current.type === 'RPAREN');
                let nextIsFactor = (next.type === 'LITERAL' || next.type === 'FUNC' || next.type === 'LPAREN');
                if (currentIsFactor && nextIsFactor) {
                    processedInfix.push({ type: 'OP', val: '*', disp: '×', prec: 2, assoc: 'L' });
                }
            }
        }

        let outputQueue = [];
        let operatorStack = [];

        for (let i = 0; i < processedInfix.length; i++) {
            let token = processedInfix[i];
            if (token.type === 'LITERAL') {
                outputQueue.push(token);
            } else if (token.type === 'FUNC' || token.type === 'LPAREN') {
                operatorStack.push(token);
            } else if (token.type === 'POST_OP') {
                outputQueue.push(token);
            } else if (token.type === 'OP') {
                while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'OP') {
                    let topOp = operatorStack[operatorStack.length - 1];
                    if ((token.assoc === 'L' && token.prec <= topOp.prec) || (token.assoc === 'R' && token.prec < topOp.prec)) {
                        outputQueue.push(operatorStack.pop());
                    } else {
                        break;
                    }
                }
                operatorStack.push(token);
            } else if (token.type === 'RPAREN') {
                while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type !== 'LPAREN') {
                    outputQueue.push(operatorStack.pop());
                }
                if (operatorStack.length === 0) throw "Syntax ERROR";
                operatorStack.pop();
                if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'FUNC') {
                    outputQueue.push(operatorStack.pop());
                }
            }
        }
        while (operatorStack.length > 0) {
            let top = operatorStack.pop();
            if (top.type === 'LPAREN' || top.type === 'RPAREN') throw "Syntax ERROR";
            outputQueue.push(top);
        }

        let evalStack = [];
        for (let i = 0; i < outputQueue.length; i++) {
            let token = outputQueue[i];
            if (token.type === 'LITERAL') {
                evalStack.push(token.val);
            } else if (token.type === 'POST_OP') {
                let arg = evalStack.pop();
                if (arg === undefined) throw "Syntax ERROR";
                if (token.val === 'sq') evalStack.push(Math.pow(arg, 2));
                if (token.val === 'deg') evalStack.push(arg); 
                if (token.val === 'fact') {
                    if (arg < 0 || arg % 1 !== 0) throw "Math ERROR";
                    let f = 1; for(let n = 2; n <= arg; n++) f *= n;
                    evalStack.push(f);
                }
                if (token.val === 'inv') {
                    if (arg === 0) throw "Math ERROR";
                    evalStack.push(1 / arg);
                }
            } else if (token.type === 'FUNC') {
                let arg = evalStack.pop();
                if (arg === undefined) throw "Syntax ERROR";
                let toRad = (deg) => deg * Math.PI / 180;
                let fromRad = (rad) => rad * 180 / Math.PI;
                let isDeg = systemState.angleMode === ANGLE_MODES.DEG;

                if (token.val === 'sin') evalStack.push(Math.sin(isDeg ? toRad(arg) : arg));
                else if (token.val === 'cos') evalStack.push(Math.cos(isDeg ? toRad(arg) : arg));
                else if (token.val === 'tan') {
                    if (isDeg && Math.abs(arg % 180) === 90) throw "Math ERROR";
                    evalStack.push(Math.tan(isDeg ? toRad(arg) : arg));
                }
                else if (token.val === 'asin') {
                    if (arg < -1 || arg > 1) throw "Math ERROR";
                    let res = Math.asin(arg);
                    evalStack.push(isDeg ? fromRad(res) : res);
                }
                else if (token.val === 'acos') {
                    if (arg < -1 || arg > 1) throw "Math ERROR";
                    let res = Math.acos(arg);
                    evalStack.push(isDeg ? fromRad(res) : res);
                }
                else if (token.val === 'atan') {
                    let res = Math.atan(arg);
                    evalStack.push(isDeg ? fromRad(res) : res);
                }
                else if (token.val === 'sqrt') {
                    if (arg < 0) throw "Math ERROR";
                    evalStack.push(Math.sqrt(arg));
                }
                else if (token.val === 'log10') {
                    if (arg <= 0) throw "Math ERROR";
                    evalStack.push(Math.log10(arg));
                }
                else if (token.val === 'ln') {
                    if (arg <= 0) throw "Math ERROR";
                    evalStack.push(Math.log(arg));
                }
                else if (token.val === 'frac' || token.val === 'logbase' || token.val === 'int' || token.val === 'hyp') {
                    evalStack.push(arg); 
                }
            } else if (token.type === 'OP') {
                let b = evalStack.pop();
                let a = evalStack.pop();
                if (a === undefined || b === undefined) throw "Syntax ERROR";
                if (token.val === '+') evalStack.push(a + b);
                else if (token.val === '-') evalStack.push(a - b);
                else if (token.val === '*') evalStack.push(a * b);
                else if (token.val === '/') {
                    if (b === 0) throw "Math ERROR";
                    evalStack.push(a / b);
                }
                else if (token.val === '^') evalStack.push(Math.pow(a, b));
            }
        }

        if (evalStack.length !== 1) throw "Syntax ERROR";
        let finalValue = evalStack[0];
        if (finalValue % 1 !== 0) finalValue = parseFloat(finalValue.toFixed(10));

        if (isAccumulatingM) {
            systemState.memory.M += finalValue;
            domMain.innerText = "0";
            domHist.innerText = "M+ Ans";
            tokenStream = [];
        } else {
            domHist.innerText = tokenStream.map(t => t.disp).join("") + " =";
            domMain.innerText = finalValue;
            systemState.memory.ANS = finalValue;
            tokenStream = [{ type: 'VAR', val: 'ANS', disp: 'Ans' }];
        }
    } catch (err) {
        domMain.innerText = (err === "Math ERROR" || err === "Syntax ERROR") ? err : "Syntax ERROR";
        tokenStream = [];
    }
}

window.addEventListener('DOMContentLoaded', () => {
    domAngleInd.innerText = systemState.angleMode;
});