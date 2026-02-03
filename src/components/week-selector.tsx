'use client';

import type { WeekSummary } from '@/types/presentation-request';

interface WeekSelectorProps {
  weeks: WeekSummary[];
  selectedWeek: string;
  onWeekChange: (dateISO: string) => void;
  disabled?: boolean;
}

/**
 * Week Selector Component
 * 
 * Displays available weeks as tabs/pills and allows selection
 * Shows request counts and status breakdown for each week
 */
export function WeekSelector({
  weeks,
  selectedWeek,
  onWeekChange,
  disabled = false,
}: WeekSelectorProps) {
  if (weeks.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
        No weeks found in the spreadsheet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Select Week
      </label>
      
      {/* Tab-style week selector */}
      <div className="flex flex-wrap gap-2">
        {weeks.map((week) => {
          const isSelected = week.dateISO === selectedWeek;
          
          return (
            <button
              key={week.dateISO}
              type="button"
              onClick={() => onWeekChange(week.dateISO)}
              disabled={disabled}
              className={`
                relative px-4 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A32638] dark:focus:ring-offset-neutral-900
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isSelected 
                  ? 'bg-[#A32638] text-white shadow-md' 
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
                }
              `}
            >
              {/* Week date */}
              <span className="block font-semibold">Week of {week.date}</span>
              
              {/* Request count badge */}
              <span className={`
                text-xs mt-0.5 block
                ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}
              `}>
                {week.requestCount} request{week.requestCount !== 1 ? 's' : ''}
              </span>
              
              {/* Most recent indicator */}
              {weeks.indexOf(week) === 0 && (
                <span className={`
                  absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[10px] font-bold
                  rounded-full uppercase tracking-wide
                  ${isSelected 
                    ? 'bg-white text-[#A32638]' 
                    : 'bg-[#A32638] text-white'
                  }
                `}>
                  Latest
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Selected week details */}
      {selectedWeek && (
        <WeekDetails week={weeks.find(w => w.dateISO === selectedWeek)} />
      )}
    </div>
  );
}

/**
 * Displays detailed information about the selected week
 */
function WeekDetails({ week }: { week?: WeekSummary }) {
  if (!week) return null;
  
  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-neutral-800/50 rounded-lg border border-gray-200 dark:border-neutral-700">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        Week of {week.date} Summary
      </h4>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Requests */}
        <div className="text-center p-2 bg-white dark:bg-neutral-900 rounded border border-gray-200 dark:border-neutral-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {week.requestCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
        </div>
        
        {/* Approved */}
        <div className="text-center p-2 bg-white dark:bg-neutral-900 rounded border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {week.approvedCount}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">Approved</div>
        </div>
        
        {/* Denied */}
        <div className="text-center p-2 bg-white dark:bg-neutral-900 rounded border border-red-200 dark:border-red-800">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {week.deniedCount}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400">Denied</div>
        </div>
        
        {/* Pending (no status) */}
        <div className="text-center p-2 bg-white dark:bg-neutral-900 rounded border border-gray-200 dark:border-neutral-700">
          <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">
            {week.requestCount - week.approvedCount - week.deniedCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">No Status</div>
        </div>
      </div>
      
      {/* Request type breakdown */}
      <div className="mt-3 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{week.afrCount}</span> AFR
        </span>
        <span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{week.reallocationCount}</span> Reallocation
        </span>
      </div>
      
      {/* Warning for items without status */}
      {(week.requestCount - week.approvedCount - week.deniedCount) > 0 && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>
            Some requests don&apos;t have a status set. They will be excluded from the presentation.
          </span>
        </div>
      )}
    </div>
  );
}

export default WeekSelector;
