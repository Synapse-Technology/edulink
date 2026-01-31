import React from 'react';

interface TrustLadderVisualizationProps {
  currentTier: number;
}

const TrustLadderVisualization: React.FC<TrustLadderVisualizationProps> = ({ currentTier }) => {
  const tiers = [
    { level: 0, label: 'Unverified', description: 'Start verification' },
    { level: 1, label: 'Document Verified', description: 'Upload admission letter' },
    { level: 2, label: 'Institution Linked', description: 'Connect to institution' },
    { level: 3, label: 'Fully Verified', description: 'Complete internship' },
  ];

  return (
    <div className="relative">
      {/* Progress Line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200">
        <div 
          className="absolute top-0 left-0 w-0.5 bg-gradient-to-b from-teal-500 to-blue-500 transition-all duration-1000"
          style={{ height: `${(currentTier / 3) * 100}%` }}
        ></div>
      </div>

      {/* Tier Steps */}
      <div className="space-y-8">
        {tiers.map((tier) => (
          <div key={tier.level} className="relative flex items-start gap-4">
            {/* Tier Circle */}
            <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
              tier.level <= currentTier
                ? 'border-teal-500 bg-teal-500'
                : 'border-gray-300 bg-white'
            }`}>
              {tier.level <= currentTier ? (
                <i className="bi bi-check text-white text-sm"></i>
              ) : (
                <span className="text-xs font-medium text-gray-400">{tier.level}</span>
              )}
            </div>

            {/* Tier Content */}
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-sm font-semibold ${
                    tier.level <= currentTier ? 'text-teal-700' : 'text-gray-700'
                  }`}>
                    {tier.label}
                  </div>
                  <div className="text-xs text-gray-500">{tier.description}</div>
                </div>
                {tier.level === currentTier && (
                  <div className="rounded-full bg-teal-100 px-2 py-1 text-xs font-medium text-teal-700">
                    Current
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustLadderVisualization;