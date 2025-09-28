import { useEffect, useState } from 'react';
import { CheckCircle, LogIn, LogOut } from 'lucide-react';
import { useAppStore } from '../store';

export function ConfirmationScreen() {
  const { selectedEmployee } = useAppStore();
  const [currentTime] = useState(new Date());

  useEffect(() => {
    console.log('✅ Confirmation screen zobrazena');
  }, []);

  if (!selectedEmployee) {
    return null;
  }

  const lastAction = selectedEmployee.lastAction;
  const isStartAction = lastAction === 'start';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionInfo = () => {
    if (isStartAction) {
      return {
        title: 'Příchod zaznamenán',
        time: formatTime(currentTime),
        Icon: LogIn,
        gradientFrom: 'from-green-500',
        gradientTo: 'to-emerald-600'
      };
    } else {
      return {
        title: 'Odchod zaznamenán',
        time: formatTime(currentTime),
        Icon: LogOut,
        gradientFrom: 'from-orange-500',
        gradientTo: 'to-red-600'
      };
    }
  };

  const actionInfo = getActionInfo();

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-950">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
      
      {/* Glassmorphism card */}
      <div className="relative h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full animate-in slide-in-from-bottom-4 duration-500">
          <div className="glass-card p-12 text-center">
            {/* Success icon */}
            <div className="mb-8 relative inline-block">
              <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${actionInfo.gradientFrom} ${actionInfo.gradientTo} flex items-center justify-center`}>
                <actionInfo.Icon className="w-16 h-16 text-white" />
              </div>
              {/* Subtle pulse effect */}
              <div className="absolute inset-0 rounded-full bg-white opacity-10 animate-ping"></div>
            </div>

            {/* Employee name */}
            <h2 className="text-3xl font-bold text-white mb-4">
              {selectedEmployee.fullName}
            </h2>

            {/* Action title */}
            <h1 className="text-4xl font-bold text-white mb-3">
              {actionInfo.title}
            </h1>

            {/* Time */}
            <p className="text-2xl text-gray-300 mb-8">
              {actionInfo.time}
            </p>

            {/* Progress indicator */}
            <div className="mt-8">
              <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                <div className="h-full bg-white/30 rounded-full animate-[shimmer_2s_linear_infinite]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
