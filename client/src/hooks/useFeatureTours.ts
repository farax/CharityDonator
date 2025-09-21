import { Step } from 'react-joyride';

// Define your feature tours here
export const useFeatureTours = () => {
  const features = [
    {
      id: 'bank_transfer',
      version: '1.0.0', // Increment this to show tour again
      steps: [
        {
          target: '[data-testid="button-bank-transfer-toggle"]',
          content: (
            <div>
              <h3 className="text-lg font-bold mb-2">🏦 New Feature: Bank Transfer</h3>
              <p className="mb-2">
                You can now donate via direct bank transfer! This is perfect for:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Large donations (no card limits)</li>
                <li>Fee-free transfers using PayID</li>
                <li>Direct from your bank account</li>
              </ul>
              <p className="mt-2 text-sm text-gray-600">
                Click the banner below to see your bank details.
              </p>
            </div>
          ),
          placement: 'top',
          disableBeacon: true,
          styles: {
            tooltip: {
              width: 320,
            },
          },
        },
      ] as Step[],
    },
    // Add more features here in the future:
    // {
    //   id: 'another_feature',
    //   version: '1.0.0',
    //   steps: [...]
    // }
  ];

  return { features };
};