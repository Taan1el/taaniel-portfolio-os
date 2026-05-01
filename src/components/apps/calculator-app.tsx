import { useCallback, useEffect, useReducer } from "react";
import type { AppComponentProps } from "@/types/system";

// ── State ─────────────────────────────────────────────────────────
interface CalcState {
  display: string;       // current value shown
  stored: number | null; // left-hand operand
  op: string | null;     // pending operator
  fresh: boolean;        // next digit replaces display
  history: string;       // expression line above display
}

const initialState: CalcState = {
  display: "0",
  stored: null,
  op: null,
  fresh: true,
  history: "",
};

type CalcAction =
  | { type: "digit"; value: string }
  | { type: "dot" }
  | { type: "operator"; value: string }
  | { type: "equals" }
  | { type: "clear" }
  | { type: "sign" }
  | { type: "percent" }
  | { type: "backspace" };

function safeDisplay(n: number): string {
  if (!isFinite(n)) return "Error";
  const s = String(parseFloat(n.toPrecision(12)));
  return s.length > 14 ? n.toExponential(6) : s;
}

function applyOp(op: string, a: number, b: number): number {
  switch (op) {
    case "+": return a + b;
    case "−": return a - b;
    case "×": return a * b;
    case "÷": return b === 0 ? NaN : a / b;
  }
  return b;
}

function reducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case "digit": {
      if (state.fresh) {
        return { ...state, display: action.value, fresh: false };
      }
      if (state.display === "0" && action.value !== ".") {
        return { ...state, display: action.value };
      }
      if (state.display.length >= 14) return state;
      return { ...state, display: state.display + action.value };
    }
    case "dot": {
      if (state.fresh) return { ...state, display: "0.", fresh: false };
      if (state.display.includes(".")) return state;
      return { ...state, display: state.display + "." };
    }
    case "operator": {
      const cur = parseFloat(state.display);
      if (state.stored !== null && state.op && !state.fresh) {
        const result = applyOp(state.op, state.stored, cur);
        return {
          ...state,
          display: safeDisplay(result),
          stored: result,
          op: action.value,
          fresh: true,
          history: `${safeDisplay(result)} ${action.value}`,
        };
      }
      return {
        ...state,
        stored: cur,
        op: action.value,
        fresh: true,
        history: `${safeDisplay(cur)} ${action.value}`,
      };
    }
    case "equals": {
      if (state.stored === null || state.op === null) {
        return { ...state, history: state.display + " =", fresh: true };
      }
      const cur = parseFloat(state.display);
      const result = applyOp(state.op, state.stored, cur);
      return {
        ...state,
        display: safeDisplay(result),
        stored: null,
        op: null,
        fresh: true,
        history: `${state.history} ${safeDisplay(cur)} =`,
      };
    }
    case "clear":
      return initialState;
    case "sign": {
      const n = parseFloat(state.display);
      return { ...state, display: safeDisplay(-n) };
    }
    case "percent": {
      const n = parseFloat(state.display);
      return { ...state, display: safeDisplay(n / 100), fresh: true };
    }
    case "backspace": {
      if (state.fresh || state.display === "0") return state;
      const next = state.display.slice(0, -1);
      return { ...state, display: next.length === 0 || next === "-" ? "0" : next };
    }
  }
}

// ── Component ─────────────────────────────────────────────────────
export function CalculatorApp(_props: AppComponentProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if ("0123456789".includes(e.key)) { dispatch({ type: "digit", value: e.key }); return; }
    if (e.key === ".") { dispatch({ type: "dot" }); return; }
    if (e.key === "+") { dispatch({ type: "operator", value: "+" }); return; }
    if (e.key === "-") { dispatch({ type: "operator", value: "−" }); return; }
    if (e.key === "*") { dispatch({ type: "operator", value: "×" }); return; }
    if (e.key === "/") { e.preventDefault(); dispatch({ type: "operator", value: "÷" }); return; }
    if (e.key === "Enter" || e.key === "=") { dispatch({ type: "equals" }); return; }
    if (e.key === "Escape") { dispatch({ type: "clear" }); return; }
    if (e.key === "Backspace") { dispatch({ type: "backspace" }); return; }
    if (e.key === "%") { dispatch({ type: "percent" }); return; }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const isError = state.display === "Error";

  return (
    <div className="calculator">
      {/* Display */}
      <div className="calculator__display">
        <span className="calculator__history">{state.history || " "}</span>
        <span className="calculator__value" title={state.display}>
          {state.display}
        </span>
      </div>

      {/* Button grid */}
      <div className="calculator__grid">
        {/* Row 1 */}
        <button className="calculator__btn is-secondary" type="button" onClick={() => dispatch({ type: isError ? "clear" : "sign" })}>
          {isError ? "AC" : "+/−"}
        </button>
        <button className="calculator__btn is-secondary" type="button" onClick={() => dispatch({ type: "percent" })}>
          %
        </button>
        <button className="calculator__btn is-secondary" type="button" onClick={() => dispatch({ type: "backspace" })}>
          ⌫
        </button>
        <button className="calculator__btn is-operator" type="button" onClick={() => dispatch({ type: "operator", value: "÷" })}>
          ÷
        </button>

        {/* Row 2 */}
        <button className="calculator__btn" type="button" onClick={() => dispatch({ type: "digit", value: "7" })}>7</button>
        <button className="calculator__btn" type="button" onClick={() => dispatch({ type: "digit", value: "8" })}>8</button>
        <button className="calculator__btn" type="button" onClick={() => dispatch({ type: "digit", value: "9" })}>9</button>
        <button className="calculator__btn is-operator" type="button" onClick={() => dispatch({ type: "operator", value: "×" })}>
          ×
        </button>

        {/* Row 3 */}
        <button className="calculator__btn" type="button" onClick={() => dispatch({ type: "digit", value: "4" })}>4</button>
        <button className="calculator__btn" type="button" onClick={() => dispatch({ type: "digit", value: "5" })}>5</button>
        <button className="calculator__btn" type="button" onClick={() => dispatch({ type: "digit", value: "6" })}>6</button>
        <button className="calculator__btn is-operator" type="button" onClick={() => dispatch({ type: "operator", value: "−" })}>
          −
        </button>

        {/* Row 4 */}
        <button className="calculator__btn" type="button" onClick={() => dispatch({ type: "digit", value: "1" })}>1</button>
        <button className="calculator__btn" type="button" onClick={() => dispatch({ type: "digit", value: "2" })}>2</button>
        <button className="calculator__btn" type="button" onClick={() => dispatch({ type: "digit", value: "3" })}>3</button>
        <button className="calculator__btn is-operator" type="button" onClick={() => dispatch({ type: "operator", value: "+" })}>
          +
        </button>

        {/* Row 5 */}
        <button className="calculator__btn is-wide" type="button" onClick={() => dispatch({ type: "digit", value: "0" })}>0</button>
        <button className="calculator__btn" type="button" onClick={() => dispatch({ type: "dot" })}>.</button>
        <button className="calculator__btn is-equals" type="button" onClick={() => dispatch({ type: "equals" })}>
          =
        </button>
      </div>
    </div>
  );
}
