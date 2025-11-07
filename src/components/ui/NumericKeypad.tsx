import { Delete, Check } from 'lucide-react';

interface NumericKeypadProps {
  onNumberClick: (num: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function NumericKeypad({ onNumberClick, onBackspace, onSubmit, disabled }: NumericKeypadProps) {
  const numbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  return (
    <div className="w-full max-w-[280px] mx-auto">
      {/* Číselné tlačítka 1-9 */}
      {numbers.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-3 gap-2 mb-2">
          {row.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onNumberClick(num)}
              disabled={disabled}
              className="h-12 flex items-center justify-center text-xl font-semibold text-slate-100 bg-slate-700/30 hover:bg-slate-600/40 active:bg-slate-600/60 border border-slate-600/30 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation select-none"
            >
              {num}
            </button>
          ))}
        </div>
      ))}

      {/* Spodní řádek: Backspace, 0, Submit */}
      <div className="grid grid-cols-3 gap-2">
        {/* Backspace */}
        <button
          type="button"
          onClick={onBackspace}
          disabled={disabled}
          className="h-12 flex items-center justify-center bg-orange-700/20 hover:bg-orange-600/30 active:bg-orange-600/50 border border-orange-600/30 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation select-none"
          aria-label="Smazat"
        >
          <Delete className="w-5 h-5 text-orange-400" />
        </button>

        {/* 0 */}
        <button
          type="button"
          onClick={() => onNumberClick('0')}
          disabled={disabled}
          className="h-12 flex items-center justify-center text-xl font-semibold text-slate-100 bg-slate-700/30 hover:bg-slate-600/40 active:bg-slate-600/60 border border-slate-600/30 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation select-none"
        >
          0
        </button>

        {/* Submit */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="h-12 flex items-center justify-center bg-emerald-700/20 hover:bg-emerald-600/30 active:bg-emerald-600/50 border border-emerald-600/30 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation select-none"
          aria-label="Potvrdit"
        >
          <Check className="w-5 h-5 text-emerald-400" />
        </button>
      </div>
    </div>
  );
}

